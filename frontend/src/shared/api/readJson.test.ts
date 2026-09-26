import { describe, expect, it } from 'vitest'
import { isHtmlResponse, shouldUseLocalApiFallback } from './readJson'

describe('API response guards', () => {
  it('treats a missing content-type as JSON, not HTML', () => {
    expect(isHtmlResponse({})).toBe(false)
    expect(shouldUseLocalApiFallback({})).toBe(false)
  })

  it('falls back on HTML 404s and crashed functions', () => {
    const html = new Response('<!doctype html>', { status: 404, headers: { 'content-type': 'text/html' } })
    expect(isHtmlResponse(html)).toBe(true)
    expect(shouldUseLocalApiFallback(html)).toBe(true)
    expect(shouldUseLocalApiFallback({ status: 500, headers: { get: () => 'application/json' } })).toBe(true)
    const missing = new Response('The page could not be found\n\nNOT_FOUND\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
    expect(shouldUseLocalApiFallback(missing)).toBe(true)
  })
})
