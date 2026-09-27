import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sayHeyMirror, stubWakeRecognition } from '../../test/stubWakeRecognition'
import { VoiceButton, type VoiceUiEvent } from './VoiceButton'

describe('VoiceButton', () => {
  afterEach(() => {
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

    stubWakeRecognition()
    render(<VoiceButton onEvents={onEvents} />)
    await waitFor(() => sayHeyMirror('see my route'))

    await waitFor(() =>
      expect(onEvents).toHaveBeenCalledWith([{ action: 'expandWidget', target: 'maps' }]),
    )
  })
})
