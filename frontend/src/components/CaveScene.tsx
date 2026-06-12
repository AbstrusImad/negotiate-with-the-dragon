import { useEffect, useRef } from 'react'
import { onFx } from '../lib/fx'

interface Ember {
  x: number
  y: number
  r: number
  vy: number
  sway: number
  phase: number
  hue: number
  alpha: number
  kind: 'ember' | 'dust'
}

interface BurstParticle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  maxLife: number
  kind: 'gold' | 'fire'
  spin: number
}

/** Fixed crystal positions (vw/vh %) so they never jump between renders. */
const CRYSTALS = [
  { x: 6, y: 22, s: 1.1, d: 0 },
  { x: 13, y: 64, s: 0.8, d: 1.2 },
  { x: 23, y: 12, s: 0.7, d: 2.1 },
  { x: 87, y: 18, s: 1.2, d: 0.6 },
  { x: 93, y: 55, s: 0.9, d: 1.8 },
  { x: 78, y: 8, s: 0.6, d: 2.6 },
  { x: 4, y: 86, s: 0.8, d: 0.9 },
  { x: 96, y: 84, s: 1, d: 2.2 },
]

interface CaveSceneProps {
  /** 0..100 — more wrath: more, redder embers and hotter glow. */
  anger: number
}

/**
 * The living cavern: layered atmosphere (god ray, drifting fog, glowing
 * crystals, lava floor, parallax rock silhouettes, the occasional bat) plus an
 * ember/dust canvas and physics particle bursts driven by the FX bus.
 */
export function CaveScene({ anger }: CaveSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const farRef = useRef<HTMLDivElement>(null)
  const nearRef = useRef<HTMLDivElement>(null)
  const angerRef = useRef(anger)
  angerRef.current = anger

  // ---- Mouse parallax with idle drift ----
  useEffect(() => {
    let raf = 0
    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let t = 0
    const onMove = (e: MouseEvent) => {
      tx = e.clientX / window.innerWidth - 0.5
      ty = e.clientY / window.innerHeight - 0.5
    }
    const tick = () => {
      t += 0.004
      // idle drift keeps the scene alive even without mouse movement
      const ix = Math.sin(t) * 0.04
      const iy = Math.cos(t * 0.7) * 0.03
      cx += (tx + ix - cx) * 0.05
      cy += (ty + iy - cy) * 0.05
      if (farRef.current)
        farRef.current.style.transform = `translate3d(${cx * -16}px, ${cy * -9}px, 0)`
      if (nearRef.current)
        nearRef.current.style.transform = `translate3d(${cx * -38}px, ${cy * -20}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  // ---- Particle engine (embers + dust + FX bursts) ----
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let width = 0
    let height = 0
    const ambient: Ember[] = []
    const bursts: BurstParticle[] = []
    let goldRainUntil = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const spawnAmbient = (kind: 'ember' | 'dust' = 'ember'): Ember => ({
      x: Math.random() * width,
      y: kind === 'ember' ? height + 10 + Math.random() * 40 : Math.random() * height,
      r: kind === 'ember' ? 0.8 + Math.random() * 2.4 : 0.5 + Math.random() * 1.1,
      vy: kind === 'ember' ? 0.25 + Math.random() * 0.9 : 0.05 + Math.random() * 0.12,
      sway: 0.3 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      hue: kind === 'ember' ? 18 + Math.random() * 30 : 45,
      alpha: kind === 'ember' ? 0.25 + Math.random() * 0.55 : 0.08 + Math.random() * 0.18,
      kind,
    })

    const spawnBurst = (kind: 'gold' | 'fire', count: number, ox: number, oy: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = kind === 'gold' ? 2 + Math.random() * 8 : 3 + Math.random() * 10
        bursts.push({
          x: ox,
          y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (kind === 'gold' ? 4 : 2),
          r: kind === 'gold' ? 2 + Math.random() * 3.4 : 1.2 + Math.random() * 2.6,
          life: 0,
          maxLife: 60 + Math.random() * 50,
          kind,
          spin: Math.random() * Math.PI * 2,
        })
      }
    }

    const unsubscribe = onFx((e) => {
      const ox = width * 0.42
      const oy = height * 0.62
      if (e.type === 'goldBurst') spawnBurst('gold', e.big ? 240 : 120, ox, oy)
      if (e.type === 'fireBlast') spawnBurst('fire', 140, width * 0.3, height * 0.5)
      if (e.type === 'victory') goldRainUntil = performance.now() + 5200
    })

    resize()
    for (let i = 0; i < 55; i++) {
      const e = spawnAmbient('ember')
      e.y = Math.random() * height
      ambient.push(e)
    }
    for (let i = 0; i < 40; i++) ambient.push(spawnAmbient('dust'))

    let t = 0
    const tick = () => {
      t += 0.016
      const rage = angerRef.current / 100
      const targetEmbers = 55 + Math.floor(rage * 55)
      const embersNow = ambient.filter((a) => a.kind === 'ember').length
      if (embersNow < targetEmbers) ambient.push(spawnAmbient('ember'))

      ctx.clearRect(0, 0, width, height)

      for (const e of ambient) {
        e.y -= e.vy * (e.kind === 'ember' ? 1 + rage * 0.8 : 1)
        e.x += Math.sin(t * e.sway + e.phase) * (e.kind === 'ember' ? 0.4 : 0.15)
        if (e.y < -12) Object.assign(e, spawnAmbient(e.kind))
        const flicker = 0.75 + 0.25 * Math.sin(t * 6 + e.phase)
        if (e.kind === 'ember') {
          const hue = Math.max(4, e.hue - rage * 14)
          ctx.beginPath()
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${hue}, 95%, ${55 + rage * 8}%, ${e.alpha * flicker})`
          ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`
          ctx.shadowBlur = 8
          ctx.fill()
          ctx.shadowBlur = 0
        } else {
          ctx.beginPath()
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(45, 60%, 80%, ${e.alpha * flicker})`
          ctx.fill()
        }
      }

      if (performance.now() < goldRainUntil && Math.random() < 0.5) {
        bursts.push({
          x: Math.random() * width,
          y: -10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 2 + Math.random() * 3,
          r: 2 + Math.random() * 3,
          life: 0,
          maxLife: 220,
          kind: 'gold',
          spin: Math.random() * Math.PI * 2,
        })
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        const p = bursts[i]
        p.life++
        p.vy += p.kind === 'gold' ? 0.22 : 0.06
        p.vx *= 0.985
        p.x += p.vx
        p.y += p.vy
        p.spin += 0.15
        const fade = 1 - p.life / p.maxLife
        if (fade <= 0 || p.y > height + 20) {
          bursts.splice(i, 1)
          continue
        }
        if (p.kind === 'gold') {
          const wobble = 0.55 + 0.45 * Math.sin(p.spin)
          ctx.beginPath()
          ctx.ellipse(p.x, p.y, p.r, p.r * wobble, p.spin, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${44 + Math.sin(p.spin) * 6}, 90%, ${58 + 12 * Math.sin(p.spin * 2)}%, ${fade})`
          ctx.shadowColor = 'rgba(255, 215, 100, 0.9)'
          ctx.shadowBlur = 10
          ctx.fill()
          ctx.shadowBlur = 0
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r * fade, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${10 + fade * 30}, 100%, ${50 + fade * 15}%, ${fade})`
          ctx.shadowColor = 'rgba(255, 90, 30, 0.9)'
          ctx.shadowBlur = 12
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      unsubscribe()
    }
  }, [])

  return (
    <div className="cave-scene" aria-hidden="true">
      {/* god ray from a crack in the ceiling */}
      <div className="god-ray" />

      {/* glowing wall crystals */}
      {CRYSTALS.map((c, i) => (
        <span
          key={i}
          className="crystal"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            transform: `scale(${c.s})`,
            animationDelay: `${c.d}s`,
          }}
        />
      ))}

      {/* drifting volumetric fog */}
      <div className="fog fog-1" />
      <div className="fog fog-2" />
      <div className="fog fog-3" />

      {/* parallax rock silhouettes */}
      <div ref={farRef} className="parallax-layer">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="rocks">
          <path
            d="M0 0 L90 0 L130 150 L170 0 L320 0 L355 120 L390 0 L640 0 L668 170 L700 0
               L940 0 L985 140 L1030 0 L1230 0 L1262 110 L1296 0 L1440 0 L1440 -40 L0 -40 Z"
            fill="#070512"
            opacity="0.85"
          />
        </svg>
      </div>
      <div ref={nearRef} className="parallax-layer">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="rocks">
          <path d="M0 900 L0 700 L120 760 L210 680 L300 780 L360 740 L420 820 L0 900 Z" fill="#050310" />
          <path d="M1440 900 L1440 660 L1330 740 L1240 690 L1150 790 L1080 750 L1020 830 L1440 900 Z" fill="#050310" />
          <path d="M260 0 L300 190 L345 0 Z M1130 0 L1165 160 L1205 0 Z" fill="#070512" opacity="0.9" />
        </svg>
      </div>

      {/* lava cracks along the floor edges */}
      <div className="lava-floor" style={{ opacity: 0.4 + (anger / 100) * 0.5 }} />

      {/* the occasional bat */}
      <span className="bat bat-1">🦇</span>
      <span className="bat bat-2">🦇</span>

      <canvas ref={canvasRef} className="cave-canvas" />
      <div className="cave-glow" style={{ opacity: 0.35 + (anger / 100) * 0.4 }} />
      <div className="cave-vignette" />
      <div className="film-grain" />
    </div>
  )
}
