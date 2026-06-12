import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const addr = process.argv[2]
const client = createClient({ chain: testnetBradbury })
const report = await client.readContract({ address: addr, functionName: 'probe_api', args: [] })
console.log('API REPORT:')
console.log(report)
const t = await client.readContract({ address: addr, functionName: 'probe_types', args: [] })
console.log('dict view →', t)
