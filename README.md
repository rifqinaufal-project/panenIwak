# Panen Iwak

Aplikasi pencatatan perdagangan ikan berbasis Nuxt 4, Vue 3, TypeScript, dan Supabase. Perhitungan keuangan menggunakan Decimal.js.

## Menjalankan

```sh
bun install
bun run dev
```

Buka http://localhost:3000. Build produksi: `bun run build`.

Konfigurasi server melalui environment berikut (lokal di `.env`, produksi di pengaturan Vercel):

- `NUXT_SUPABASE_URL`
- `NUXT_SUPABASE_ANON_KEY`
- `NUXT_SUPABASE_SERVICE_ROLE_KEY` — rahasia, hanya di server.
- `NUXT_AUTH_RATE_SECRET` — rahasia acak untuk pembatasan percobaan autentikasi.

Terapkan seluruh file `supabase/migrations/` berurutan pada proyek Supabase sebelum menjalankan aplikasi. Push/deploy kode **tidak** otomatis menerapkan migrasi. Jangan commit `.env` atau service-role key.

## Fitur

- Login username/password, sesi cookie, otorisasi server, serta pengelolaan akun oleh admin.
- Dashboard, pembelian dan biaya dalam batch, penjualan multi-item, master ikan/size, laporan, dan ekspor CSV.
- HPP umum berdasarkan bobot beli; HPP efektif berdasarkan bobot terjual. Biaya perjalanan dialokasikan menurut bobot beli, bukan size penjualan.
- Koreksi/hapus transaksi, soft-delete batch, serta audit username dan data sebelum/sesudah.
- Rincian Log menampilkan hanya kolom yang berubah, dengan format rupiah/bobot dan penanda ditambahkan/diubah/dihapus. Transaksi dicocokkan berdasarkan ID; data lama yang tidak lengkap diberi keterangan, bukan ditebak. Field teknis dan kredensial tidak ditampilkan dalam ringkasan.
- Staf mengakses batch miliknya; admin mengakses seluruh batch. Endpoint server tetap memverifikasi izin, terpisah dari navigasi UI.
- Impor selektif data IndexedDB lama oleh admin. Data baru disimpan ke Supabase, bukan IndexedDB.

**Penting:** registrasi publik saat ini sengaja membuat akun admin sesuai keputusan produk. Batasi akses situs jika pendaftaran admin tidak boleh terbuka untuk umum.

## Navigasi

Menu memiliki URL tetap: `/dashboard`, `/batch`, `/produk`, `/laporan`, `/log`, `/pengguna`. `/` memilih halaman awal sesuai role; `/masuk` menampilkan login ketika belum ada sesi.

| Tampilan | URL |
| --- | --- |
| Batch baru | `/batch/baru` |
| Detail / kelola batch | `/batch/:id` / `/batch/:id/edit` |
| Pembelian / biaya / penjualan baru | `/batch/:id/pembelian/baru`, `/batch/:id/biaya/baru`, `/batch/:id/penjualan/baru` |
| Edit transaksi | `/batch/:id/transaksi/:itemId/edit` |
| Produk baru / edit | `/produk/baru` / `/produk/:id/edit` |

Back/Forward dan refresh mempertahankan tujuan URL. Login juga mempertahankan tautan yang diizinkan. Data tersimpan dimuat ulang dari server; **draft form hanya ada di memori**, bukan dipulihkan sesudah refresh. Perpindahan dari form yang berubah memerlukan konfirmasi; refresh/penutupan tab memakai peringatan bawaan browser bila didukung. Penyimpanan yang sedang berjalan memblokir perpindahan halaman.

`app/app.vue` menampung `NuxtPage`, halaman catch-all memvalidasi URL, dan `app/components/WorkspaceApp.vue` mempertahankan antarmuka serta state workspace selama navigasi. Logika keuangan dan pemetaan URL berada di `shared/utils/` agar bisa diuji tanpa browser.

## Pengujian

```sh
bun run typecheck
bun test
bunx playwright install chromium
bun run test:e2e
```

Tes browser membangun aplikasi produksi lalu menjalankannya di port 3101, pada ukuran desktop dan mobile. Semua API diintersep menggunakan data sintetis, termasuk operasi simpan; tes tidak memerlukan atau membuat akun/data produksi. Cakupan meliputi deep link, Back/Forward, refresh, akses staf, form belum tersimpan, kegagalan simpan, dan halaman/data yang tidak ditemukan.

Penyimpanan offline dan service worker/PWA belum tersedia. Jangan mengandalkan browser untuk menyimpan draft ketika tab ditutup atau aplikasi dihentikan sistem operasi.
