/**
 * Tiny game-FX event bus. Gameplay logic emits semantic events
 * (gold burst, screen shake, floating combat text…) and the visual
 * layers (canvas, overlays) subscribe to render them.
 */

export type FxEvent =
  | { type: 'goldBurst'; big?: boolean }
  | { type: 'fireBlast' }
  | { type: 'shake'; hard?: boolean }
  | { type: 'float'; text: string; kind: 'gold' | 'damage' | 'score' | 'crit' }
  | { type: 'victory' }

type FxListener = (e: FxEvent) => void

const listeners = new Set<FxListener>()

export function emitFx(e: FxEvent): void {
  for (const l of listeners) l(e)
}

export function onFx(listener: FxListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
