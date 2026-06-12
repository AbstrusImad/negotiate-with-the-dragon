import { AnimatePresence, motion } from 'framer-motion'
import type { TxState } from '../lib/types'
import { shortAddress } from '../lib/format'

interface TxToastProps {
  tx: TxState
  onDismiss: () => void
}

const PHASE_UI: Record<
  Exclude<TxState['phase'], 'idle'>,
  { icon: string; title: string; detail: string; cls: string; spinner?: boolean }
> = {
  signing: {
    icon: '✍️',
    title: 'Sign the transaction',
    detail: 'Your wallet awaits your seal before addressing the dragon.',
    cls: 'tx-signing',
    spinner: true,
  },
  pending: {
    icon: '⛓️',
    title: 'Consensus in progress',
    detail: 'The leader runs the AI; validators judge it (Optimistic Democracy).',
    cls: 'tx-pending',
    spinner: true,
  },
  accepted: {
    icon: '✅',
    title: 'Transaction ACCEPTED',
    detail: "Optimistic consensus reached. The dragon's verdict is now on-chain state.",
    cls: 'tx-accepted',
  },
  finalized: {
    icon: '🔱',
    title: 'FINALIZED',
    detail: 'Appeal window closed: burned into the chain forever.',
    cls: 'tx-finalized',
  },
  error: {
    icon: '💢',
    title: 'The negotiation failed',
    detail: '',
    cls: 'tx-error',
  },
}

/** Micro-feedback for the GenLayer transaction lifecycle. */
export function TxToast({ tx, onDismiss }: TxToastProps) {
  const ui = tx.phase === 'idle' ? null : PHASE_UI[tx.phase]

  return (
    <AnimatePresence>
      {ui && (
        <motion.div
          className={`tx-toast ${ui.cls}`}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          role="status"
        >
          <span className={`tx-icon ${ui.spinner ? 'tx-spin-glow' : ''}`}>{ui.icon}</span>
          <div className="tx-text">
            <strong>{ui.title}</strong>
            <span>{tx.phase === 'error' ? tx.error : ui.detail}</span>
            {tx.hash && (
              <code className="tx-hash" title={tx.hash}>
                tx: {shortAddress(tx.hash)}
              </code>
            )}
          </div>
          {ui.spinner && <span className="tx-spinner" aria-hidden="true" />}
          {(tx.phase === 'error' || tx.phase === 'finalized' || tx.phase === 'accepted') && (
            <button className="tx-close" onClick={onDismiss} aria-label="Dismiss">
              ×
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
