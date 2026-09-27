import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VoiceButton, type VoiceUiEvent } from './VoiceButton'

describe('VoiceButton', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('applies Grok expand events from a Hey Mirror turn', async () => {
    const onEvents = vi.fn<(events: VoiceUiEvent[]) => void>()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/assistant')) {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              data: {
                spokenText: 'Here is your route.',
                uiEvents: [{ action: 'expandWidget', target: 'maps' }],
              },
            }),
          }
        }
        return { ok: false, json: async () => ({ ok: false, error: { status: 'not-configured' } }) }
      }),
    )

    render(<VoiceButton onEvents={onEvents} />)
    fireEvent.change(screen.getByLabelText('Type instead'), { target: { value: 'see my route' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }))

    await waitFor(() =>
      expect(onEvents).toHaveBeenCalledWith([{ action: 'expandWidget', target: 'maps' }]),
    )
  })

  it('keeps listening for about 3 seconds after Hey Mirror before acting', async () => {
    vi.useFakeTimers()
    const onEvents = vi.fn<(events: VoiceUiEvent[]) => void>()
    stubAssistantExpand()
    const recognition = installFakeRecognition()

    render(<VoiceButton onEvents={onEvents} />)
    expect(recognition.active?.onresult).toBeTruthy()
    act(() => {
      recognition.active!.onresult!({
        results: [{ isFinal: true, 0: { transcript: 'hey mirror' } }],
      })
    })
    expect(screen.getByText('Listening')).toBeInTheDocument()
    expect(onEvents).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    act(() => {
      recognition.active!.onresult!({
        results: [
          { isFinal: true, 0: { transcript: 'hey mirror' } },
          { isFinal: true, 0: { transcript: 'see my route' } },
        ],
      })
    })
    expect(onEvents).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2999)
    })
    expect(onEvents).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(onEvents).toHaveBeenCalledWith([{ action: 'expandWidget', target: 'maps' }])
    vi.useRealTimers()
  })

  it('still hears the request after SpeechRecognition restarts between Hey Mirror and the command', async () => {
    vi.useFakeTimers()
    const onEvents = vi.fn<(events: VoiceUiEvent[]) => void>()
    stubAssistantExpand()
    const recognition = installFakeRecognition()

    render(<VoiceButton onEvents={onEvents} />)
    act(() => {
      recognition.active!.onresult!({
        results: [{ isFinal: true, 0: { transcript: 'hey mirror' } }],
      })
    })
    act(() => {
      recognition.active!.onend?.()
    })
    expect(recognition.active?.onresult).toBeTruthy()
    act(() => {
      recognition.active!.onresult!({
        results: [{ isFinal: true, 0: { transcript: 'see my route' } }],
      })
    })
    expect(onEvents).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(onEvents).toHaveBeenCalledWith([{ action: 'expandWidget', target: 'maps' }])
    vi.useRealTimers()
  })
})

function stubAssistantExpand() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      if (!String(input).includes('/api/assistant')) {
        return { ok: false, json: async () => ({ ok: false, error: { status: 'not-configured' } }) }
      }
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            spokenText: 'Here is your route.',
            uiEvents: [{ action: 'expandWidget', target: 'maps' }],
          },
        }),
      }
    }),
  )
}

function installFakeRecognition() {
  class FakeRecognition {
    onresult: ((event: { results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null =
      null
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
  FakeRecognition.active = null
  vi.stubGlobal('SpeechRecognition', FakeRecognition)
  vi.stubGlobal('webkitSpeechRecognition', FakeRecognition)
  return FakeRecognition
}
