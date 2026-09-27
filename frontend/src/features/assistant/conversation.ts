export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

const MAX_TURNS = 8

/** Keep recent spoken turns for Grok. Tool roles never enter this list. */
export function appendSpokenTurn(history: readonly ChatTurn[], user: string, assistant: string): ChatTurn[] {
  const next = [...history, { role: 'user' as const, content: user.trim() }, { role: 'assistant' as const, content: assistant.trim() }]
  return next.filter((turn) => turn.content.length > 0).slice(-MAX_TURNS)
}
