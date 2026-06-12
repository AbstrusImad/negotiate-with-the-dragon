import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { CaveScene } from './components/CaveScene'
import { Chronicle } from './components/Chronicle'
import { CustomCursor } from './components/CustomCursor'
import { DragonScene } from './components/DragonScene'
import { FireOverlay } from './components/FireOverlay'
import { FloatingNumbers } from './components/FloatingNumbers'
import { HallOfLegends } from './components/HallOfLegends'
import { HudTop } from './components/HudTop'
import { IntroScreen } from './components/IntroScreen'
import { StatGauges } from './components/StatGauges'
import { TxToast } from './components/TxToast'
import { useDragonGame } from './hooks/useDragonGame'
import { useWallet } from './hooks/useWallet'
import { CONTRACT_ADDRESS, NETWORK_NAME } from './lib/genlayer'
import { formatGen, shortAddress } from './lib/format'
import { onFx } from './lib/fx'
import { sfx } from './lib/audio'

export default function App() {
  const [entered, setEntered] = useState(false)
  const [muted, setMuted] = useState(false)
  const [legendsOpen, setLegendsOpen] = useState(false)
  const wallet = useWallet()
  const game = useDragonGame(wallet.address)
  const shake = useAnimationControls()

  // Screen shake driven by the FX bus
  useEffect(
    () =>
      onFx((e) => {
        if (e.type !== 'shake') return
        const m = e.hard ? 2 : 1
        void shake.start({
          x: [0, -9 * m, 7 * m, -5 * m, 3 * m, 0],
          y: [0, 4 * m, -3 * m, 2 * m, -1 * m, 0],
          transition: { duration: e.hard ? 0.7 : 0.45 },
        })
      }),
    [shake],
  )

  const anger = game.dragon?.anger ?? 20
  const mood = game.dragon?.mood ?? 'distrustful'
  const thinking = game.tx.phase === 'signing' || game.tx.phase === 'pending'

  // Danger heartbeat + ambient growls tied to on-chain state
  useEffect(() => {
    const inDanger =
      !!wallet.address && !!game.player && !game.player.burned && game.player.patience <= 25
    sfx.setHeartbeat(entered && inDanger)
  }, [entered, wallet.address, game.player])

  useEffect(() => {
    if (entered) sfx.setWrathLevel(anger)
  }, [entered, anger])

  const iWon =
    !!wallet.address &&
    !!game.dragon?.victor &&
    game.dragon.victor.toLowerCase() === wallet.address.toLowerCase()

  const disabledReason = !CONTRACT_ADDRESS
    ? 'Set VITE_CONTRACT_ADDRESS in frontend/.env'
    : wallet.restoring && !wallet.address
      ? 'Restoring your session…'
      : !wallet.address
        ? 'connect-wallet'
        : game.player?.burned
          ? 'You are ashes. The dead do not negotiate.'
          : game.dragon?.victor
            ? 'The hoard has already fallen. The game is over.'
            : null

  return (
    <div className="game">
      <CaveScene anger={anger} />

      {/* center stage: the dragon (shakes on bad verdicts) */}
      <motion.div className="dragon-layer" animate={shake}>
        <DragonScene anger={anger} thinking={thinking} burned={!!game.player?.burned} />
        <FloatingNumbers />
      </motion.div>

      <HudTop
        dragon={game.dragon}
        network={NETWORK_NAME}
        muted={muted}
        onToggleMute={() => {
          sfx.init()
          setMuted(sfx.toggleMute())
        }}
        onOpenLegends={() => setLegendsOpen(true)}
        wallet={wallet}
      />

      <div className="hud-left">
        <StatGauges dragon={game.dragon} player={game.player} connected={!!wallet.address} />
        {game.loadError && (
          <p className="load-error" role="alert">
            ⚠️ {game.loadError}
          </p>
        )}
      </div>

      <aside className="hud-right">
        <Chronicle
          history={game.history}
          address={wallet.address}
          dragonName={game.dragon?.name ?? 'The Dragon'}
          tx={game.tx}
          disabledReason={disabledReason}
          onSend={game.negotiate}
          onConnect={wallet.connect}
        />
      </aside>

      <footer className="hud-foot">
        <span>
          mood: <em>{mood}</em>
        </span>
        <span>
          contract{' '}
          <code>{CONTRACT_ADDRESS ? shortAddress(CONTRACT_ADDRESS) : 'not configured'}</code> · the
          LLM runs inside the GenVM — every verdict is validator consensus
        </span>
      </footer>

      <TxToast tx={game.tx} onDismiss={game.dismissTx} />
      <FireOverlay />
      <HallOfLegends
        open={legendsOpen}
        rows={game.leaderboard}
        myAddress={wallet.address}
        onClose={() => setLegendsOpen(false)}
      />

      {/* Endgame banners — they do NOT cover the game; play is locked but the
          scene stays visible and the wallet can still be switched. */}
      <AnimatePresence>
        {entered && game.player?.burned && (
          <Overlay key="burned" cls="overlay-burned">
            <h2>INCINERATED</h2>
            <p>
              The dragon's patience reached zero. Your adventure ends in ashes — and this wallet
              is locked out forever. Your audacity lives on-chain in the chronicle.
            </p>
            <button
              className="endgame-disconnect"
              onClick={() => {
                sfx.play('click')
                wallet.disconnect()
              }}
              onMouseEnter={() => sfx.play('hover')}
            >
              Disconnect & try another wallet
            </button>
          </Overlay>
        )}
        {entered && game.dragon?.victor && (
          <Overlay key="victory" cls="overlay-victory">
            <h2>{iWon ? 'VICTORY!' : 'THE HOARD HAS FALLEN'}</h2>
            <p>
              {iWon
                ? `You emptied the dragon's hoard: ${formatGen(game.dragon.total_extracted)} GEN are now yours.`
                : `${shortAddress(game.dragon.victor)} talked the dragon out of its very last coin.`}
            </p>
            <button
              className="endgame-disconnect"
              onClick={() => {
                sfx.play('click')
                wallet.disconnect()
              }}
              onMouseEnter={() => sfx.play('hover')}
            >
              Disconnect wallet
            </button>
          </Overlay>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!entered && <IntroScreen key="intro" onEnter={() => setEntered(true)} />}
      </AnimatePresence>

      <CustomCursor />
    </div>
  )
}

function Overlay({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <motion.div
      className={`endgame-overlay ${cls}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="endgame-card"
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
