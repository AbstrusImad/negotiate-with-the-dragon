import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { onFx } from '../lib/fx'

interface FloatItem {
  id: number
  text: string
  kind: 'gold' | 'damage' | 'score' | 'crit'
  x: number
}

let nextId = 1

/** RPG-style floating combat text (loot gained, patience lost, crits…). */
export function FloatingNumbers() {
  const [items, setItems] = useState<FloatItem[]>([])

  useEffect(
    () =>
      onFx((e) => {
        if (e.type !== 'float') return
        const item: FloatItem = {
          id: nextId++,
          text: e.text,
          kind: e.kind,
          x: 38 + Math.random() * 24, // % across the stage
        }
        setItems((prev) => [...prev.slice(-5), item])
        setTimeout(() => {
          setItems((prev) => prev.filter((i) => i.id !== item.id))
        }, 2600)
      }),
    [],
  )

  return (
    <div className="floating-layer" aria-hidden="true">
      <AnimatePresence>
        {items.map((item) => (
          <motion.span
            key={item.id}
            className={`float-text float-${item.kind}`}
            style={{ left: `${item.x}%` }}
            initial={{ opacity: 0, y: 0, scale: item.kind === 'crit' ? 0.4 : 0.8 }}
            animate={{ opacity: 1, y: -110, scale: item.kind === 'crit' ? 1.25 : 1 }}
            exit={{ opacity: 0, y: -150 }}
            transition={{ duration: 2.4, ease: 'easeOut' }}
          >
            {item.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
