import { useEffect, useRef, useState } from 'react'
import './VoiceButton.css'
import { commandAfterWake } from './wakePhrase'
import { appendSpokenTurn, type ChatTurn } from './conversation'
import { playAudioBlob, setVoiceBusy } from './voiceBusy'

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface VoiceUiEvent {
  action: 'expandWidget' | 'collapseWidget' | 'showOverview'
  target?: string
}

export function VoiceButton({ onEvents }: { onEvents: (events: VoiceUiEvent[]) => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [notice, setNotice] = useState('')
  const [live, setLive] = useState('')
  const [scribe, setScribe] = useState('')
  const phaseRef = useRef<Phase>('idle')
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const historyRef = useRef<ChatTurn[]>([])
  const eventsRef = useRef(onEvents)

  useEffect(() => {
    eventsRef.current = onEvents
  }, [onEvents])

  useEffect(() => {
    const busy = phase !== 'idle'
    if (!busy) return
    setVoiceBusy(true)
    return () => setVoiceBusy(false)
  }, [phase])

  function setPhaseNow(next: Phase) {
    phaseRef.current = next
    setPhase(next)
  }

  async function toggle() {
    if (phaseRef.current === 'listening') {
      recorder.current?.stop()
      return
    }
    if (phaseRef.current !== 'idle') return
    await recordCommand()
  }

  async function recordCommand() {
    if (phaseRef.current !== 'idle') return
    setPhaseNow('listening')
    setScribe('')
    setNotice('')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setNotice('Microphone access was denied')
      setPhaseNow('idle')
      return
    }
    const media = new MediaRecorder(stream)
    chunks.current = []
    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data)
    }
    media.onstop = () => {
      stopSilence.current?.()
      stream.getTracks().forEach((track) => track.stop())
      const audio = new Blob(chunks.current, { type: media.mimeType || 'audio/webm' })
      void finish(audio)
    }
    recorder.current = media
    media.start()
    stopSilence.current = watchSilence(stream, () => media.stop())
  }

  const stopSilence = useRef<(() => void) | null>(null)

  async function finish(audio: Blob) {
    setPhaseNow('thinking')
    setNotice('')
    try {
      const transcript = await postAudio(audio)
      const afterWake = commandAfterWake(transcript)
      const heard = (afterWake === null ? transcript : afterWake).trim()
      setScribe(heard)
      if (!heard) throw new Error('No words were recognized.')
      await answer(heard)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Voice failed')
      setPhaseNow('idle')
    }
  }

  async function answer(utterance: string) {
    setPhaseNow('thinking')
    setNotice('')
    try {
      const turn = await postAssistant({ utterance, history: historyRef.current }, (events) => {
        eventsRef.current(events)
      })
      const spoken = textOf(turn, 'spokenText')
      historyRef.current = appendSpokenTurn(historyRef.current, utterance, spoken)
      setPhaseNow('speaking')
      try {
        await play(spoken)
      } catch {
        // Grok already opened the module. Audio may fail in this browser.
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Voice failed')
    } finally {
      setPhaseNow('idle')
    }
  }

  useEffect(() => {
    const recognition = startWakeListener({
      onTranscript: (text) => {
        if (phaseRef.current === 'thinking' || phaseRef.current === 'speaking') return
        setLive(text)
      },
      onWake: (command) => {
        if (phaseRef.current !== 'idle') return
        setScribe(command)
        if (command) void answer(command)
        else void recordCommand()
      },
      onDenied: () => {
        if (phaseRef.current === 'idle') setNotice('Microphone access was denied')
      },
      onUnavailable: () => {
        if (phaseRef.current === 'idle') setNotice('Tap to talk')
      },
    })
    return () => recognition?.stop()
  }, [])

  const phaseStatus = phase === 'listening' ? 'Listening' : phase === 'thinking' ? 'Thinking' : phase === 'speaking' ? 'Speaking' : ''

  return (
    <div className="voice-dock">
      <div className="voice-captions" aria-live="polite">
        {notice && <p className="voice-captions__line">{notice}</p>}
        {live && <p className="voice-captions__line">{live}</p>}
        {scribe && (
          <p className="voice-captions__scribe">
            <span className="voice-captions__tag">Heard</span>
            {scribe}
          </p>
        )}
      </div>
      <button type="button" className={`voice voice--${phase}`} onClick={() => void toggle()}>
        <span className="voice__label">{phase === 'listening' ? 'Stop' : 'Hey Mirror'}</span>
        {phaseStatus && <span className="voice__status">{phaseStatus}</span>}
      </button>
    </div>
  )
}

interface WakeListener {
  stop: () => void
}

function startWakeListener(handlers: {
  onTranscript: (text: string) => void
  onWake: (command: string) => void
  onDenied: () => void
  onUnavailable: () => void
}): WakeListener | null {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    handlers.onUnavailable()
    return null
  }
  const recognition = new Ctor()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'
  let closed = false
  let timer = 0
  let pending = ''

  const fire = (command: string) => {
    window.clearTimeout(timer)
    if (closed) return
    pending = ''
    handlers.onWake(command)
  }

  recognition.onresult = (event) => {
    const latest = latestTranscript(event)
    if (latest) handlers.onTranscript(latest)
    const text = transcriptFrom(event)
    const command = commandAfterWake(text)
    if (command === null) return
    pending = command
    const final = event.results[event.results.length - 1]?.isFinal
    if (final) {
      fire(command)
      return
    }
    window.clearTimeout(timer)
    timer = window.setTimeout(() => fire(pending), 700)
  }
  recognition.onerror = (event) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') handlers.onDenied()
  }
  recognition.onend = () => {
    if (closed) return
    try {
      recognition.start()
    } catch {
      // A restart racing with stop is safe to ignore.
    }
  }
  try {
    recognition.start()
  } catch {
    handlers.onUnavailable()
    return null
  }
  return {
    stop: () => {
      closed = true
      window.clearTimeout(timer)
      try {
        recognition.stop()
      } catch {
        // Already stopped.
      }
    },
  }
}

function recognitionCtor(): (new () => BrowserRecognition) | null {
  const browser = window as Window & {
    SpeechRecognition?: new () => BrowserRecognition
    webkitSpeechRecognition?: new () => BrowserRecognition
  }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null
}

interface BrowserRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: BrowserRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

interface BrowserRecognitionEvent {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

function latestTranscript(event: BrowserRecognitionEvent): string {
  const last = event.results[event.results.length - 1]
  return last?.[0]?.transcript.trim() ?? ''
}

function transcriptFrom(event: BrowserRecognitionEvent): string {
  return Array.from(event.results)
    .map((result) => result[0].transcript)
    .join(' ')
}

function watchSilence(stream: MediaStream, onSilent: () => void): () => void {
  const context = new AudioContext()
  const source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  analyser.fftSize = 2048
  source.connect(analyser)
  const samples = new Uint8Array(analyser.fftSize)
  const started = performance.now()
  let quietSince = 0
  let stopped = false
  const finish = () => {
    if (stopped) return
    stopped = true
    onSilent()
  }
  const timer = window.setInterval(() => {
    if (stopped) return
    if (context.state !== 'running') {
      void context.resume()
      return
    }
    analyser.getByteTimeDomainData(samples)
    let energy = 0
    for (const sample of samples) {
      const centered = (sample - 128) / 128
      energy += centered * centered
    }
    const level = Math.sqrt(energy / samples.length)
    const elapsed = performance.now() - started
    if (elapsed > 12_000) {
      finish()
      return
    }
    if (elapsed < 800) return
    if (level < 0.02) {
      if (quietSince === 0) quietSince = performance.now()
      if (performance.now() - quietSince > 1_200) finish()
    } else {
      quietSince = 0
    }
  }, 100)
  return () => {
    stopped = true
    window.clearInterval(timer)
    source.disconnect()
    void context.close()
  }
}

async function postAudio(audio: Blob): Promise<string> {
  const res = await fetch('/api/voice/transcribe', {
    method: 'POST',
    headers: { 'content-type': audio.type || 'audio/webm' },
    body: audio,
  })
  const body = await readJson(res)
  const text = textOf(body, 'text')
  if (!text) throw new Error(messageOf(body) || 'No words were recognized.')
  return text
}

async function postAssistant(
  payload: unknown,
  onEvents: (events: VoiceUiEvent[]) => void,
): Promise<JsonBody> {
  const res = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const type = res.headers && typeof res.headers.get === 'function' ? (res.headers.get('content-type') ?? '') : ''
  const body = type.includes('ndjson') ? await readAssistantStream(res, onEvents) : await readJson(res)
  if (!body.ok) throw new Error(messageOf(body) || 'The assistant could not answer.')
  const events = Array.isArray(body.data?.uiEvents) ? (body.data.uiEvents as VoiceUiEvent[]) : []
  if (events.length > 0 && !type.includes('ndjson')) onEvents(events)
  return body
}

async function readAssistantStream(
  res: Response,
  onEvents: (events: VoiceUiEvent[]) => void,
): Promise<JsonBody> {
  if (!res.body) return {}
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done: JsonBody = {}
  while (true) {
    const chunk = await reader.read()
    buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done })
    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (line) {
        const message = JSON.parse(line) as { type?: string; uiEvents?: unknown } & JsonBody
        if (message.type === 'ui' && Array.isArray(message.uiEvents)) {
          onEvents(message.uiEvents as VoiceUiEvent[])
        }
        if (message.type === 'done' || message.ok !== undefined) done = message
      }
      newline = buffer.indexOf('\n')
    }
    if (chunk.done) break
  }
  return done
}

async function play(text: string): Promise<void> {
  const res = await fetch('/api/voice/speak', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = await readJson(res)
    throw new Error(messageOf(body) || 'Could not speak the reply.')
  }
  await playAudioBlob(await res.blob())
}

interface JsonBody {
  ok?: boolean
  data?: { text?: string; spokenText?: string; uiEvents?: unknown }
  error?: { message?: string }
}

async function readJson(res: Response): Promise<JsonBody> {
  try {
    return (await res.json()) as JsonBody
  } catch {
    return {}
  }
}

function textOf(body: JsonBody, field: 'text' | 'spokenText'): string {
  const value = body.data?.[field]
  return typeof value === 'string' ? value.trim() : ''
}

function messageOf(body: JsonBody): string {
  return body.error?.message ?? ''
}
