/** Inspect a GenLayer tx: status, execution result and leader receipt errors. */
import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const hash = process.argv[2]
if (!hash) {
  console.error('usage: node scripts/inspect-tx.mjs <txHash>')
  process.exit(1)
}
const client = createClient({ chain: testnetBradbury })
const tx = await client.getTransaction({ hash })

console.log('statusName          :', tx?.statusName ?? tx?.status)
console.log('resultName          :', tx?.resultName ?? tx?.result)
console.log('txExecutionResult   :', tx?.txExecutionResultName ?? tx?.txExecutionResult)
console.log('recipient           :', tx?.recipient)
console.log('data keys           :', tx?.data ? Object.keys(tx.data) : null)
if (tx?.data) console.dir(tx.data, { depth: 3 })
const lr = tx?.consensus_data?.leader_receipt
if (lr?.length) {
  const r = lr[0]
  console.log('leader executionResult:', r?.execution_result ?? r?.executionResult)
  const stdout = r?.genvm_result?.stdout ?? r?.stdout
  const stderr = r?.genvm_result?.stderr ?? r?.stderr
  if (stdout) console.log('GenVM stdout:', String(stdout).slice(0, 2000))
  if (stderr) console.log('GenVM stderr:', String(stderr).slice(0, 4000))
} else {
  console.log('no leader_receipt; full tx below')
  console.dir(tx, { depth: 4 })
}
