import { createHmac } from 'node:crypto';
import { z } from 'zod';

export default defineEventHandler(async event => {
  const input = await validatedBody(event, z.object({
    name: z.string().trim().min(1).max(100),
    username: usernameSchema,
    password: passwordSchema,
  }));
  const config = backendConfig(event), admin = backend(event);
  const ip = getRequestIP(event, { xForwardedFor: Boolean(process.env.VERCEL) }) ?? 'unknown';
  for (const source of [`register:ip:${ip}`, `register:user:${input.username}`]) {
    const key = createHmac('sha256', config.authRateSecret).update(source).digest('hex');
    const attempt = await admin.rpc('consume_login_attempt', { p_key: key });
    if (attempt.error) throw createError({ statusCode: 503, statusMessage: 'Pendaftaran belum tersedia. Hubungi admin.' });
    if (!attempt.data) {
      setResponseHeader(event, 'Retry-After', 900);
      throw createError({ statusCode: 429, statusMessage: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' });
    }
  }
  // Open admin registration is intentional: role is fixed by server, not client input.
  const result = await admin.auth.admin.createUser({
    email: `${input.username}@users.panen-iwak.invalid`,
    password: input.password,
    email_confirm: true,
    app_metadata: { username: input.username, name: input.name, role: 'admin' },
  });
  if (result.error) {
    const code = result.error.code;
    console.error('[auth/register] Supabase rejected account creation', { code, status: result.error.status });
    const messages: Record<string, string> = {
      email_exists: 'Username sudah digunakan. Pilih username lain.',
      user_already_exists: 'Username sudah digunakan. Pilih username lain.',
      weak_password: 'Password ditolak oleh kebijakan Supabase. Gunakan minimal 8 karakter dan periksa pengaturan password Supabase.',
      email_address_invalid: 'Identitas internal akun ditolak Supabase. Hubungi pengelola untuk memeriksa konfigurasi Auth.',
      unexpected_failure: 'Supabase gagal membuat akun atau profil. Periksa Auth Logs dan migrasi database, terutama trigger auth_user_profile.',
      over_request_rate_limit: 'Terlalu banyak permintaan ke Supabase. Tunggu sebentar lalu coba kembali.',
    };
    throw createError({ statusCode: 400, statusMessage: messages[code ?? ''] ?? `Pembuatan akun ditolak Supabase (${code ?? result.error.status ?? 'unknown'}). Periksa Auth Logs di Supabase.` });
  }
  return { ok: true };
});
