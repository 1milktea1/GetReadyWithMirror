const WAKE = /\bhey\b[\s,.:;-]*\bmirror\b/i

/** Text after "hey mirror", or null when the phrase was not said. An empty string is the wake phrase alone. */
export function commandAfterWake(text: string): string | null {
  const match = WAKE.exec(text)
  if (!match || match.index === undefined) return null
  return text.slice(match.index + match[0].length).replace(/^[\s,.:;-]+/, '').trim()
}
