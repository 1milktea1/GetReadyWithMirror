type FetchLike = {
  status?: number
  headers?: { get?: (name: string) => string | null }
}

/** Vercel static 404s are HTML. Missing headers (tests, some proxies) are not. */
export function isHtmlResponse(res: FetchLike): boolean {
  const type = res.headers?.get?.('content-type')
  return typeof type === 'string' && type.includes('text/html')
}

/** True when the host returned a page or a crashed function — use the fixture path. */
export function shouldUseLocalApiFallback(res: FetchLike): boolean {
  if (isHtmlResponse(res)) return true
  const status = typeof res.status === 'number' ? res.status : 200
  if (status >= 500) return true
  const type = res.headers?.get?.('content-type') ?? ''
  // Missing Vercel functions are `text/plain` 404, not HTML.
  return status === 404 && type.includes('text/plain')
}
