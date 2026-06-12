/** Deploys contracts/probe.py with robust polling and prints its API report. */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAccount, createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const envText = readFileSync(resolve(root, 'contracts', '.env'), 'utf8')
const pk = `0x${envText.match(/PRIVATE_KEY\s*=\s*(0x)?([0-9a-fA-F]{64})/)[2]}`
const account = createAccount(pk)
const client = createClient({ chain: testnetBradbury, account })

const code = readFileSync(resolve(root, 'contracts', 'probe.py'), 'utf8')
console.log('Deploying probe…')
const hash = await client.deployContract({ code, args: [] })
console.log('tx:', hash)

const DECIDED = new Set(['ACCEPTED', 'FINALIZED', 'UNDETERMINED', 'CANCELED', 'LEADER_TIMEOUT', 'VALIDATORS_TIMEOUT'])
let tx
for (let i = 0; i < 180; i++) {
  await new Promise((r) => setTimeout(r, 5000))
  tx = await client.getTransaction({ hash })
  const s = tx?.statusName ?? String(tx?.status)
  if (i % 6 === 0) console.log(`poll ${i}: status=${s} exec=${tx?.txExecutionResultName ?? '-'}`)
  if (DECIDED.has(s)) break
}
console.log('final:', tx?.statusName, '| exec:', tx?.txExecutionResultName)
const addr = tx?.recipient
console.log('addr:', addr)
if (tx?.txExecutionResultName === 'FINISHED_WITH_ERROR') process.exit(2)

for (const fn of ['dump2', 'dump_candidates']) {
  try {
    const out = await client.readContract({ address: addr, functionName: fn, args: [] })
    console.log(`${fn} →`)
    console.log(out)
  } catch (e) {
    console.log(`${fn} failed:`, String(e?.message).slice(0, 200))
  }
}
