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
  const status = typeof res.status === 'number' ? res.status : 200
  return isHtmlResponse(res) || status >= 500
}
