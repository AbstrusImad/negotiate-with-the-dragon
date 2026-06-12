const WEI_PER_GEN = 10n ** 18n

/** Convierte un monto en wei (string decimal) a GEN legible, ej. "12.5043". */
export function formatGen(wei: string | bigint | undefined | null): string {
  if (wei === undefined || wei === null || wei === '') return '0'
  let value: bigint
  try {
    value = typeof wei === 'bigint' ? wei : BigInt(wei)
  } catch {
    return '0'
  }
  const whole = value / WEI_PER_GEN
  const frac = value % WEI_PER_GEN
  if (frac === 0n) return whole.toString()
  const fracStr = frac.toString().padStart(18, '0').slice(0, 4).replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr}` : whole.toString()
}

/** Acorta una dirección hex: 0x1234…abcd */
export function shortAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

/** Porcentaje (0..100) de `part` sobre `total`, ambos wei en string. */
export function percentOf(part: string, total: string): number {
  try {
    const p = BigInt(part)
    const t = BigInt(total)
    if (t === 0n) return 0
    return Number((p * 10000n) / t) / 100
  } catch {
    return 0
  }
}
