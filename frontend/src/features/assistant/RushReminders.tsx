import { useEffect, useRef, useState } from 'react'
import type { CalendarEvent } from '@contracts/calendar'
import { selectUpcoming } from '../calendar/selectUpcoming'
import type { CalendarSource } from '../calendar/data/calendarSource'
import { useCalendarEvents } from '../calendar/useCalendarEvents'
import { rushMark, type RushMark } from './rushMark'
import { isVoiceBusy, playAudioBlob, setVoiceBusy } from './voiceBusy'

interface Reminder {
  event: CalendarEvent
  minutesLeft: RushMark
  agenda: string[]
}

export function RushReminders({ now, source }: { now: Date; source: CalendarSource }) {
  const calendar = useCalendarEvents(source, now)
  const fired = useRef(new Set<string>())
  const playing = useRef(false)
  const [replay, setReplay] = useState<Reminder | null>(null)

  useEffect(() => {
    if (calendar.phase !== 'ready' || playing.current || isVoiceBusy()) return
    const upcoming = selectUpcoming(calendar.result.events, now, 4)
    const next = upcoming.find((item) => !item.inProgress)
    if (!next) return
    const minutesLeft = (next.start.getTime() - now.getTime()) / 60_000
    const mark = rushMark(minutesLeft)
    if (!mark) return
    const key = `${next.event.id}:${mark}`
    if (fired.current.has(key)) return
    fired.current.add(key)
    const reminder: Reminder = {
      event: next.event,
      minutesLeft: mark,
      agenda: upcoming.map((item) => [item.event.title, item.event.venueName].filter(Boolean).join(' at ')),
    }
    void speak(reminder, { onBlocked: () => setReplay(reminder), playing })
  }, [calendar, now])

  if (!replay) return null
  return (
    <button type="button" className="voice" onClick={() => void speak(replay, { onBlocked: () => setReplay(replay), playing })}>
      Hear the rush reminder
    </button>
  )
}

async function speak(reminder: Reminder, hooks: { onBlocked: () => void; playing: { current: boolean } }): Promise<void> {
  hooks.playing.current = true
  setVoiceBusy(true)
  try {
    const res = await fetch('/api/voice/rush', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: reminder.event.title,
        start: reminder.event.start,
        venue: reminder.event.venueName,
        minutesLeft: reminder.minutesLeft,
        agenda: reminder.agenda,
      }),
    })
    if (!res.ok) return
    try {
      await playAudioBlob(await res.blob())
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') hooks.onBlocked()
    }
  } finally {
    hooks.playing.current = false
    setVoiceBusy(false)
  }
}
