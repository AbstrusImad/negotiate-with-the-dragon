import { AnimatePresence, motion } from 'framer-motion'
import type { DragonState } from '../lib/types'
import { formatGen } from '../lib/format'
import { ConnectButton } from './ConnectButton'
import { sfx } from '../lib/audio'

interface HudTopProps {
  dragon: DragonState | null
  network: string
  muted: boolean
  onToggleMute: () => void
  onOpenLegends: () => void
  wallet: {
    address: string | null
    connecting: boolean
    restoring?: boolean
    error: string | null
    connect: () => void
    disconnect: () => void
  }
}

/** Always-visible top HUD: brand, the hoard jackpot, network, sound, wallet. */
export function HudTop({ dragon, network, muted, onToggleMute, onOpenLegends, wallet }: HudTopProps) {
  const treasury = formatGen(dragon?.treasury)

  return (
    <header className="hud-top">
      <div className="hud-brand">
        <span className="hud-sigil">🐉</span>
        <div>
          <strong>NEGOTIATE WITH THE DRAGON</strong>
          <small>GenLayer Intelligent Contracts</small>
        </div>
      </div>

      {/* The prize pool, casino-jackpot style */}
      <div className="jackpot" title="GEN held by the contract right now">
        <span className="jackpot-label">⟡ DRAGON'S HOARD ⟡</span>
        <span className="jackpot-value">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={treasury}
              initial={{ y: -18, opacity: 0, filter: 'blur(4px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: 18, opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.45 }}
              className="jackpot-number"
            >
              {dragon ? treasury : '·····'}
            </motion.span>
          </AnimatePresence>
          <span className="jackpot-unit">GEN</span>
        </span>
      </div>

      <div className="hud-actions">
        <span className="net-pill">
          <i /> {network}
        </span>
        <button
          className="icon-btn"
          title="Hall of Legends"
          onClick={() => {
            sfx.play('click')
            onOpenLegends()
          }}
        >
          🏆
        </button>
        <button className="icon-btn" title={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute}>
          {muted ? '🔇' : '🔊'}
        </button>
        <ConnectButton
          address={wallet.address}
          connecting={wallet.connecting}
          restoring={wallet.restoring}
          error={wallet.error}
          onConnect={wallet.connect}
          onDisconnect={wallet.disconnect}
        />
      </div>
    </header>
  )
}
