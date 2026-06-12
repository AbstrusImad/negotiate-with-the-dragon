import { AnimatePresence, motion } from 'framer-motion'
import type { LeaderboardRow } from '../lib/types'
import { formatGen, shortAddress } from '../lib/format'

interface HallOfLegendsProps {
  open: boolean
  rows: LeaderboardRow[]
  myAddress: string | null
  onClose: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

/** Modal hall of fame: top extractors ranked on-chain. */
export function HallOfLegends({ open, rows, myAddress, onClose }: HallOfLegendsProps) {
  const ranked = rows.filter((r) => BigInt(r.gold_won || '0') > 0n || r.burned)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="legends-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="legends-card"
            initial={{ scale: 0.86, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="legends-head">
              <h2>🏆 HALL OF LEGENDS</h2>
              <button className="tx-close" onClick={onClose} aria-label="Close">
                ×
              </button>
            </header>

            {ranked.length === 0 ? (
              <p className="legends-empty">
                No mortal has pried a single coin from the dragon… yet.
                <br />
                Be the first whose name is sung.
              </p>
            ) : (
              <ol className="legends-list">
                {ranked.map((r, i) => {
                  const mine = !!myAddress && r.address.toLowerCase() === myAddress.toLowerCase()
                  return (
                    <motion.li
                      key={r.address}
                      className={`legends-row ${mine ? 'mine' : ''} ${i === 0 ? 'first' : ''}`}
                      initial={{ opacity: 0, x: -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <span className="rank">{MEDALS[i] ?? `#${i + 1}`}</span>
                      <span className="who">
                        {mine ? 'You' : shortAddress(r.address)}
                        {r.burned && <i title="Incinerated">☠️</i>}
                        {r.streak > 1 && <em>⚡×{r.streak}</em>}
                      </span>
                      <span className="loot">{formatGen(r.gold_won)} GEN</span>
                    </motion.li>
                  )
                })}
              </ol>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
