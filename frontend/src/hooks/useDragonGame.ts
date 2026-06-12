import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createReadClient,
  createWalletClient,
  fetchDragonState,
  fetchHistory,
  fetchLeaderboard,
  fetchPlayerState,
  sendNegotiation,
  waitForTx,
  withRpcRetry,
  type TransactionHash,
} from '../lib/genlayer'
import { emitFx } from '../lib/fx'
import { sfx } from '../lib/audio'
import { formatGen } from '../lib/format'
import type {
  DragonState,
  HistoryEntry,
  LeaderboardRow,
  PlayerState,
  TxState,
} from '../lib/types'

// El RPC público de Bradbury limita `gen_call`; espaciamos el poll y leemos el
// leaderboard 1 de cada N ciclos para no saturarlo.
const POLL_INTERVAL_MS = 15000
const LEADERBOARD_EVERY = 3
const HISTORY_WINDOW = 50

/**
 * Game state synced with the blockchain + the full lifecycle of a negotiation:
 * signing → pending → accepted (optimistic consensus) → finalized.
 * Also drives the FX layer (gold bursts, screen shake, SFX) when new turns land.
 */
export function useDragonGame(address: string | null) {
  const [dragon, setDragon] = useState<DragonState | null>(null)
  const [player, setPlayer] = useState<PlayerState | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [tx, setTx] = useState<TxState>({ phase: 'idle' })
  const [loadError, setLoadError] = useState<string | null>(null)

  const readClient = useMemo(() => createReadClient(), [])
  const walletClient = useMemo(
    () => (address ? createWalletClient(address) : null),
    [address],
  )

  // Prevents a stale poll from clobbering fresher data
  const refreshSeq = useRef(0)
  // Highest chronicle index already shown — FX only fire for newer entries
  const lastFxIndex = useRef<number | null>(null)
  // While a negotiation tx is in flight we pause the background poll so the
  // tx-status polling has the RPC budget to itself (avoids gen_call rate-limit)
  const inFlight = useRef(false)
  // Cycle counter to throttle the (rarely-changing) leaderboard read
  const cycle = useRef(0)
  // Keep the last good leaderboard between throttled cycles
  const lastLeaderboard = useRef<LeaderboardRow[]>([])

  const fireTurnFx = useCallback(
    (entries: HistoryEntry[], me: string | null) => {
      if (lastFxIndex.current === null) {
        // First load: don't replay FX for ancient history
        lastFxIndex.current = entries.length ? entries[entries.length - 1].i : -1
        return
      }
      for (const e of entries) {
        if (e.i <= lastFxIndex.current) continue
        lastFxIndex.current = e.i
        const mine = !!me && e.player.toLowerCase() === me.toLowerCase()
        const paid = BigInt(e.payout || '0') > 0n

        if (paid) {
          emitFx({ type: 'goldBurst', big: e.crit === 'legendary' })
          if (mine) {
            sfx.play('gold')
            emitFx({
              type: 'float',
              text: `+${formatGen(e.payout)} GEN`,
              kind: e.crit === 'legendary' ? 'crit' : 'gold',
            })
            if (e.crit === 'legendary') {
              emitFx({ type: 'float', text: 'LEGENDARY!', kind: 'crit' })
            }
          }
        } else if (mine && e.score < 40) {
          emitFx({ type: 'shake', hard: e.crit === 'catastrophic' })
          emitFx({ type: 'fireBlast' })
          sfx.play(e.burned ? 'burn' : 'fail')
          emitFx({
            type: 'float',
            text: e.crit === 'catastrophic' ? 'CATASTROPHIC' : '-patience',
            kind: 'damage',
          })
        }
        if (e.victory) {
          emitFx({ type: 'victory' })
          if (mine) sfx.play('win')
        }
        if (mine && e.burned) emitFx({ type: 'shake', hard: true })
      }
    },
    [],
  )

  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current
    try {
      // Lecturas serializadas (no en paralelo) + backoff: el RPC limita gen_call,
      // mejor pocas llamadas espaciadas que una ráfaga simultánea.
      const d = await withRpcRetry(() => fetchDragonState(readClient))
      const start = Math.max(0, d.history_length - HISTORY_WINDOW)
      const h = await withRpcRetry(() => fetchHistory(readClient, start))
      const p = address
        ? await withRpcRetry(() => fetchPlayerState(readClient, address))
        : null

      // El leaderboard cambia poco: lo leemos 1 de cada LEADERBOARD_EVERY ciclos
      let lb = lastLeaderboard.current
      if (cycle.current % LEADERBOARD_EVERY === 0) {
        lb = await withRpcRetry(() => fetchLeaderboard(readClient)).catch(
          () => lastLeaderboard.current,
        )
        lastLeaderboard.current = lb
      }
      cycle.current++

      if (seq !== refreshSeq.current) return
      setDragon(d)
      setHistory(h)
      setPlayer(p)
      setLeaderboard(lb)
      setLoadError(null)
      fireTurnFx(h, address)
    } catch (e) {
      if (seq !== refreshSeq.current) return
      const msg = e instanceof Error ? e.message : 'Could not read the contract.'
      // No tapes los datos buenos por un rate-limit transitorio: salta el ciclo
      if (/rate limit|exceeds defined limit|429|too many requests/i.test(msg)) return
      setLoadError(msg)
    }
  }, [readClient, address, fireTurnFx])

  // On-chain state polling (pausado mientras hay una negociación en vuelo)
  useEffect(() => {
    void refresh()
    const timer = setInterval(() => {
      if (inFlight.current) return
      void refresh()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  /**
   * La espera ACCEPTED expiró pero la tx puede seguir procesándose. Reanudamos
   * el polling de estado con la ventana larga; si aterriza, refrescamos la UI.
   */
  const watchInBackground = useCallback(
    async (hash: TransactionHash) => {
      if (!walletClient) return
      try {
        await waitForTx(walletClient, hash, 'ACCEPTED', { interval: 6000, retries: 60 })
        setTx({ phase: 'accepted', hash })
        await refresh()
        setTimeout(() => setTx({ phase: 'idle' }), 5000)
      } catch {
        // Sigue sin decidirse tras mucho rato: deja que el poll normal la atrape
        setTx({ phase: 'idle' })
      }
    },
    [walletClient, refresh],
  )

  const negotiate = useCallback(
    async (message: string) => {
      if (!walletClient || !address) return
      sfx.play('send')
      setTx({ phase: 'signing' })
      inFlight.current = true // pausa el poll de fondo: el RPC es para la tx
      try {
        // 1) Sign in the wallet and broadcast to the GenLayer network
        const hash = await sendNegotiation(walletClient, message)
        setTx({ phase: 'pending', hash })

        // 2) Optimistic consensus: the leader runs the LLM, validators judge it.
        //    Puede tardar minutos; waitForTx ya usa una ventana larga (~4 min).
        try {
          await waitForTx(walletClient, hash, 'ACCEPTED')
        } catch (waitErr) {
          const m = waitErr instanceof Error ? waitErr.message : String(waitErr)
          // Si solo expiró la espera (no un error de ejecución), la tx puede
          // seguir viva: vigílala en 2º plano y refresca al aterrizar.
          if (/timed out|timeout/i.test(m)) {
            setTx({ phase: 'pending', hash })
            void watchInBackground(hash)
            return
          }
          throw waitErr
        }
        setTx({ phase: 'accepted', hash })
        await refresh()

        // 3) Finalization in the background (appeal window closes)
        void waitForTx(walletClient, hash, 'FINALIZED')
          .then(async () => {
            setTx({ phase: 'finalized', hash })
            await refresh()
            setTimeout(() => setTx({ phase: 'idle' }), 5000)
          })
          .catch(() => setTx({ phase: 'idle' }))
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e)
        // gl.vm.UserError messages surface inside the node error string
        setTx({ phase: 'error', error: humanizeTxError(raw) })
      } finally {
        inFlight.current = false
      }
    },
    [walletClient, address, refresh, watchInBackground],
  )

  const dismissTx = useCallback(() => setTx({ phase: 'idle' }), [])

  return {
    dragon,
    player,
    history,
    leaderboard,
    tx,
    loadError,
    negotiate,
    refresh,
    dismissTx,
  }
}

function humanizeTxError(raw: string): string {
  if (/user rejected|denied/i.test(raw)) return 'You sheathed your pen: transaction rejected in the wallet.'
  if (/pile of ashes|dead do not negotiate/i.test(raw)) return 'You are ashes. The dragon no longer hears you.'
  if (/already fallen|game is over/i.test(raw)) return 'The hoard has already fallen: the game is over.'
  if (/cave is empty/i.test(raw)) return 'There is no gold left in the cave.'
  if (/rate limit|exceeds defined limit|429|too many requests/i.test(raw))
    return 'The ley-lines are overloaded (RPC rate limit). Wait a moment and speak again.'
  if (/timed out|timeout/i.test(raw))
    return 'The dragon still deliberates… the network is slow. Your words were sent — watch the chronicle.'
  if (/insufficient funds|gas/i.test(raw))
    return 'Not enough GEN for gas. Top up your wallet on Bradbury.'
  return raw.length > 220 ? `${raw.slice(0, 220)}…` : raw
}
