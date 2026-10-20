export default defineEventHandler(event => {
  if (!event.path.startsWith('/api/')) return;
  setResponseHeader(event, 'Cache-Control', 'no-store');
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff');
  setResponseHeader(event, 'Referrer-Policy', 'same-origin');
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.method)) {
    const origin = getHeader(event, 'origin');
    const host = getHeader(event, process.env.VERCEL ? 'x-forwarded-host' : 'host');
    if (!origin || new URL(origin).host !== host) throw createError({ statusCode: 403, statusMessage: 'Permintaan lintas situs tidak diizinkan.' });
    if (!getHeader(event, 'content-type')?.startsWith('application/json')) throw createError({ statusCode: 415, statusMessage: 'Gunakan JSON.' });
  }
});
