import { createClient } from '@supabase/supabase-js';
// Run with Bun, which loads .env. No password is printed or accepted as a CLI argument.
const url = process.env.NUXT_SUPABASE_URL, key = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY;
const username = process.env.ADMIN_USERNAME?.trim().toLowerCase(), password = process.env.ADMIN_PASSWORD;
if (!url || !key || !username || !/^[a-z0-9_]{3,32}$/.test(username) || !password || password.length < 8) throw new Error('Isi konfigurasi Supabase dan ADMIN_USERNAME, ADMIN_PASSWORD (minimal 8 karakter), ADMIN_NAME melalui environment.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const existing = await client.from('profiles').select('id').eq('role', 'admin').eq('is_active', true).limit(1);
if (existing.error) throw new Error('Jalankan migrasi database terlebih dahulu.');
if (existing.data.length) throw new Error('Admin sudah ada. Buat akun berikutnya melalui halaman Pengguna.');
const result = await client.auth.admin.createUser({ email: `${username}@users.panen-iwak.invalid`, password, email_confirm: true, app_metadata: { username, name: process.env.ADMIN_NAME || username, role: 'admin' } });
if (result.error) throw new Error('Admin gagal dibuat. Periksa migrasi, username, dan kebijakan password Supabase.');
console.log(`Admin ${username} berhasil dibuat. Hapus ADMIN_PASSWORD dari environment setelah selesai.`);
