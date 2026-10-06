import type { Driver } from '../../api/types'

const FALLBACK_B = '#e5e5e5'

function rgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Each driver wears their team colour. Teammates (or near-identical liveries) would be
 * indistinguishable, so B falls back to light grey; B is also always dashed, so identity
 * never rests on colour alone.
 */
export function driverColors(a?: Driver, b?: Driver) {
  const colorA = `#${a?.team_colour ?? '3b82f6'}`
  const colorB = `#${b?.team_colour ?? 'f97316'}`
  const [r1, g1, b1] = rgb(colorA)
  const [r2, g2, b2] = rgb(colorB)
  const distance = Math.hypot(r1 - r2, g1 - g2, b1 - b2)
  return { A: colorA, B: distance < 90 ? FALLBACK_B : colorB }
}

export const DASH_B = '6 4'
