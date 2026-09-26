// Fixture-only planner for hosts that do not serve Express (Vercel static + missing /api).
// Same leave-by math as the backend. Travel minutes come from the labeled Columbia → Soothr
// fixture, not Google/Transitous/Valhalla.

import type { TransportMode } from '@contracts/maps/types'
import type { PlannerResponse, PreparationTask } from '@contracts/planner/types'
import demoDay from '@fixtures/calendar/demo-day.json'
import mapsFixture from '@fixtures/maps/columbia-to-soothr.json'
import { materializeFixture } from '../calendar/data/fixtureCalendarSource'
import {
  DEFAULT_ARRIVAL_BUFFER_MINUTES,
  DEFAULT_TASKS,
  DEFAULT_TRANSPORT_MODE,
  MAX_TASK_MINUTES,
  TASK_NAMES,
} from '../../../../backend/src/features/planner/defaults.ts'
import { buildPlan } from '../../../../backend/src/features/planner/schedule.ts'
import { markTaskComplete } from '../../../../backend/src/features/planner/tasks.ts'

const MODES: readonly TransportMode[] = ['transit', 'driving', 'walking', 'cycling', 'rideshare']

export async function generateLocalPlan(query: URLSearchParams): Promise<PlannerResponse> {
  const nowParam = query.get('now')
  const now = nowParam ? new Date(nowParam) : new Date()
  if (Number.isNaN(now.getTime())) {
    return { ok: false, error: { status: 'input-invalid', message: `Invalid "now" override: ${nowParam}` } }
  }

  const modeParam = query.get('mode')
  if (modeParam && !isMode(modeParam)) {
    return { ok: false, error: { status: 'input-invalid', message: 'mode must be "transit", "walking", "driving", "cycling", or "rideshare".' } }
  }
  const mode = modeParam && isMode(modeParam) ? modeParam : DEFAULT_TRANSPORT_MODE

  const bufferParam = query.get('buffer')
  let buffer = DEFAULT_ARRIVAL_BUFFER_MINUTES
  if (bufferParam !== null) {
    if (!/^\d+$/.test(bufferParam)) {
      return { ok: false, error: { status: 'input-invalid', message: 'buffer must be a whole number of minutes.' } }
    }
    buffer = Number(bufferParam)
  }

  const tasksParam = query.get('tasks')
  let tasks: PreparationTask[] = DEFAULT_TASKS.map((task) => ({ ...task }))
  if (tasksParam !== null) {
    const parsed = parseTasks(tasksParam)
    if (typeof parsed === 'string') return { ok: false, error: { status: 'input-invalid', message: parsed } }
    tasks = parsed
  }

  const doneParam = query.get('done')
  if (doneParam !== null) {
    for (const id of doneParam.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)) {
      const marked = markTaskComplete(tasks, id)
      if (!marked) return { ok: false, error: { status: 'input-invalid', message: `Unknown task "${id}".` } }
      tasks = marked
    }
  }

  const events = materializeFixture(demoDay, now)
  const event = events
    .filter((item) => item.venueAddress && Date.parse(item.end) > now.getTime())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0]
  if (!event?.venueAddress) {
    return { ok: false, error: { status: 'no-data', message: 'No upcoming event with an address to travel to.' } }
  }

  const route = mapsFixture.routes.find((item) => item.mode === mode)
  if (!route) {
    return { ok: false, error: { status: 'no-data', message: `No ${mode} duration is available for this trip.` } }
  }

  return {
    ok: true,
    data: buildPlan({
      now,
      timeZone: demoDay.timeZone,
      event: {
        id: event.id,
        title: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        venueName: event.venueName,
        venueAddress: event.venueAddress,
      },
      travelMinutes: route.durationMinutes,
      transportMode: mode,
      arrivalBufferMinutes: buffer,
      tasks,
      alternateRoutes: mapsFixture.routes.map((route) => ({
        mode: route.mode as TransportMode,
        durationMinutes: route.durationMinutes,
      })),
      calendarProvenance: 'fixture',
      mapsProvenance: 'fixture',
    }),
  }
}

function isMode(value: string): value is TransportMode {
  return (MODES as readonly string[]).includes(value)
}

function parseTasks(raw: string): PreparationTask[] | string {
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return 'tasks must list at least one id:minutes pair.'
  const tasks: PreparationTask[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    const match = /^([a-z0-9-]+):(\d+)$/i.exec(part)
    if (!match) return `Could not read task "${part}". Use id:minutes, for example hair:40.`
    const id = match[1]!.toLowerCase()
    const durationMinutes = Number(match[2])
    if (durationMinutes < 1 || durationMinutes > MAX_TASK_MINUTES) {
      return `Task ${id} must be between 1 and ${MAX_TASK_MINUTES} minutes.`
    }
    if (seen.has(id)) return `Task ${id} is listed twice.`
    seen.add(id)
    tasks.push({ id, name: TASK_NAMES[id] ?? nameFromId(id), durationMinutes })
  }
  return tasks
}

function nameFromId(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
