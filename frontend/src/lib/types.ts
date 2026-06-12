/** Global dragon state returned by `get_dragon_state` (view). */
export interface DragonState {
  name: string
  personality: string
  mood: string
  anger: number
  /** GEN amounts in wei, serialized as strings to preserve precision. */
  treasury: string
  initial_gold: string
  total_extracted: string
  /** Winner's hex address, '' while the hoard is still guarded. */
  victor: string
  history_length: number
  players_count: number
}

/** Connected player's state returned by `get_player_state` (view). */
export interface PlayerState {
  patience: number
  burned: boolean
  gold_won: string
  streak: number
}

/** Critical outcome markers minted by the contract. */
export type CritKind = 'none' | 'legendary' | 'catastrophic'

/** One on-chain chronicle entry (a single negotiation turn). */
export interface HistoryEntry {
  i: number
  player: string
  message: string
  reply: string
  score: number
  mood: string
  crit: CritKind
  streak: number
  payout: string
  treasury_after: string
  patience: number
  anger: number
  burned: boolean
  victory: boolean
}

/** One row of the on-chain leaderboard (`get_leaderboard`). */
export interface LeaderboardRow {
  address: string
  gold_won: string
  streak: number
  burned: boolean
}

/** Lifecycle of a GenLayer transaction as seen from the UI. */
export type TxPhase = 'idle' | 'signing' | 'pending' | 'accepted' | 'finalized' | 'error'

export interface TxState {
  phase: TxPhase
  hash?: string
  error?: string
}
