/**
 * Capa de integración con GenLayer vía genlayer-js.
 *
 * - Cliente de SOLO LECTURA (sin cuenta): llamadas `view` gratuitas vía RPC.
 * - Cliente de ESCRITURA: se crea con la dirección de la wallet conectada;
 *   genlayer-js delega la firma en el proveedor inyectado (MetaMask).
 */
import { createClient } from 'genlayer-js'
import { localnet, studionet, testnetBradbury } from 'genlayer-js/chains'
import { TransactionStatus, type TransactionHash } from 'genlayer-js/types'
import type { DragonState, HistoryEntry, LeaderboardRow, PlayerState } from './types'

export type { TransactionHash }

const CHAINS = {
  localnet,
  studionet,
  bradbury: testnetBradbury,
} as const

export type NetworkName = keyof typeof CHAINS

const network = (import.meta.env.VITE_GENLAYER_NETWORK ?? 'bradbury') as NetworkName
export const NETWORK_NAME: string = network
export const CHAIN = CHAINS[network] ?? testnetBradbury
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ??
  '') as `0x${string}`

export type GenLayerClient = ReturnType<typeof createClient>

export function createReadClient(): GenLayerClient {
  return createClient({ chain: CHAIN })
}

export function createWalletClient(address: string): GenLayerClient {
  return createClient({
    chain: CHAIN,
    account: address as `0x${string}`,
  })
}

/**
 * Los diccionarios de calldata de GenLayer pueden decodificarse como `Map` y
 * los enteros como `bigint`; esto los normaliza a objetos/numbers planos.
 */
function toPlain(value: unknown): unknown {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of value.entries()) obj[String(k)] = toPlain(v)
    return obj
  }
  if (Array.isArray(value)) return value.map(toPlain)
  if (typeof value === 'bigint') {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString()
  }
  return value
}

// ----------------------------------------------------------------
// Lecturas (view): gratuitas, sin firma
// ----------------------------------------------------------------

export async function fetchDragonState(client: GenLayerClient): Promise<DragonState> {
  const raw = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_dragon_state',
    args: [],
  })
  return toPlain(raw) as DragonState
}

export async function fetchPlayerState(
  client: GenLayerClient,
  player: string,
): Promise<PlayerState> {
  const raw = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_player_state',
    args: [player],
  })
  return toPlain(raw) as PlayerState
}

export async function fetchHistory(
  client: GenLayerClient,
  start: number,
): Promise<HistoryEntry[]> {
  const raw = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_history',
    args: [start],
  })
  const list = toPlain(raw) as string[]
  return list.map((s) => JSON.parse(s) as HistoryEntry)
}

export async function fetchLeaderboard(client: GenLayerClient): Promise<LeaderboardRow[]> {
  const raw = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_leaderboard',
    args: [],
  })
  return toPlain(raw) as LeaderboardRow[]
}

// ----------------------------------------------------------------
// Escrituras (write): firmadas por la wallet, consensuadas por la red
// ----------------------------------------------------------------

export async function sendNegotiation(
  client: GenLayerClient,
  message: string,
): Promise<TransactionHash> {
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'negotiate',
    args: [message],
    value: 0n,
  })
  return hash as TransactionHash
}

/** Deposita GEN en el tesoro del dragón (método payable `fund_treasury`). */
export async function sendFunding(
  client: GenLayerClient,
  amountWei: bigint,
): Promise<TransactionHash> {
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'fund_treasury',
    args: [],
    value: amountWei,
  })
  return hash as TransactionHash
}

/**
 * Espera el recibo de una transacción en el estado pedido.
 * ACCEPTED  → consenso optimista alcanzado (la UI ya puede refrescar).
 * FINALIZED → ventana de apelación cerrada, resultado irreversible.
 *
 * Los defaults de genlayer-js (3s × 10 = 30s) son demasiado cortos: una
 * negociación corre un LLM on-chain + consenso de validadores, que puede tardar
 * varios minutos. Ampliamos la ventana de polling con un intervalo más espaciado
 * (también alivia el rate-limit del RPC).
 */
export async function waitForTx(
  client: GenLayerClient,
  hash: TransactionHash,
  status: 'ACCEPTED' | 'FINALIZED',
  opts: { interval?: number; retries?: number } = {},
): Promise<unknown> {
  const accepted = status === 'ACCEPTED'
  return client.waitForTransactionReceipt({
    hash,
    status: accepted ? TransactionStatus.ACCEPTED : TransactionStatus.FINALIZED,
    // ACCEPTED: hasta ~4 min (LLM + consenso). FINALIZED: hasta ~10 min en 2º plano.
    interval: opts.interval ?? (accepted ? 5000 : 8000),
    retries: opts.retries ?? (accepted ? 48 : 75),
  })
}

/**
 * Reintenta una lectura cuando el RPC responde con rate-limit (429 /
 * "rate limit exceeded"). Backoff exponencial corto; reescala si Bradbury
 * está saturado en vez de romper la UI.
 */
export async function withRpcRetry<T>(
  fn: () => Promise<T>,
  attempts = 4,
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const msg = e instanceof Error ? e.message : String(e)
      const rateLimited = /rate limit|429|exceeds defined limit|too many requests/i.test(
        msg,
      )
      if (!rateLimited || i === attempts - 1) throw e
      await new Promise((r) => setTimeout(r, 1200 * 2 ** i)) // 1.2s, 2.4s, 4.8s…
    }
  }
  throw lastErr
}
