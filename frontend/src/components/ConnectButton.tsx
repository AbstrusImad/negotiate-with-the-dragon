import { motion } from 'framer-motion'
import { shortAddress } from '../lib/format'
import { sfx } from '../lib/audio'

interface ConnectButtonProps {
  address: string | null
  connecting: boolean
  restoring?: boolean
  error: string | null
  onConnect: () => void
  onDisconnect: () => void
}

export function ConnectButton({
  address,
  connecting,
  restoring,
  error,
  onConnect,
  onDisconnect,
}: ConnectButtonProps) {
  if (address) {
    return (
      <button
        className="connect-btn connected"
        onClick={() => {
          sfx.play('click')
          onDisconnect()
        }}
        title="Disconnect"
      >
        <span className="wallet-dot" />
        {shortAddress(address)}
      </button>
    )
  }
  return (
    <div className="connect-wrap">
      <motion.button
        className="connect-btn"
        onClick={() => {
          sfx.init()
          sfx.play('click')
          onConnect()
        }}
        onMouseEnter={() => sfx.play('hover')}
        disabled={connecting || restoring}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        {restoring
          ? 'Reconnecting…'
          : connecting
            ? 'Summoning wallet…'
            : '🔮 Connect Wallet'}
      </motion.button>
      {error && <span className="connect-error">{error}</span>}
    </div>
  )
}
