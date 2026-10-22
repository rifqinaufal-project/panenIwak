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

`app/app.vue` menampung `NuxtPage`, halaman catch-all memvalidasi URL, dan `app/components/WorkspaceApp.vue` merangkai antarmuka workspace selama navigasi.

## Arsitektur workspace

Pemisahan berdasarkan tanggung jawab dan arah dependency, bukan sekadar panjang file:

| Bagian | Lokasi | Tanggung jawab |
| --- | --- | --- |
| Domain | `shared/types/workspace.ts`, `shared/utils/finance.ts`, `shared/utils/transactions.ts` | Model transaksi, perhitungan Decimal, validasi, dan aturan koreksi transaksi. Tanpa Vue, HTTP, router, atau browser. |
| Kontrak repository | `app/features/{workspace,auth,users,legacy-import}/contracts.ts` | Operasi data yang dibutuhkan controller, tanpa mengetahui `$fetch`, Supabase, atau Dexie. |
| Controller fitur | `app/features/{batches,products,dashboard,reports,auth,users,legacy-import}/` | State reaktif, alur simpan/hapus, dan koordinasi validasi dengan repository yang diinjeksi. |
| Infrastruktur HTTP | `app/repositories/{workspace,auth,users}-http.ts` | Implementasi kontrak repository dan pemetaan payload endpoint. |
| Infrastruktur data lama | `app/repositories/legacy-indexeddb.ts` | Membaca snapshot IndexedDB dengan transaksi read-only, memeriksa struktur data, dan menutup koneksi. |
| Koordinasi workspace | `app/features/workspace/` | Sesi, data, routing, notifikasi, dan perlindungan isian belum tersimpan. |
| Composition root | `app/features/workspace/useWorkspace.ts`, `app/composables/use{LoginScreen,UsersPanel,LegacyImportPanel}.ts` | Memilih adapter, menghubungkan controller, lifecycle, dan event komponen; bukan tempat aturan bisnis baru. |
| Presentasi | `app/components/WorkspaceApp.vue` dan komponen fitur di `app/components/` | Merangkai layar, input, dan aksi pengguna. Tidak mengakses repository/HTTP langsung. |

Alur utamanya: **tampilan → controller → kontrak repository ← adapter HTTP**. Controller menggunakan aturan domain; domain tidak bergantung pada controller atau tampilan. Adapter tetap memanggil API Nuxt yang memverifikasi izin di server—validasi klien bukan pengganti otorisasi server.

State dibuat per instance workspace, bukan singleton lintas akun/request SSR. Perpindahan URL menginisialisasi form fitur tujuan dan baseline perubahan; kegagalan simpan tidak menghapus draft. Format rupiah/bobot/tanggal dan mekanisme unduh CSV berada di `app/utils/`.

`LoginScreen.vue`, `UsersPanel.vue`, dan `LegacyImport.vue` juga tidak mengakses HTTP/IndexedDB langsung. Login/registrasi serta sesi menggunakan kontrak autentikasi yang sama; tabel dan formulir akun terpisah di `app/components/users/`. Konfirmasi dialog memakai referensi per instance, bukan state global.

Impor lama tetap selektif dan tidak mengubah/menghapus database sumber maupun mengatribusikan log lama ke akun. Struktur yang tidak dapat dibaca ditolak dengan pesan jelas, bukan dilewati diam-diam atau dibuatkan nilai pengganti. Impor berhenti pada kegagalan; batch yang berhasil dilepas dari pilihan, sedangkan sisanya tetap dipilih untuk retry dengan ID asli. Refresh workspace setelah impor berjalan di latar belakang agar panel, hasil, pilihan retry, dan draft akun tidak terhapus.

Password hanya berada di memori formulir dan payload permintaan, tidak disimpan di storage atau log. Password dibersihkan setelah operasi berhasil atau formulir dibatalkan. Kebijakan registrasi admin, verifikasi izin server, endpoint backend, dan migrasi Supabase tidak diubah oleh refactor ini.

`tests/architecture.test.ts` menjaga batas dependency seluruh komponen dan controller. Tes domain/controller di `tests/` memakai repository pengganti tanpa mount Vue atau request HTTP, termasuk kegagalan akun, perlindungan password, serta impor parsial/retry.

## Pengujian

```sh
bun run typecheck
bun test
bunx playwright install chromium
bun run test:e2e
```

Tes browser membangun aplikasi produksi lalu menjalankannya di port 3101, pada ukuran desktop dan mobile. Semua API diintersep menggunakan data sintetis, termasuk operasi simpan; tes tidak memerlukan atau membuat akun/data produksi. Fixture API bersama berada di `e2e/fixtures/workspace.ts`. Cakupan meliputi deep link, Back/Forward, refresh, akses staf, form belum tersimpan, kegagalan simpan, akun/reset password, serta impor selektif/parsial dari IndexedDB sintetis dengan pemeriksaan bahwa sumber tidak berubah.

Penyimpanan offline dan service worker/PWA belum tersedia. Jangan mengandalkan browser untuk menyimpan draft ketika tab ditutup atau aplikasi dihentikan sistem operasi.
