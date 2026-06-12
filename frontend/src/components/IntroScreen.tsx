import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { sfx } from '../lib/audio'

interface IntroScreenProps {
  onEnter: () => void
}

const TITLE_TOP = 'NEGOTIATE WITH'
const TITLE_MAIN = 'THE DRAGON'

// Onboarding chapters after the title card (stage 0)
const TALE_LINES = [
  'For nine centuries, Vermithrax the Avaricious has slept upon a mountain of stolen gold.',
  'No blade has ever pierced his scales. No army has ever breached his lair.',
  'Yet the beast guards a weakness older than his hoard — he cannot resist a conversation.',
  'So the bold come not with swords, but with words… and almost all of them become ash.',
]

const RULES: { icon: () => JSX.Element; title: string; text: string }[] = [
  {
    icon: IconSpeak,
    title: 'Speak your mind',
    text: 'Address the dragon in plain language — flatter, barter, threaten or deceive. Anything goes.',
  },
  {
    icon: IconBrain,
    title: 'An AI judges you',
    text: 'A real LLM living inside the Intelligent Contract weighs every word and scores you 0–100.',
  },
  {
    icon: IconCoin,
    title: 'Win real GEN',
    text: 'Convince him and he parts with gold from the hoard — paid straight to your wallet, on-chain.',
  },
  {
    icon: IconScales,
    title: 'No tricks, no take-backs',
    text: 'Validators agree on the verdict through consensus. The chain remembers everything.',
  },
]

/**
 * Cinematic multi-stage onboarding:
 *   0 · TITLE   — opening dragon eye + golden title
 *   1 · THE TALE — the legend of Vermithrax
 *   2 · THE RULES — how to play
 *   3 · THE WARNING — the INCINERATED / one-life rule
 * Then it unlocks the audio engine and drops the player into the lair.
 */
export function IntroScreen({ onEnter }: IntroScreenProps) {
  const [stage, setStage] = useState(0)
  const [dir, setDir] = useState(1) // 1 forward, -1 back (drives slide direction)
  const LAST = 3

  // First user gesture unlocks WebAudio + ambient
  const arm = useCallback(() => {
    sfx.init()
    sfx.startAmbient()
  }, [])

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next > LAST) return
      setDir(next > stage ? 1 : -1)
      if (stage === 0) arm()
      sfx.play(next > stage ? 'click' : 'hover')
      setStage(next)
    },
    [stage, arm],
  )

  const enter = useCallback(() => {
    arm()
    sfx.play('click')
    onEnter()
  }, [arm, onEnter])

  // Keyboard navigation — arrows / Enter advance, Esc skips straight in
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (stage === LAST) enter()
        else go(stage + 1)
      } else if (e.key === 'ArrowLeft') {
        go(stage - 1)
      } else if (e.key === 'Escape') {
        enter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage, go, enter])

  return (
    <motion.div
      className="intro"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06, filter: 'brightness(2)' }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
    >
      <div className="intro-bg" />
      <div className="intro-grain" />

      {/* Skip — always available, respects UX */}
      {stage < LAST && (
        <button className="onb-skip" onClick={enter} onMouseEnter={() => sfx.play('hover')}>
          Skip intro ✕
        </button>
      )}

      <AnimatePresence mode="wait" custom={dir}>
        {stage === 0 ? (
          <TitleStage key="title" onContinue={() => go(1)} />
        ) : stage === 1 ? (
          <TaleStage key="tale" dir={dir} />
        ) : stage === 2 ? (
          <RulesStage key="rules" dir={dir} />
        ) : (
          <WarningStage key="warn" dir={dir} />
        )}
      </AnimatePresence>

      {/* Bottom navigation rail (chapters only, not the title) */}
      {stage > 0 && (
        <motion.div
          className="onb-nav"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            className="onb-back"
            onClick={() => go(stage - 1)}
            onMouseEnter={() => sfx.play('hover')}
          >
            ← Back
          </button>

          <div className="onb-dots" role="tablist" aria-label="Onboarding progress">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                className={`onb-dot ${i === stage ? 'on' : ''} ${i < stage ? 'done' : ''}`}
                aria-label={`Go to step ${i + 1}`}
                aria-selected={i === stage}
                role="tab"
                onClick={() => go(i)}
              />
            ))}
          </div>

          {stage < LAST ? (
            <button
              className="onb-next"
              onClick={() => go(stage + 1)}
              onMouseEnter={() => sfx.play('hover')}
            >
              Next →
            </button>
          ) : (
            <motion.button
              className="onb-next enter"
              onClick={enter}
              onMouseEnter={() => sfx.play('hover')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ boxShadow: ['0 0 0 rgba(255,90,60,0)', '0 0 36px rgba(255,90,60,0.6)', '0 0 0 rgba(255,90,60,0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Enter the Lair
            </motion.button>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Stage 0 — cinematic title with the opening dragon eye               */
/* ------------------------------------------------------------------ */

function TitleStage({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.div
      className="onb-stage onb-title-stage"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6 }}
    >
      <motion.svg
        viewBox="0 0 200 100"
        className="intro-eye"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 1.2 }}
      >
        <defs>
          <radialGradient id="introIris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe28a" />
            <stop offset="45%" stopColor="#ff9a2e" />
            <stop offset="100%" stopColor="#5a1606" />
          </radialGradient>
        </defs>
        <motion.g
          initial={{ scaleY: 0.04 }}
          animate={{ scaleY: [0.04, 0.04, 1, 1, 0.7, 1] }}
          transition={{ delay: 0.6, duration: 2.2, times: [0, 0.2, 0.5, 0.8, 0.9, 1] }}
          style={{ transformOrigin: '100px 50px' }}
        >
          <ellipse cx="100" cy="50" rx="78" ry="38" fill="url(#introIris)" />
          <motion.ellipse
            cx="100"
            cy="50"
            rx="9"
            ry="34"
            fill="#0b0a12"
            animate={{ rx: [9, 6, 9] }}
            transition={{ delay: 3, duration: 2.4, repeat: Infinity }}
          />
          <ellipse cx="76" cy="38" rx="14" ry="7" fill="rgba(255,255,255,0.25)" />
        </motion.g>
        <path d="M 12 50 Q 100 -12 188 50 Q 100 36 12 50 Z" fill="#0b0a12" />
        <path d="M 12 50 Q 100 112 188 50 Q 100 64 12 50 Z" fill="#0b0a12" />
      </motion.svg>

      <div className="intro-titles">
        <motion.span
          className="intro-kicker"
          initial={{ opacity: 0, letterSpacing: '1.2em' }}
          animate={{ opacity: 1, letterSpacing: '0.55em' }}
          transition={{ delay: 1, duration: 1.3, ease: 'easeOut' }}
        >
          {TITLE_TOP}
        </motion.span>
        <h1 className="intro-title" aria-label={TITLE_MAIN}>
          {TITLE_MAIN.split('').map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40, rotateX: 90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 1.3 + i * 0.06, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="intro-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.3, duration: 1 }}
        >
          An AI-judged on-chain game · GenLayer Intelligent Contracts · Bradbury Testnet
        </motion.p>
      </div>

      <motion.button
        className="intro-enter"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.7, duration: 0.8 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onMouseEnter={() => sfx.play('hover')}
        onClick={onContinue}
      >
        Begin the Tale
      </motion.button>

      <motion.p
        className="intro-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 3.3, duration: 1 }}
      >
        Headphones recommended · use ← → to navigate
      </motion.p>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Stage chrome — sliding framed panel shared by chapters 1-3          */
/* ------------------------------------------------------------------ */

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d * 60 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -60 }),
}

function Chapter({
  dir,
  chapter,
  rune,
  title,
  variant,
  children,
}: {
  dir: number
  chapter: string
  rune: React.ReactNode
  title: string
  variant?: 'warning'
  children: React.ReactNode
}) {
  return (
    <motion.div
      className={`onb-stage onb-panel ${variant === 'warning' ? 'onb-danger' : ''}`}
      custom={dir}
      variants={slide}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <motion.div
        className="onb-rune"
        initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.1 }}
      >
        {rune}
      </motion.div>
      <span className="onb-chapter">{chapter}</span>
      <h2 className="onb-heading">{title}</h2>
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Stage 1 — the tale                                                  */
/* ------------------------------------------------------------------ */

function TaleStage({ dir }: { dir: number }) {
  return (
    <Chapter dir={dir} chapter="Chapter I" rune={<IconDragonEye />} title="The Hoard of Vermithrax">
      <div className="onb-tale">
        {TALE_LINES.map((line, i) => (
          <motion.p
            key={i}
            className="onb-tale-line"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.5, duration: 0.7 }}
          >
            {line}
          </motion.p>
        ))}
      </div>
    </Chapter>
  )
}

/* ------------------------------------------------------------------ */
/* Stage 2 — the rules                                                 */
/* ------------------------------------------------------------------ */

function RulesStage({ dir }: { dir: number }) {
  return (
    <Chapter dir={dir} chapter="Chapter II" rune={<IconScroll />} title="The Rules of the Game">
      <ul className="onb-rules">
        {RULES.map((r, i) => (
          <motion.li
            key={r.title}
            className="onb-rule"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.16, duration: 0.5 }}
          >
            <span className="onb-rule-icon">{r.icon()}</span>
            <div>
              <strong>{r.title}</strong>
              <p>{r.text}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </Chapter>
  )
}

/* ------------------------------------------------------------------ */
/* Stage 3 — the warning (one life · INCINERATED)                      */
/* ------------------------------------------------------------------ */

function WarningStage({ dir }: { dir: number }) {
  return (
    <Chapter dir={dir} chapter="Chapter III" rune={<IconFlame />} title="One Life. Choose Your Words." variant="warning">
      <div className="onb-warn-body">
        <motion.p
          className="onb-warn-line"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Every weak, dull or insulting word drains the dragon's <em>patience</em>.
        </motion.p>

        <motion.div
          className="onb-seal"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 11, delay: 0.5 }}
        >
          <motion.span
            className="onb-seal-skull"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <IconSkull />
          </motion.span>
          <strong>WHEN HIS PATIENCE HITS ZERO</strong>
          <span className="onb-seal-big">YOU ARE INCINERATED</span>
          <em>— and incineration is forever —</em>
        </motion.div>

        <motion.p
          className="onb-warn-line strong"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          A burned negotiator is <b>locked out for good</b>. No reset, no second wallet of
          excuses — the dead do not negotiate.
        </motion.p>

        <motion.p
          className="onb-warn-foot"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          Weigh every sentence as if it were your last. It may well be.
        </motion.p>
      </div>
    </Chapter>
  )
}

/* ------------------------------------------------------------------ */
/* Inline SVG glyphs — no emojis, currentColor so CSS tints them       */
/* ------------------------------------------------------------------ */

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function IconDragonEye() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...S} aria-hidden>
      <path d="M2 12C5 7 9 5 12 5s7 2 10 7c-3 5-7 7-10 7S5 17 2 12Z" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8.5c1 1.2 1 5.8 0 7" fill="currentColor" stroke="none" />
      <path d="M3 6.5 5.5 8M21 6.5 18.5 8" />
    </svg>
  )
}

function IconScroll() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...S} aria-hidden>
      <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2V4Z" />
      <path d="M6 4a2 2 0 0 0-2 2v2h2" />
      <path d="M9 9h7M9 12.5h7M9 16h4" />
    </svg>
  )
}

function IconFlame() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...S} aria-hidden>
      <path d="M12 2c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.2.4-2 1-2.8C8 9 7 11 7 13a5 5 0 0 0 10 0c0-4-3-7-5-11Z" />
    </svg>
  )
}

function IconSkull() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...S} aria-hidden>
      <path d="M12 3a8 8 0 0 0-5 14v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2a8 8 0 0 0-5-14Z" />
      <circle cx="9" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M11 17h2" />
    </svg>
  )
}

function IconSpeak() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...S} aria-hidden>
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M8 10h8M8 13h5" />
    </svg>
  )
}

function IconBrain() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...S} aria-hidden>
      <rect x="7" y="7" width="10" height="10" rx="2.5" />
      <path d="M10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconCoin() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...S} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.5 9.5A3.2 3.2 0 0 0 12 8.5a3.5 3.5 0 0 0 0 7 3.2 3.2 0 0 0 2.5-1M11 12h3.5" />
    </svg>
  )
}

function IconScales() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...S} aria-hidden>
      <path d="M12 4v15M7 19h10" />
      <path d="M5 7h14M12 5l-6.5 1.4M12 5l6.5 1.4" />
      <path d="M3 13a2.5 2.5 0 0 0 5 0L5.5 7 3 13ZM16 13a2.5 2.5 0 0 0 5 0L18.5 7 16 13Z" />
    </svg>
  )
}
