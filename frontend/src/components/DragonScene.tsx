import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { onFx } from '../lib/fx'

interface DragonSceneProps {
  /** 0..100 — drives eye color, chest furnace, smoke and fire. */
  anger: number
  /** true while the network processes a negotiation. */
  thinking: boolean
  /** true if the connected player has been incinerated. */
  burned: boolean
}

type Reaction = 'idle' | 'pleased' | 'roar'

/**
 * Cinematic vector dragon hunched over its hoard — angular paper-cut style
 * with rim lighting from the gold below. Breathes, blinks, tracks the cursor,
 * its chest furnace glows through the belly plates, and it rears or roars
 * with fire depending on the verdict (driven by the FX bus).
 */
export function DragonScene({ anger, thinking, burned }: DragonSceneProps) {
  const eyeHue = Math.max(0, 45 - anger * 0.45)
  const eyeColor = `hsl(${eyeHue}, 100%, 60%)`
  const furious = anger >= 70
  const [reaction, setReaction] = useState<Reaction>('idle')

  // Pupil cursor-tracking
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const pupilX = useSpring(rawX, { stiffness: 110, damping: 15 })
  const pupilY = useSpring(rawY, { stiffness: 110, damping: 15 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 8)
      rawY.set((e.clientY / window.innerHeight - 0.5) * 5)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [rawX, rawY])

  // Verdict reactions
  const timer = useRef<number | undefined>(undefined)
  useEffect(
    () =>
      onFx((e) => {
        if (e.type === 'goldBurst') {
          setReaction('pleased')
        } else if (e.type === 'fireBlast') {
          setReaction('roar')
        } else {
          return
        }
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setReaction('idle'), 1800)
      }),
    [],
  )

  const roaring = reaction === 'roar' || burned

  return (
    <motion.div
      className="dragon-stage"
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 1000 660" className="dragon-svg" role="img" aria-label="The dragon on its hoard">
        <defs>
          <linearGradient id="dBody" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#2c1d56" />
            <stop offset="55%" stopColor="#180f33" />
            <stop offset="100%" stopColor="#0b0719" />
          </linearGradient>
          <linearGradient id="dBodyLit" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#4a2c4e" />
            <stop offset="40%" stopColor="#241543" />
            <stop offset="100%" stopColor="#140c2b" />
          </linearGradient>
          <linearGradient id="dWing" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d1240" />
            <stop offset="100%" stopColor="#0d0820" />
          </linearGradient>
          <linearGradient id="dWingNear" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor="#2a1a52" />
            <stop offset="70%" stopColor="#150d2e" />
            <stop offset="100%" stopColor="#0d0820" />
          </linearGradient>
          <linearGradient id="dBelly" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#473463" />
            <stop offset="100%" stopColor="#241845" />
          </linearGradient>
          <radialGradient id="dFurnace" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffb347" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#ff7b2e" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ff5a1e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dEyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={eyeColor} stopOpacity="0.9" />
            <stop offset="55%" stopColor={eyeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={eyeColor} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dFire" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#fff3c4" />
            <stop offset="25%" stopColor="#ffd34d" />
            <stop offset="60%" stopColor="#ff7b2e" />
            <stop offset="100%" stopColor="#e6321e" stopOpacity="0.1" />
          </linearGradient>
          <radialGradient id="dGold" cx="50%" cy="22%" r="85%">
            <stop offset="0%" stopColor="#ffe9a0" />
            <stop offset="45%" stopColor="#eebc3f" />
            <stop offset="80%" stopColor="#a87618" />
            <stop offset="100%" stopColor="#6e4a0c" />
          </radialGradient>
          <radialGradient id="dGoldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffcf5e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffcf5e" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dRim" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ff9a3c" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ff9a3c" stopOpacity="0" />
          </linearGradient>
          <filter id="dSoft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="dSofter" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
        </defs>

        {/* ======= ambient gold light pool under everything ======= */}
        <ellipse cx="500" cy="590" rx="420" ry="120" fill="url(#dGoldGlow)" filter="url(#dSofter)" />

        {/* ======= FAR WING (behind neck, slow sweep) ======= */}
        <motion.path
          d="M 580 320 L 430 70 L 480 190 L 320 40 L 430 220 L 230 120 L 420 270 L 300 250 L 470 320 Z"
          fill="url(#dWing)"
          opacity="0.9"
          animate={{ rotate: [0, -2, 0, 1, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '540px 320px' }}
        />

        {/* ======= NEAR WING (raised, rim-lit) ======= */}
        <motion.g
          animate={{ rotate: [0, 2.4, 0, -1.2, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '700px 340px' }}
        >
          <path
            d="M 690 350 L 800 50 L 786 200 L 950 80 L 845 250 L 990 230 L 830 330 L 920 360 L 740 380 Z"
            fill="url(#dWingNear)"
          />
          {/* membrane bones */}
          <path d="M 700 345 L 798 60 M 705 350 L 944 86 M 712 356 L 982 232" stroke="#3b2b66" strokeWidth="5" fill="none" opacity="0.8" />
          {/* rim light on leading edge */}
          <path d="M 690 350 L 800 50" stroke="url(#dRim)" strokeWidth="3" fill="none" opacity="0.5" />
        </motion.g>

        {/* ======= TAIL sweeping in front-left, sways ======= */}
        <motion.g
          animate={{ rotate: [0, 1.4, 0, -1, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '760px 560px' }}
        >
          <path
            d="M 860 540 C 800 630 620 658 430 645 C 300 636 220 608 190 572
               C 260 606 380 622 490 620 C 650 617 770 590 825 520 Z"
            fill="url(#dBody)"
          />
          {/* spade tip */}
          <path d="M 205 580 L 150 545 L 185 600 L 130 595 L 195 625 Z" fill="#22154a" />
          {/* tail rim light from gold */}
          <path d="M 200 575 C 300 618 480 632 640 615" stroke="url(#dRim)" strokeWidth="3" fill="none" opacity="0.35" />
        </motion.g>

        {/* ======= BODY MASS ======= */}
        <path
          d="M 320 615 C 340 470 430 370 575 332 C 715 296 830 356 880 470
             C 912 545 908 600 888 622 L 320 622 Z"
          fill="url(#dBody)"
        />
        {/* back spine spikes */}
        <path d="M 575 332 L 560 300 L 602 318 Z M 648 322 L 645 288 L 683 314 Z M 722 336 L 730 302 L 756 336 Z M 793 372 L 812 344 L 826 384 Z" fill="#32215c" />
        {/* body rim light along bottom */}
        <path d="M 350 600 C 420 612 700 618 870 590" stroke="url(#dRim)" strokeWidth="4" fill="none" opacity="0.4" filter="url(#dSoft)" />

        {/* ======= CHEST FURNACE (glows through belly plates) ======= */}
        <motion.ellipse
          cx="480"
          cy="470"
          rx="95"
          ry="120"
          fill="url(#dFurnace)"
          filter="url(#dSoft)"
          animate={{
            opacity: roaring ? [0.9, 1, 0.95, 1] : thinking ? [0.55, 0.95, 0.55] : [0.35, 0.6, 0.35],
            scale: roaring ? [1, 1.15, 1.05] : [1, 1.06, 1],
          }}
          transition={{ duration: roaring ? 0.5 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* belly plates over the furnace */}
        <g fill="url(#dBelly)" stroke="#0d0820" strokeWidth="3">
          <path d="M 408 392 Q 480 372 552 396 L 540 424 Q 478 404 420 422 Z" />
          <path d="M 400 432 Q 480 410 560 438 L 548 468 Q 482 446 412 466 Z" />
          <path d="M 396 476 Q 482 452 566 484 L 554 514 Q 486 492 408 510 Z" />
          <path d="M 398 520 Q 486 498 570 530 L 560 560 Q 490 538 412 554 Z" />
          <path d="M 404 564 Q 490 544 572 574 L 566 600 Q 494 582 420 594 Z" />
        </g>

        {/* ======= NECK (S-curve to the head) ======= */}
        <path
          d="M 330 168 C 420 196 510 262 600 338 C 640 372 660 398 668 428
             L 560 470 C 530 400 470 330 410 282 C 370 250 340 222 322 196 Z"
          fill="url(#dBodyLit)"
        />
        {/* neck spikes */}
        <path d="M 372 218 L 350 192 L 388 200 Z M 428 268 L 410 240 L 446 252 Z M 492 326 L 478 296 L 514 312 Z M 556 392 L 546 360 L 580 380 Z" fill="#32215c" />
        {/* throat fire channel (lights up when thinking/roaring) */}
        <motion.path
          d="M 330 220 C 400 260 470 320 540 400"
          stroke="url(#dFire)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          filter="url(#dSoft)"
          animate={{ opacity: roaring ? [0.5, 0.95, 0.7, 1] : thinking ? [0.1, 0.5, 0.1] : 0 }}
          transition={{ duration: roaring ? 0.45 : 1.6, repeat: Infinity }}
        />

        {/* ======= FRONT LEG + CLAWS gripping the gold ======= */}
        <path d="M 596 470 C 580 510 576 545 586 580 L 660 588 C 644 552 648 514 668 478 Z" fill="url(#dBody)" />
        <g fill="#1a1138">
          <path d="M 586 578 L 560 606 L 598 596 Z" />
          <path d="M 612 584 L 596 614 L 632 600 Z" />
          <path d="M 640 586 L 632 618 L 664 602 Z" />
        </g>
        <path d="M 560 606 L 598 596 M 596 614 L 632 600" stroke="url(#dRim)" strokeWidth="2" opacity="0.5" />

        {/* ======= HEAD GROUP (bobs; rears when pleased, dips when roaring) ======= */}
        <motion.g
          animate={
            reaction === 'pleased'
              ? { y: -18, rotate: -3 }
              : roaring
                ? { y: 6, rotate: 2.5 }
                : { y: [0, -5, 0], rotate: 0 }
          }
          transition={
            reaction === 'idle'
              ? { duration: 5.2, repeat: Infinity, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 120, damping: 14 }
          }
          style={{ transformOrigin: '330px 220px' }}
        >
          {/* horns (back-swept) */}
          <path d="M 332 150 C 390 96 470 72 555 80 C 480 108 426 138 396 180 Z" fill="#3b2b6b" />
          <path d="M 296 146 C 330 102 384 78 440 76 C 392 104 358 132 340 162 Z" fill="#2c1f54" />
          {/* ear frill */}
          <path d="M 352 172 L 408 150 L 380 192 L 426 184 L 386 214 Z" fill="#241845" />

          {/* upper skull + snout */}
          <path
            d="M 148 208 L 238 172 L 318 146 L 382 160 L 400 204 L 356 232 L 262 234 L 196 226 Z"
            fill="url(#dBodyLit)"
          />
          {/* brow ridge */}
          <path d="M 258 178 L 330 156 L 344 178 L 286 192 Z" fill="#160e30" />
          {/* snout highlight (rim from gold below) */}
          <path d="M 152 212 L 240 230 L 196 224 Z" fill="#ff9a3c" opacity="0.25" />

          {/* lower jaw — drops open when roaring, chews when thinking */}
          <motion.g
            animate={roaring ? { rotate: 9 } : thinking ? { rotate: [0, 4, 0] } : { rotate: 0 }}
            transition={roaring ? { type: 'spring', stiffness: 200, damping: 12 } : { duration: 0.8, repeat: thinking ? Infinity : 0 }}
            style={{ transformOrigin: '352px 238px' }}
          >
            <path d="M 158 224 L 252 252 L 342 252 L 372 240 L 352 274 L 244 278 L 180 250 Z" fill="url(#dBelly)" />
            {/* lower teeth */}
            <path d="M 196 240 L 206 226 L 218 242 Z M 240 248 L 250 232 L 262 250 Z M 288 251 L 298 236 L 310 252 Z" fill="#e6dcc0" />
          </motion.g>
          {/* upper teeth */}
          <path d="M 178 222 L 188 238 L 200 224 Z M 224 230 L 234 246 L 246 231 Z M 270 233 L 280 249 L 292 234 Z" fill="#e6dcc0" />

          {/* eye */}
          <circle cx="306" cy="194" r="32" fill="url(#dEyeGlow)" filter="url(#dSoft)" />
          <path d="M 278 192 L 308 180 L 332 194 L 304 204 Z" fill={eyeColor} />
          <motion.g style={{ x: pupilX, y: pupilY }}>
            <motion.ellipse
              cx="306"
              cy="192"
              rx="3.2"
              ry="9"
              fill="#0b0719"
              animate={{ scaleY: [1, 1, 0.06, 1] }}
              transition={{ duration: 5.5, repeat: Infinity, times: [0, 0.93, 0.965, 1] }}
            />
          </motion.g>
          {/* eye flash when pleased */}
          {reaction === 'pleased' && (
            <motion.circle
              cx="306"
              cy="194"
              r="20"
              fill="#fff6d8"
              initial={{ opacity: 0.9, scale: 0.4 }}
              animate={{ opacity: 0, scale: 2.2 }}
              transition={{ duration: 0.7 }}
            />
          )}

          {/* nostril + smoke */}
          <ellipse cx="172" cy="206" rx="5" ry="3.4" fill="#070512" />
          <g className="smoke">
            <circle className="puff p1" cx="166" cy="192" r="6" />
            <circle className="puff p2" cx="158" cy="180" r="8" />
            <circle className="puff p3" cx="168" cy="170" r="7" />
            {(furious || roaring) && <circle className="puff p1" cx="160" cy="186" r="11" />}
          </g>

          {/* ======= FIRE BREATH ======= */}
          {(roaring || (furious && thinking)) && (
            <g>
              <motion.path
                d="M 160 248 C 100 270 30 300 -40 350 C 30 340 70 348 100 336
                   C 70 360 45 382 30 405 C 95 380 145 352 172 318 Z"
                fill="url(#dFire)"
                animate={{ opacity: [0.6, 1, 0.75, 1], scaleX: [1, 1.1, 0.96, 1.06] }}
                transition={{ duration: 0.55, repeat: Infinity }}
                style={{ transformOrigin: '165px 270px' }}
              />
              <motion.path
                d="M 162 252 C 115 272 70 292 25 322 C 70 314 100 318 125 308 Z"
                fill="#fff3c4"
                animate={{ opacity: [0.5, 0.95, 0.6, 0.9] }}
                transition={{ duration: 0.4, repeat: Infinity }}
              />
            </g>
          )}
        </motion.g>

        {/* ======= THE HOARD ======= */}
        <g>
          <ellipse cx="500" cy="600" rx="330" ry="40" fill="url(#dGold)" />
          <ellipse cx="380" cy="580" rx="150" ry="27" fill="url(#dGold)" />
          <ellipse cx="620" cy="584" rx="160" ry="29" fill="url(#dGold)" />
          <ellipse cx="500" cy="566" rx="112" ry="23" fill="url(#dGold)" />
          {/* loose coins */}
          <g fill="#ffd968" stroke="#a87618" strokeWidth="1.4">
            <ellipse cx="340" cy="596" rx="10" ry="4" />
            <ellipse cx="368" cy="606" rx="9" ry="3.6" />
            <ellipse cx="452" cy="588" rx="10" ry="4" />
            <ellipse cx="540" cy="598" rx="11" ry="4.2" />
            <ellipse cx="610" cy="608" rx="9" ry="3.6" />
            <ellipse cx="676" cy="596" rx="10" ry="4" />
            <ellipse cx="498" cy="556" rx="9" ry="3.6" />
            <ellipse cx="560" cy="572" rx="8" ry="3.2" />
            <ellipse cx="428" cy="570" rx="8" ry="3.2" />
          </g>
          {/* gems */}
          <path d="M 446 590 L 458 580 L 470 590 L 458 602 Z" fill="#41e0c8" opacity="0.95" />
          <path d="M 583 594 L 594 583 L 606 594 L 594 606 Z" fill="#ff5a7e" opacity="0.95" />
          <path d="M 514 608 L 524 599 L 534 608 L 524 618 Z" fill="#9a6bff" opacity="0.95" />
          {/* glints */}
          <circle className="sparkle s1" cx="430" cy="572" r="2.6" fill="#fff8dc" />
          <circle className="sparkle s2" cx="556" cy="588" r="2.2" fill="#fff8dc" />
          <circle className="sparkle s3" cx="500" cy="552" r="2" fill="#fff8dc" />
          <circle className="sparkle s4" cx="350" cy="592" r="2.4" fill="#fff8dc" />
          <circle className="sparkle s2" cx="650" cy="600" r="2.2" fill="#fff8dc" />
          <circle className="sparkle s3" cx="610" cy="576" r="1.8" fill="#fff8dc" />
        </g>
      </svg>
    </motion.div>
  )
}
