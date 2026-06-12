import { motion } from 'framer-motion'
import type { DragonState, PlayerState } from '../lib/types'
import { formatGen } from '../lib/format'

interface StatGaugesProps {
  dragon: DragonState | null
  player: PlayerState | null
  connected: boolean
}

const SEGMENTS = 10

/** Left HUD column: mood medallion, wrath ring, segmented patience, streak, loot. */
export function StatGauges({ dragon, player, connected }: StatGaugesProps) {
  const anger = dragon?.anger ?? 0
  const patience = player?.patience ?? 100
  const streak = player?.streak ?? 0
  const filled = Math.ceil(patience / SEGMENTS)

  // wrath ring geometry
  const R = 30
  const C = 2 * Math.PI * R
  const wrathOffset = C * (1 - anger / 100)
  const wrathColor = anger >= 70 ? '#ff4a2e' : anger >= 40 ? '#ff9a3c' : '#f5c542'

  if (!dragon) {
    return (
      <div className="gauges">
        <div className="gauge-card skeleton skel-card" />
        <div className="gauge-card skeleton skel-card" />
        <div className="gauge-card skeleton skel-card" />
      </div>
    )
  }

  return (
    <div className="gauges">
      {/* Dragon identity + mood */}
      <motion.div className="gauge-card" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
        <span className="gauge-title">{dragon.name}</span>
        <div className="mood-line">
          <motion.span
            key={dragon.mood}
            className="mood-word"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
          >
            {dragon.mood}
          </motion.span>
        </div>
      </motion.div>

      {/* Wrath ring */}
      <motion.div
        className="gauge-card gauge-row"
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.06 }}
      >
        <svg viewBox="0 0 76 76" className="wrath-ring">
          <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
          <motion.circle
            cx="38"
            cy="38"
            r={R}
            fill="none"
            stroke={wrathColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: wrathOffset }}
            transition={{ type: 'spring', stiffness: 60, damping: 16 }}
            transform="rotate(-90 38 38)"
            style={{ filter: `drop-shadow(0 0 6px ${wrathColor})` }}
          />
          <text x="38" y="35" textAnchor="middle" className="ring-icon">
            🔥
          </text>
          <text x="38" y="52" textAnchor="middle" className="ring-value">
            {anger}
          </text>
        </svg>
        <div className="gauge-info">
          <span className="gauge-label">WRATH</span>
          <span className="gauge-sub">{anger >= 70 ? 'seething' : anger >= 40 ? 'smoldering' : 'dormant'}</span>
        </div>
      </motion.div>

      {/* Patience — segmented health bar */}
      <motion.div
        className="gauge-card"
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.12 }}
      >
        <div className="gauge-head">
          <span className="gauge-label">🛡️ PATIENCE</span>
          <span className={`gauge-num ${patience <= 30 ? 'danger-pulse' : ''}`}>
            {connected ? patience : '—'}
          </span>
        </div>
        <div className="segments">
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const on = connected && i < filled
            const hue = 8 + (i / (SEGMENTS - 1)) * 120 // red → green
            return (
              <motion.span
                key={i}
                className="segment"
                animate={{
                  background: on ? `hsl(${hue}, 80%, 52%)` : 'rgba(255,255,255,0.06)',
                  boxShadow: on ? `0 0 8px hsla(${hue}, 90%, 55%, 0.6)` : 'none',
                }}
                transition={{ delay: i * 0.03 }}
              />
            )
          })}
        </div>
        {!connected && <span className="gauge-sub">connect your wallet to face the dragon</span>}
        {player?.burned && <span className="gauge-sub burned">☠️ incinerated — game over</span>}
      </motion.div>

      {/* Streak + loot */}
      <motion.div
        className="gauge-card gauge-split"
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.18 }}
      >
        <div>
          <span className="gauge-label">⚡ STREAK</span>
          <motion.span key={streak} className="gauge-big" initial={{ scale: 1.6 }} animate={{ scale: 1 }}>
            {connected && streak > 0 ? `×${streak}` : '—'}
          </motion.span>
          {connected && streak > 0 && (
            <span className="gauge-sub gold">+{Math.min(10, streak * 2)}% payout</span>
          )}
        </div>
        <div>
          <span className="gauge-label">🪙 YOUR LOOT</span>
          <span className="gauge-big gold">{connected ? formatGen(player?.gold_won) : '—'}</span>
          <span className="gauge-sub">GEN extracted</span>
        </div>
      </motion.div>
    </div>
  )
}
