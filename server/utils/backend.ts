import { createClient, type Session } from '@supabase/supabase-js';
import type { H3Event } from 'h3';
import type { Profile } from '../../shared/types/auth';
import { createHmac, timingSafeEqual } from 'node:crypto';

export function backendConfig(event: H3Event) {
  const config = useRuntimeConfig(event);
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.supabaseServiceRoleKey || config.authRateSecret.length < 32) {
    throw createError({ statusCode: 503, statusMessage: 'Konfigurasi Supabase belum lengkap. Hubungi administrator.' });
  }
  return config;
}
export function backend(event: H3Event) {
  const config = backendConfig(event);
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
export function authClient(event: H3Event) {
  const config = backendConfig(event);
  return createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
export function sessionBinding(event: H3Event, id: string, revision: number) {
  return createHmac('sha256', backendConfig(event).authRateSecret).update(`${id}:${revision}`).digest('hex');
}
export function setAuthCookies(event: H3Event, session: Session) {
  setCookie(event, 'pi_access', session.access_token, { ...cookieOptions, maxAge: session.expires_in });
  setCookie(event, 'pi_refresh', session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
}
export function clearAuthCookies(event: H3Event) {
  deleteCookie(event, 'pi_access', cookieOptions); deleteCookie(event, 'pi_refresh', cookieOptions);
  deleteCookie(event, 'pi_binding', cookieOptions);
}
export function bindAuthSession(event: H3Event, id: string, revision: number) {
  setCookie(event, 'pi_binding', sessionBinding(event, id, revision), { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
}
export async function requireProfile(event: H3Event): Promise<Profile> {
  if (event.context.profile) return event.context.profile;
  const client = authClient(event);
  let token = getCookie(event, 'pi_access');
  const verified = token ? await client.auth.getUser(token) : null;
  if (verified?.error && (!verified.error.status || verified.error.status >= 500)) throw createError({ statusCode: 503, statusMessage: 'Layanan autentikasi sedang tidak tersedia. Coba kembali.' });
  let user = verified?.data.user ?? null;
  if (!user) {
    const refresh = getCookie(event, 'pi_refresh');
    if (refresh) {
      const result = await client.auth.refreshSession({ refresh_token: refresh });
      if (result.error && (!result.error.status || result.error.status >= 500)) throw createError({ statusCode: 503, statusMessage: 'Sesi belum dapat diverifikasi. Coba kembali.' });
      if (result.data.session) { setAuthCookies(event, result.data.session); token = result.data.session.access_token; user = result.data.user; }
    }
  }
  if (!user) { clearAuthCookies(event); throw createError({ statusCode: 401, statusMessage: 'Silakan masuk kembali.' }); }
  const { data, error } = await backend(event).from('profiles').select('id,username,name,role,is_active,auth_revision').eq('id', user.id).single();
  if (error) throw createError({ statusCode: 503, statusMessage: 'Profil pengguna tidak dapat diverifikasi.' });
  if (!data?.is_active) { clearAuthCookies(event); throw createError({ statusCode: 403, statusMessage: 'Akun tidak aktif. Hubungi admin.' }); }
  const binding = getCookie(event, 'pi_binding') ?? '';
  const expected = sessionBinding(event, data.id, data.auth_revision);
  if (!/^[a-f0-9]{64}$/.test(binding) || !timingSafeEqual(Buffer.from(binding), Buffer.from(expected))) {
    clearAuthCookies(event); throw createError({ statusCode: 401, statusMessage: 'Sesi berakhir atau password telah direset. Silakan masuk kembali.' });
  }
  bindAuthSession(event, data.id, data.auth_revision);
  event.context.profile = data as Profile;
  event.context.accessToken = token;
  return data as Profile;
}
export async function requireAdmin(event: H3Event) {
  const profile = await requireProfile(event);
  if (profile.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin yang diizinkan.' });
  return profile;
}
export function databaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  const statusCode = error.message?.includes('VERSION_CONFLICT') ? 409 : error.code === '42501' ? 403 : error.code === '23505' ? 409 : 400;
  throw createError({ statusCode, statusMessage: statusCode === 409 ? 'Data sudah berubah atau sudah tersedia. Muat ulang sebelum mencoba kembali; input Anda tetap tersedia.' : statusCode === 403 ? 'Anda tidak memiliki akses untuk tindakan ini.' : 'Data tidak dapat disimpan. Periksa isian dan coba kembali.' });
}
