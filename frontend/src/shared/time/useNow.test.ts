import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatClock } from './format'
import { useNow } from './useNow'
import { MIRROR_TIME_ZONE as NY } from './zonedTime'

const deviceTime = new Date('2026-09-26T15:36:00Z') // 11:36 AM in New York

function openAt(path: string) {
  window.history.replaceState(null, '', path)
}

const clockText = (date: Date) => {
  const { time, period } = formatClock(date, NY)
  return `${time} ${period}`
}

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(deviceTime)
  })

  afterEach(() => {
    vi.useRealTimers()
    openAt('/')
  })

  it('uses the device clock', () => {
    openAt('/')
    const { result } = renderHook(() => useNow())
    expect(result.current.now.getTime()).toBe(deviceTime.getTime())
    expect(clockText(result.current.now)).toBe('11:36 AM')
  })

  it('keeps following the device clock as time passes', () => {
    openAt('/')
    const { result } = renderHook(() => useNow())
    act(() => {
      vi.advanceTimersByTime(5 * 60_000)
    })
    expect(clockText(result.current.now)).toBe('11:41 AM')
  })

  it('ignores a ?now= query and keeps the device clock', () => {
    openAt('/?now=23:30')
    const { result } = renderHook(() => useNow())
    expect(clockText(result.current.now)).toBe('11:36 AM')
  })
})
