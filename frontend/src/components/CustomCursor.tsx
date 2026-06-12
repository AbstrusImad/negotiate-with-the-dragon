import { useEffect, useRef } from 'react'

/**
 * Game cursor: a gold dot with a trailing ember ring that swells over
 * interactive elements. Desktop (fine pointers) only.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    document.documentElement.classList.add('has-game-cursor')

    let raf = 0
    let x = innerWidth / 2
    let y = innerHeight / 2
    let rx = x
    let ry = y
    let hot = false

    const onMove = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      const target = (e.target as Element | null)?.closest?.(
        'button, a, textarea, input, [role="button"]',
      )
      hot = !!target && !(target as HTMLButtonElement).disabled
    }

    const tick = () => {
      rx += (x - rx) * 0.18
      ry += (y - ry) * 0.18
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      if (ringRef.current)
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${hot ? 1.9 : 1})`
      ringRef.current?.classList.toggle('hot', hot)
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      document.documentElement.classList.remove('has-game-cursor')
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
