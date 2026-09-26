// Shared Web-Request adapter for Vercel /api handlers and the laptop Express app.
// Feature HTTP functions stay { status, body }; this file only wraps them.

type FeatureResult = { status: number; body: unknown };

export async function handleVercelGet(
  request: Request,
  handler: (query: URLSearchParams) => Promise<FeatureResult> | FeatureResult,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const result = await handler(url.searchParams);
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Vercel API handler failed', error);
    return Response.json(
      { ok: false, error: { status: 'no-data', message: 'The API could not run on this host.' } },
      { status: 500 },
    );
  }
}
