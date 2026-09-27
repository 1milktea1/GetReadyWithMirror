import { vi } from 'vitest'

type ResultHandler = (event: { results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void

class FakeRecognition {
  continuous = false
  interimResults = false
  lang = ''
  onresult: ResultHandler | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null

  start() {
    FakeRecognition.active = this
  }

  stop() {
    if (FakeRecognition.active === this) FakeRecognition.active = null
  }

  static active: FakeRecognition | null = null
}

/** Browser SpeechRecognition stand-in so tests can fire “hey mirror …” without the type bar. */
export function stubWakeRecognition() {
  FakeRecognition.active = null
  vi.stubGlobal('SpeechRecognition', FakeRecognition)
  vi.stubGlobal('webkitSpeechRecognition', FakeRecognition)
}

export function sayHeyMirror(command: string) {
  const recognition = FakeRecognition.active
  if (!recognition?.onresult) {
    throw new Error('Wake listener is not running')
  }
  recognition.onresult({
    results: [{ isFinal: true, 0: { transcript: `hey mirror ${command}` } }],
  })
}
