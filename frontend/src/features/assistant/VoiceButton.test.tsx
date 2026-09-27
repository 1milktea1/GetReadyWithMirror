import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

    render(<VoiceButton onEvents={onEvents} />)
    fireEvent.change(screen.getByLabelText('Type instead'), { target: { value: 'see my route' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }))

    await waitFor(() =>
      expect(onEvents).toHaveBeenCalledWith([{ action: 'expandWidget', target: 'maps' }]),
    )
  })
})
