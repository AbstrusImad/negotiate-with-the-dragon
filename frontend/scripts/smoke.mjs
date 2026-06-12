/** Smoke-test the three frontend read paths against the deployed contract. */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const here = dirname(fileURLToPath(import.meta.url))
const env = readFileSync(resolve(here, '..', '.env'), 'utf8')
const addr = env.match(/VITE_CONTRACT_ADDRESS=(0x[0-9a-fA-F]{40})/)[1]
const client = createClient({ chain: testnetBradbury })

const state = await client.readContract({ address: addr, functionName: 'get_dragon_state', args: [] })
console.log('dragon_state ✓', JSON.stringify(Object.fromEntries(Object.entries(state).filter(([k]) => ['name', 'mood', 'anger', 'treasury', 'history_length'].includes(k)))))
const player = await client.readContract({ address: addr, functionName: 'get_player_state', args: ['0x95803126315A05E642D8E46CE1d77eA2199a2A6E'] })
console.log('player_state ✓', JSON.stringify(player))
const history = await client.readContract({ address: addr, functionName: 'get_history', args: [0] })
console.log('history ✓ entries:', history.length)
const lb = await client.readContract({ address: addr, functionName: 'get_leaderboard', args: [] })
console.log('leaderboard ✓ rows:', lb.length)
console.log('ALL READS OK —', addr)
