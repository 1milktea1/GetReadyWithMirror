import type { RouteLeg } from '@contracts/maps/types'

/** `1, L. transfer at station 14 St.` */
export function formatSubwayDirections(legs: RouteLeg[] | undefined): string {
  const subway = (legs ?? []).filter((leg) => leg.kind === 'subway' && leg.line)
  const lines: string[] = []
  const transfers: string[] = []
  for (const [index, leg] of subway.entries()) {
    if (leg.line && lines.at(-1) !== leg.line) lines.push(leg.line)
    const next = subway[index + 1]
    if (!next?.line || !leg.line || next.line === leg.line) continue
    const station = next.fromStop?.trim() || leg.toStop?.trim()
    if (station && transfers.at(-1) !== station) transfers.push(station)
  }
  if (lines.length === 0) return ''
  if (transfers.length === 0) return lines.join(', ')
  return `${lines.join(', ')}. transfer at station ${transfers.join(', ')}.`
}
