import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { onFx } from '../lib/fx'

type Flash = { id: number; kind: 'fire' | 'gold' } | null

let flashId = 1

/** Full-screen verdict flashes: fire vignette on failure, gold wash on payout. */
export function FireOverlay() {
  const [flash, setFlash] = useState<Flash>(null)

  useEffect(
    () =>
      onFx((e) => {
        if (e.type === 'fireBlast') setFlash({ id: flashId++, kind: 'fire' })
        if (e.type === 'goldBurst' && e.big) setFlash({ id: flashId++, kind: 'gold' })
      }),
    [],
  )

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key={flash.id}
          className={`screen-flash flash-${flash.kind}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.4, 0.8, 0] }}
          transition={{ duration: flash.kind === 'fire' ? 1.1 : 0.9 }}
          onAnimationComplete={() => setFlash(null)}
        />
      )}
    </AnimatePresence>
  )
}
