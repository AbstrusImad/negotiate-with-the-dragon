import { useEffect, useRef, useState } from 'react'

/**
 * Reveals `text` character by character (RPG dialogue style).
 * When `enabled` is false the full text renders immediately.
 */
export function useTypewriter(text: string, enabled: boolean, cps = 38): string {
  const [shown, setShown] = useState(enabled ? '' : text)
  const done = useRef(!enabled)

  useEffect(() => {
    if (!enabled || done.current) {
      setShown(text)
      return
    }
    setShown('')
    let i = 0
    const interval = setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) {
        done.current = true
        clearInterval(interval)
      }
    }, 1000 / cps)
    return () => clearInterval(interval)
  }, [text, enabled, cps])

  return shown
}
