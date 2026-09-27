import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sayHeyMirror, stubWakeRecognition } from '../../test/stubWakeRecognition'
import { VoiceButton, type VoiceUiEvent } from './VoiceButton'

describe('VoiceButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('labels the idle button Hey Mirror without a say-this prompt', () => {
    const { getByRole, queryByText } = render(<VoiceButton onEvents={() => {}} />)
    expect(getByRole('button', { name: 'Hey Mirror' })).toBeInTheDocument()
    expect(getByRole('button', { name: 'Hey Mirror' }).textContent).toBe('Hey Mirror')
    expect(queryByText('Say Hey Mirror')).not.toBeInTheDocument()
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

    stubWakeRecognition()
    render(<VoiceButton onEvents={onEvents} />)
    await waitFor(() => sayHeyMirror('see my route'))

    await waitFor(() =>
      expect(onEvents).toHaveBeenCalledWith([{ action: 'expandWidget', target: 'maps' }]),
    )
  })

  it('opens the screen from a streamed expand line before the spoken reply finishes', async () => {
    const onEvents = vi.fn<(events: VoiceUiEvent[]) => void>()
    const encoder = new TextEncoder()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (!String(input).includes('/api/assistant')) {
          return { ok: false, json: async () => ({ ok: false, error: { status: 'not-configured' } }) }
        }
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({ type: 'ui', uiEvents: [{ action: 'expandWidget', target: 'weather' }] })}\n`,
              ),
            )
            queueMicrotask(() => {
              controller.enqueue(
                encoder.encode(
                  `${JSON.stringify({ type: 'done', ok: true, data: { spokenText: 'Rain this evening.', uiEvents: [] } })}\n`,
                ),
              )
              controller.close()
            })
          },
        })
        return new Response(stream, { headers: { 'content-type': 'application/x-ndjson' } })
      }),
    )

    stubWakeRecognition()
    render(<VoiceButton onEvents={onEvents} />)
    await waitFor(() => sayHeyMirror('expand weather'))
    await waitFor(() =>
      expect(onEvents).toHaveBeenCalledWith([{ action: 'expandWidget', target: 'weather' }]),
    )
  })
})
