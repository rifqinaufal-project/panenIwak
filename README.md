# Panen Iwak

Prototipe antarmuka Nuxt 4, Vue 3, dan TypeScript berdasarkan `PRD Confirmation.md`.

## Menjalankan

```sh
bun install
bun run dev
```

Buka http://localhost:3000. Build produksi: `bun run build`.

## Tersedia

- Dashboard responsif, filter periode/status, grafik dari transaksi, dan ekspor CSV.
- Daftar/detail batch, pembuatan batch, input pembelian/biaya/penjualan di halaman.
- Penyimpanan lokal IndexedDB melalui Dexie; nilai keuangan dihitung dengan Decimal.js.
- Data awal contoh, indikator koneksi, validasi, serta pemberitahuan kegagalan penyimpanan.

## Batasan prototipe

Belum terhubung Supabase: tidak ada autentikasi, otorisasi server, sinkronisasi, audit, atau penutupan batch final. Halaman pengguna hanya contoh. Data lokal belum dipisahkan per akun karena belum ada login. Jangan gunakan untuk data bisnis produksi atau di perangkat bersama. Service worker/PWA belum diaktifkan; penyimpanan lokal tidak berarti aplikasi dapat dibuka ulang tanpa jaringan. Semua batch awal adalah data demo, termasuk status selesai. Penutupan baru diblokir sampai backend diimplementasikan.
