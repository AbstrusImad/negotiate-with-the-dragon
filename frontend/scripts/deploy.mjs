/**
 * Deploys contracts/dragon_escrow.py to the GenLayer Bradbury testnet using
 * the PRIVATE_KEY stored in contracts/.env, verifies it, optionally funds the
 * treasury (--fund <gen>), and writes frontend/.env.
 *
 * Usage:  node scripts/deploy.mjs [--fund 10]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAccount, createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')

const envText = readFileSync(resolve(root, 'contracts', '.env'), 'utf8')
const match = envText.match(/PRIVATE_KEY\s*=\s*(0x)?([0-9a-fA-F]{64})/)
if (!match) {
  console.error('PRIVATE_KEY not found in contracts/.env')
  process.exit(1)
}
const account = createAccount(`0x${match[2]}`)
const client = createClient({ chain: testnetBradbury, account })
console.log('Deployer:', account.address)

const balance = await client.getBalance({ address: account.address })
console.log('Balance :', Number(balance / 10n ** 14n) / 10000, 'GEN')

const DECIDED = new Set(['ACCEPTED', 'FINALIZED', 'UNDETERMINED', 'CANCELED', 'LEADER_TIMEOUT', 'VALIDATORS_TIMEOUT'])

async function waitDecided(hash, label) {
  let tx
  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    tx = await client.getTransaction({ hash })
    const s = tx?.statusName ?? String(tx?.status)
    if (i % 6 === 0) console.log(`[${label}] poll ${i}: ${s} / ${tx?.txExecutionResultName ?? '-'}`)
    if (DECIDED.has(s)) break
  }
  console.log(`[${label}] final: ${tx?.statusName} | exec: ${tx?.txExecutionResultName}`)
  if (tx?.statusName !== 'ACCEPTED' && tx?.statusName !== 'FINALIZED') {
    throw new Error(`${label} not accepted: ${tx?.statusName}`)
  }
  if (tx?.txExecutionResultName === 'FINISHED_WITH_ERROR') {
    throw new Error(`${label} execution failed (FINISHED_WITH_ERROR)`)
  }
  return tx
}

// ---- deploy ----
const code = readFileSync(resolve(root, 'contracts', 'dragon_escrow.py'), 'utf8')
console.log('Deploying dragon_escrow.py to', testnetBradbury.name, '…')
const deployHash = await client.deployContract({
  code,
  args: ['Vermithrax the Avaricious', '', ''],
})
console.log('Deploy tx:', deployHash)
const deployTx = await waitDecided(deployHash, 'deploy')
const contractAddress = deployTx.recipient
console.log('Contract :', contractAddress)

// ---- verify ----
const state = await client.readContract({
  address: contractAddress,
  functionName: 'get_dragon_state',
  args: [],
})
console.log('get_dragon_state →', state)

// ---- optional treasury funding ----
const fundIdx = process.argv.indexOf('--fund')
if (fundIdx !== -1) {
  const gen = Number(process.argv[fundIdx + 1] ?? '1')
  const wei = BigInt(Math.round(gen * 1e6)) * 10n ** 12n
  console.log(`Funding treasury with ${gen} GEN…`)
  const fundHash = await client.writeContract({
    address: contractAddress,
    functionName: 'fund_treasury',
    args: [],
    value: wei,
  })
  console.log('Fund tx:', fundHash)
  await waitDecided(fundHash, 'fund')
  const treasury = await client.readContract({
    address: contractAddress,
    functionName: 'get_treasury',
    args: [],
  })
  console.log('Treasury now:', treasury, 'wei')
}

// ---- write frontend/.env ----
writeFileSync(
  resolve(here, '..', '.env'),
  `VITE_CONTRACT_ADDRESS=${contractAddress}\nVITE_GENLAYER_NETWORK=bradbury\n`,
)
console.log('frontend/.env updated with', contractAddress)
console.log('DONE')
