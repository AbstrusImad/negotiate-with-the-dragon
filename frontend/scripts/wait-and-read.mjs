/**
 * Polls a GenLayer tx until it reaches a decided state, then (optionally)
 * calls probe views on the deployed contract.
 * Usage: node scripts/wait-and-read.mjs <txHash> [--probe]
 */
import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const hash = process.argv[2]
const doProbe = process.argv.includes('--probe')
const client = createClient({ chain: testnetBradbury })

const DECIDED = new Set(['ACCEPTED', 'FINALIZED', 'UNDETERMINED', 'CANCELED', 'LEADER_TIMEOUT', 'VALIDATORS_TIMEOUT'])

let tx
for (let i = 0; i < 90; i++) {
  tx = await client.getTransaction({ hash })
  const s = tx?.statusName ?? String(tx?.status)
  process.stdout.write(`\rpoll ${i}: status=${s} exec=${tx?.txExecutionResultName ?? '-'}    `)
  if (DECIDED.has(s)) break
  await new Promise((r) => setTimeout(r, 5000))
}
console.log('')
console.log('final status:', tx?.statusName, '| exec:', tx?.txExecutionResultName, '| result:', tx?.resultName)
const addr = tx?.recipient
console.log('contract:', addr)

if (doProbe && tx?.txExecutionResultName === 'FINISHED_NO_ERROR') {
  const note = await client.readContract({ address: addr, functionName: 'get_note', args: [] })
  console.log('note:', note)
  const report = await client.readContract({ address: addr, functionName: 'probe_api', args: [] })
  console.log('API REPORT:', report)
  try {
    const t = await client.readContract({ address: addr, functionName: 'probe_types', args: [] })
    console.log('dict view →', t)
  } catch (e) {
    console.log('dict view failed:', String(e?.message).slice(0, 200))
  }
}
