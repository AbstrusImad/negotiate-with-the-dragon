import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { HistoryEntry, TxState } from '../lib/types'
import { formatGen, shortAddress } from '../lib/format'
import { useTypewriter } from '../hooks/useTypewriter'
import { sfx } from '../lib/audio'

const MAX_LEN = 500
const SUGGESTIONS = [
  '🪶 Flatter his erudition',
  '⚖️ Offer a trade',
  '🗡️ Threaten him',
]

interface ChronicleProps {
  history: HistoryEntry[]
  address: string | null
  dragonName: string
  tx: TxState
  disabledReason: string | null
  onSend: (message: string) => void
  onConnect: () => void
}

/** Right HUD panel: the on-chain chronicle + the "speak to the dragon" console. */
export function Chronicle({
  history,
  address,
  dragonName,
  tx,
  disabledReason,
  onSend,
  onConnect,
}: ChronicleProps) {
  const [draft, setDraft] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const me = address?.toLowerCase()

  // The on-chain history is GLOBAL (every player's turns). When a wallet is
  // connected we show only THAT wallet's own conversation, so switching wallets
  // gives a fresh thread instead of the previous player's chat.
  const shown = useMemo(
    () => (me ? history.filter((h) => h.player.toLowerCase() === me) : history),
    [history, me],
  )

  const initialMaxIndex = useRef<number | null>(null)
  useEffect(() => {
    if (initialMaxIndex.current === null && history.length > 0) {
      initialMaxIndex.current = history[history.length - 1].i
    }
  }, [history])

  const busy = tx.phase === 'signing' || tx.phase === 'pending'
  const canSend = !disabledReason && !busy && draft.trim().length > 0
  const needsWallet = disabledReason === 'connect-wallet'

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [shown.length, busy])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSend) return
    onSend(draft.trim())
    setDraft('')
  }

  return (
    <section className="chronicle">
      <header className="chron-head">
        <h2>⟢ THE CAVE CHRONICLE ⟣</h2>
        <span className="live-dot" title="Synced with GenLayer">
          <i /> on-chain
        </span>
      </header>

      <div className="chron-body" ref={bodyRef}>
        {shown.length === 0 && (
          <div className="chron-empty">
            <span className="chron-empty-rune">⚜</span>
            <p>
              “For nine hundred years no mortal has entered my lair. Speak… and may
              your words be worth more than your life.”
            </p>
            <span className="chron-empty-sig">— {dragonName}</span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {shown.map((entry) => (
            <Turn
              key={entry.i}
              entry={entry}
              mine={entry.player.toLowerCase() === me}
              animateReply={initialMaxIndex.current !== null && entry.i > initialMaxIndex.current}
            />
          ))}
        </AnimatePresence>

        {busy && (
          <motion.div
            className="bubble dragon thinking"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="dots">
              <i />
              <i />
              <i />
            </span>
            The dragon deliberates… validators judge your words
          </motion.div>
        )}
      </div>

      <form className="chron-input" onSubmit={submit}>
        {needsWallet ? (
          <motion.button
            type="button"
            className="forge-btn wide"
            onClick={onConnect}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onMouseEnter={() => sfx.play('hover')}
          >
            🔮 CONNECT WALLET TO FACE THE DRAGON
          </motion.button>
        ) : (
          <>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  disabled={busy || !!disabledReason}
                  onMouseEnter={() => sfx.play('hover')}
                  onClick={() => {
                    sfx.play('click')
                    setDraft(s.slice(s.indexOf(' ') + 1) + ': ')
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="input-row">
              <textarea
                value={draft}
                maxLength={MAX_LEN}
                rows={2}
                placeholder={disabledReason ?? 'Flatter, barter or threaten… (Enter to send)'}
                disabled={!!disabledReason || busy}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (canSend) submit(e)
                  }
                }}
              />
              <div className="input-side">
                <span className="char-count">
                  {draft.length}/{MAX_LEN}
                </span>
                <motion.button
                  type="submit"
                  className="forge-btn"
                  disabled={!canSend}
                  whileHover={canSend ? { scale: 1.05 } : undefined}
                  whileTap={canSend ? { scale: 0.94 } : undefined}
                  onMouseEnter={() => canSend && sfx.play('hover')}
                >
                  {busy ? '⏳' : '⚔️ NEGOTIATE'}
                </motion.button>
              </div>
            </div>
          </>
        )}
      </form>
    </section>
  )
}

function Turn({
  entry,
  mine,
  animateReply,
}: {
  entry: HistoryEntry
  mine: boolean
  animateReply: boolean
}) {
  const band: 'win' | 'meh' | 'fail' =
    entry.score >= 70 ? 'win' : entry.score >= 40 ? 'meh' : 'fail'
  const payout = useMemo(() => formatGen(entry.payout), [entry.payout])
  const reply = useTypewriter(entry.reply, animateReply)

  return (
    <motion.div
      className="turn"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className={`bubble player ${mine ? 'mine' : ''}`}>
        <span className="bubble-author">{mine ? 'You' : shortAddress(entry.player)}</span>
        {entry.message}
      </div>

      <div
        className={`bubble dragon band-${band} ${entry.crit !== 'none' ? `crit-${entry.crit}` : ''}`}
      >
        <span className="bubble-author">🐉 {entry.mood}</span>
        {reply}
        {reply.length === entry.reply.length && (
          <div className="turn-meta">
            <span className={`score-chip ${band}`}>⚖️ {entry.score}</span>
            {entry.crit === 'legendary' && <span className="crit-chip">✨ LEGENDARY</span>}
            {entry.crit === 'catastrophic' && <span className="burn-chip">💥 CATASTROPHIC</span>}
            {BigInt(entry.payout || '0') > 0n && (
              <span className="payout-chip">🪙 +{payout} GEN</span>
            )}
            {entry.streak > 1 && <span className="streak-chip">⚡×{entry.streak}</span>}
            {entry.burned && <span className="burn-chip">☠️ incinerated</span>}
            {entry.victory && <span className="victory-chip">🏆 the hoard falls!</span>}
          </div>
        )}
      </div>
    </motion.div>
  )
}
