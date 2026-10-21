export default defineNuxtConfig({
  compatibilityDate: '2026-10-20',
  devtools: { enabled: false },
  runtimeConfig: { supabaseUrl: '', supabaseAnonKey: '', supabaseServiceRoleKey: '', authRateSecret: '' },
  typescript: { tsConfig: { compilerOptions: { types: ['node'] } } },
  vite: { optimizeDeps: { include: ['@tabler/icons-vue', 'decimal.js', 'dexie'] } },
  css: ['@fontsource-variable/dm-sans', '~/assets/main.css', '~/assets/transaction-actions.css', '~/assets/workspace.css'],
  app: { head: { title: 'Panen Iwak — Catatan perjalanan, hasil yang jelas.', htmlAttrs: { lang: 'id' }, meta: [{ name: 'description', content: 'Kelola pembelian, biaya perjalanan, dan penjualan ikan dalam satu batch.' }] } },
})
