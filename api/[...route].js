const API_PREFIX = '/api';

export default async function handler(req, res) {
  const configuredOrigin = process.env.TRUSTRANK_API_ORIGIN;
  if (!configuredOrigin) {
    res.status(503).json({ error: { message: 'The TrustRank API is not configured yet.' } });
    return;
  }

  let target;
  try {
    const origin = new URL(configuredOrigin);
    if (!['https:', 'http:'].includes(origin.protocol) || origin.pathname !== '/') {
      throw new Error('TRUSTRANK_API_ORIGIN must be a service origin without a path.');
    }
    const requestUrl = new URL(req.url, 'http://localhost');
    const route = requestUrl.pathname.replace(/^\/api\/?/, '');
    target = new URL(`${API_PREFIX}/${route}${requestUrl.search}`, origin);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
    return;
  }

  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'cookie', 'origin', 'idempotency-key', 'authorization']) {
    const value = req.headers[name];
    if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }

  const options = { method: req.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(req.method)) {
    options.body = req.body === undefined ? undefined : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(target, options);
    res.status(upstream.status);
    res.setHeader('Cache-Control', 'no-store');
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    const cookies = upstream.headers.getSetCookie?.();
    if (cookies?.length) res.setHeader('Set-Cookie', cookies);
    else {
      const cookie = upstream.headers.get('set-cookie');
      if (cookie) res.setHeader('Set-Cookie', cookie);
    }
    const body = Buffer.from(await upstream.arrayBuffer());
    res.end(body);
  } catch {
    res.status(502).json({ error: { message: 'The TrustRank API is temporarily unavailable.' } });
  }
}
