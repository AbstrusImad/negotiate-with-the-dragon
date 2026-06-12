/**
 * Validates a contract file against the live GenVM via gen_getContractSchemaForCode
 * (no deployment, instant feedback on imports/header/syntax).
 * Usage: node scripts/validate-code.mjs ../contracts/dragon_escrow.py
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const here = dirname(fileURLToPath(import.meta.url))
const file = resolve(here, process.argv[2] ?? '../../contracts/dragon_escrow.py')
const code = readFileSync(file, 'utf8')
const client = createClient({ chain: testnetBradbury })

const b64 = Buffer.from(code, 'utf8').toString('base64')
const attempts = [
  { method: 'gen_getContractSchema', params: [{ code: b64 }] },
]
let ok = false
for (const att of attempts) {
  try {
    const schema = await client.request(att)
    console.log(`SCHEMA OK via ${att.method}`)
    console.dir(schema, { depth: 5 })
    ok = true
    break
  } catch (e) {
    console.log(`${att.method} → ${String(e?.message ?? e).slice(0, 500)}`)
    if (e?.cause?.data) console.log('data:', JSON.stringify(e.cause.data).slice(0, 4000))
  }
}
if (!ok) process.exit(2)
