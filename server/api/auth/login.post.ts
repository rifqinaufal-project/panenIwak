import { createHash } from 'node:crypto';
import { z } from 'zod';
export default defineEventHandler(async event => {
  const input = await validatedBody(event, z.object({ username: usernameSchema, password: z.string().min(1).max(128) }));
  const config = backendConfig(event), admin = backend(event);
  const ip = getRequestIP(event, { xForwardedFor: Boolean(process.env.VERCEL) }) ?? 'unknown';
  for (const source of [`ip:${ip}`, `user:${input.username}`]) {
    const key = createHash('sha256').update(config.authRateSecret + source).digest('hex');
    const result = await admin.rpc('consume_login_attempt', { p_key: key });
    if (result.error) throw createError({ statusCode: 503, statusMessage: 'Layanan login belum siap. Hubungi admin.' });
    if (!result.data) { setResponseHeader(event, 'Retry-After', 900); throw createError({ statusCode: 429, statusMessage: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }); }
  }
  const { data, error } = await authClient(event).auth.signInWithPassword({ email: `${input.username}@users.panen-iwak.invalid`, password: input.password });
  if (error && (!error.status || error.status >= 500)) throw createError({ statusCode: 503, statusMessage: 'Layanan login sedang tidak tersedia. Coba kembali.' });
  if (error || !data.session) throw createError({ statusCode: 401, statusMessage: 'Username atau password salah.' });
  const { data: profile } = await admin.from('profiles').select('id,username,name,role,is_active,auth_revision').eq('id', data.user.id).single();
  if (!profile?.is_active) throw createError({ statusCode: 401, statusMessage: 'Username atau password salah, atau akun tidak aktif.' });
  const logged = await admin.rpc('record_auth_event', { p_actor: profile.id, p_action: 'Login', p_detail: 'Berhasil masuk ke aplikasi' });
  databaseError(logged.error);
  setAuthCookies(event, data.session);
  bindAuthSession(event, profile.id, profile.auth_revision);
  return { user: profile };
});
