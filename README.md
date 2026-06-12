# 🐉 Negotiate with the Dragon

A studio-grade decentralized game on **GenLayer** (Bradbury **Testnet**). A dragon
guards a treasury of **GEN** tokens inside an *Intelligent Contract*. Players
address it in **natural language** — flattery, barter or threats — and an
**LLM running inside the GenVM** decides on-chain whether to part with the gold.
Validators agree on the AI verdict through **Optimistic Democracy**.

## 🟢 LIVE ON BRADBURY

| | |
| --- | --- |
| **Contract** | `0xCA98d7142c8bB468D9891a773602106C11692526` |
| **Network** | GenLayer Bradbury Testnet (chain id 4221) |
| **Treasury** | funded with 10 GEN |
| **Deployer** | `0x95803126315A05E642D8E46CE1d77eA2199a2A6E` (key in `contracts/.env`) |

`frontend/.env` is already configured. To play:

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173 → ENTER THE LAIR → connect MetaMask
```

```
negocia_con_el_dragon/
├── contracts/
│   ├── dragon_escrow.py       # Intelligent Contract (deployed)
│   └── probe.py               # GenVM API discovery probe (dev tool)
├── frontend/
│   ├── scripts/
│   │   ├── deploy.mjs         # node scripts/deploy.mjs [--fund 10]
│   │   ├── validate-code.mjs  # instant GenVM validation (no deploy)
│   │   └── smoke.mjs          # read-path smoke test vs live contract
│   └── src/
│       ├── lib/               # genlayer.ts · fx.ts (FX bus) · audio.ts (WebAudio synth)
│       ├── hooks/             # useDragonGame · useWallet · useTypewriter
│       └── components/        # DragonScene · CaveScene · HudTop · StatGauges ·
│                              # Chronicle · HallOfLegends · FireOverlay ·
│                              # FloatingNumbers · CustomCursor · IntroScreen · TxToast
└── .claude/skills/            # GenLayer skills (write-contract, genvm-lint, genlayer-cli)
```

---

## 🧠 On-chain design

| Mechanic | Implementation |
| --- | --- |
| The hoard | Real GEN balance (`self.balance`), funded via payable `fund_treasury()` |
| Dragon personality | `TreeMap[str, str]` (name, personality, secret weakness, mood) |
| AI evaluation | `gl.nondet.exec_prompt(prompt, response_format="json")` with defensive parsing |
| Consensus | **Custom validator** (`gl.vm.run_nondet_unsafe`): the validator re-runs the judgment and accepts only if both scores land in the same outcome band within ±15 points — per the official `write-contract` skill guidance |
| Player payout | `gl.get_contract_at(player).emit_transfer(value=u256(payout), on="finalized")` — native GEN transfer (API verified against the live GenVM via probe contract) |
| Patience / Wrath | `TreeMap[Address, u256]` per player + global wrath; turn resolution is deterministic from the consensual score |
| Win streaks | +2% payout per consecutive success (cap +10%) |
| Criticals | `score ≥ 95` LEGENDARY (35% payout) · `score ≤ 10` CATASTROPHIC (−30 patience or worse) |
| Leaderboard | On-chain registry + `get_leaderboard()` ranked by gold extracted |
| Chronicle | `DynArray[str]` of JSON turn entries |

**Outcome bands:** ≥95 legendary · 70–94 success (10–25% + streak) · 40–69 neutral
(patience −8) · 11–39 failure (−15 − wrath/5) · ≤10 catastrophic. Payout that would
leave <1% of the original hoard surrenders everything → **VICTORY**. Patience 0 →
**INCINERATED** (locked out forever).

### Hard-won GenVM facts (verified on Bradbury)

- The runner header **must pin a hash**: `# { "Depends": "py-genlayer:1jb45aa8…" }`.
  `py-genlayer:test` / `latest` are **rejected** by all networks (deploys land as
  `FINISHED_WITH_ERROR`).
- Imports: `from genlayer import *` only — `genlayer.types` and `gl.chain` do **not**
  exist on the current GenVM.
- Native transfers: `gl.get_contract_at(Address).emit_transfer(value=u256, on=…)`.
- Successful deploy executions report `FINISHED_WITH_RETURN`.
- Validate code instantly without deploying: RPC `gen_getContractSchema` with
  base64 code (`frontend/scripts/validate-code.mjs`), plus `genvm-lint` locally.

---

## 🚀 Deploy / operate

```bash
cd frontend
node scripts/validate-code.mjs ../../contracts/dragon_escrow.py   # instant GenVM check
node scripts/deploy.mjs --fund 10                                 # deploy + fund + write .env
node scripts/smoke.mjs                                            # verify read paths
```

`genvm-lint check contracts/dragon_escrow.py` runs the official linter
(`pip install genvm-linter`).

---

## 🎨 Frontend — AAA presentation

- **Game-shell HUD**: fixed viewport, no page scroll — top bar with the hoard
  **jackpot counter**, network pill and an always-visible **Connect Wallet**;
  stat gauges on the left; the Cave Chronicle console on the right.
- **Cinematic vector dragon**: angular paper-cut style with rim lighting from
  the gold, folded + raised wings, sweeping tail, claws on the hoard, a
  **glowing chest furnace** (Smaug-style) that surges while validators
  deliberate, cursor-tracking pupil, blinking, smoke, jaw and fire-breath
  reactions to verdicts.
- **Living cavern**: god ray, drifting volumetric fog, glowing wall crystals,
  lava floor cracks, mouse-parallax rocks with idle drift, ember/dust canvas,
  the occasional bat, film grain and vignette.
- **Game feel**: physics gold-coin bursts, screen shake (harder on criticals),
  full-screen fire/gold flashes, RPG floating combat text, victory gold rain,
  custom ember cursor.
- **Procedural audio** (WebAudio, zero assets): cave-rumble ambience, gold
  chimes, growls, fire blasts, victory fanfare, hover/click ticks, a **danger
  heartbeat** when patience ≤ 25 and distant growls that grow with wrath.
- **Chronicle console**: typewriter dialogue, verdict chips (score, LEGENDARY /
  CATASTROPHIC, GEN paid, streak), "the dragon deliberates…" indicator, and the
  full tx lifecycle as toasts: signing → pending → **ACCEPTED** → **FINALIZED**.
- Wrath ring gauge, segmented patience bar, streak bolts, Hall of Legends modal,
  endgame overlays, loading skeletons, `prefers-reduced-motion` respected.

---

## 🔌 genlayer-js integration (summary)

```ts
import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

const reader = createClient({ chain: testnetBradbury })                 // free views
const writer = createClient({ chain: testnetBradbury, account: addr })  // MetaMask signs

const hash = await writer.writeContract({
  address: CONTRACT_ADDRESS,
  functionName: 'negotiate',
  args: ['O wise Vermithrax, I offer you my library of elven scrolls…'],
  value: 0n,
})
await writer.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED })
```

References: [docs.genlayer.com](https://docs.genlayer.com) ·
[genlayer-js](https://github.com/genlayerlabs/genlayer-js) ·
[GenLayer Skills](https://skills.genlayer.com/) ·
[Builders portal](https://portal.genlayer.foundation/)
