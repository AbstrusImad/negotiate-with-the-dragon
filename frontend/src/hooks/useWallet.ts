import { useCallback, useEffect, useState } from 'react'
import { CHAIN } from '../lib/genlayer'

// Recordamos si el jugador se desconectó a propósito. MetaMask sigue
// considerando el sitio "autorizado" tras un disconnect nuestro, así que sin
// esta marca lo reconectaríamos solos y el botón "disconnect" no serviría.
const DISCONNECT_KEY = 'dragon:disconnected'

/**
 * Browser wallet connection (MetaMask) with automatic switch to the
 * configured GenLayer network (Bradbury Testnet by default).
 *
 * La sesión SOBREVIVE a un refresh: al montar consultamos `eth_accounts`
 * (silencioso, sin popup) y, si el sitio ya está autorizado, restauramos la
 * cuenta. Solo se queda desconectado si el jugador pulsó "disconnect".
 */
export function useWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // true hasta que terminamos de comprobar si ya había una sesión (evita el
  // parpadeo "Connect Wallet" → conectado al recargar)
  const [restoring, setRestoring] = useState(true)

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('You need MetaMask to enter the lair.')
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]
      await ensureGenLayerChain()
      window.localStorage.removeItem(DISCONNECT_KEY)
      setAddress(accounts[0] ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect the wallet.')
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    window.localStorage.setItem(DISCONNECT_KEY, '1')
    setAddress(null)
  }, [])

  // Rehidratar la sesión al cargar la página (sin popup)
  useEffect(() => {
    const eth = window.ethereum
    if (!eth) {
      setRestoring(false)
      return
    }
    // Si el jugador se desconectó a propósito, no reconectamos solos
    if (window.localStorage.getItem(DISCONNECT_KEY) === '1') {
      setRestoring(false)
      return
    }
    let cancelled = false
    eth
      .request({ method: 'eth_accounts' }) // silencioso: NO abre MetaMask
      .then((res) => {
        if (cancelled) return
        const accounts = (res as string[]) ?? []
        if (accounts[0]) setAddress(accounts[0])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRestoring(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Reaccionar a cambios de cuenta / red en MetaMask
  useEffect(() => {
    const eth = window.ethereum
    if (!eth?.on) return
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[]
      if (accounts[0]) {
        // Cambió de cuenta en MetaMask → reconexión válida, limpia el flag
        window.localStorage.removeItem(DISCONNECT_KEY)
        setAddress(accounts[0])
      } else {
        // MetaMask reportó 0 cuentas (se bloqueó / revocó el sitio)
        setAddress(null)
      }
    }
    // Recargar al cambiar de red es la práctica recomendada por MetaMask
    const onChain = () => window.location.reload()
    eth.on('accountsChanged', onAccounts)
    eth.on('chainChanged', onChain)
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts)
      eth.removeListener?.('chainChanged', onChain)
    }
  }, [])

  return { address, connecting, restoring, error, connect, disconnect }
}

/** Cambia (o registra) la red GenLayer en la wallet usando los datos del chain de genlayer-js. */
async function ensureGenLayerChain(): Promise<void> {
  const eth = window.ethereum
  if (!eth) return
  const chainIdHex = `0x${CHAIN.id.toString(16)}`
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    })
  } catch (err) {
    const code = (err as { code?: number })?.code
    // 4902: la red no existe en la wallet → la añadimos con los datos del SDK
    if (code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainIdHex,
            chainName: CHAIN.name,
            nativeCurrency: CHAIN.nativeCurrency,
            rpcUrls: CHAIN.rpcUrls?.default?.http ?? [],
            blockExplorerUrls: CHAIN.blockExplorers?.default?.url
              ? [CHAIN.blockExplorers.default.url]
              : [],
          },
        ],
      })
    } else {
      throw err
    }
  }
}
