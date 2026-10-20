<script setup lang="ts">
import Dexie from 'dexie';
const emit = defineEmits<{ imported: [] }>();
const rows = ref<any[]>([]), products = ref<any[]>([]), selected = ref<string[]>([]);
const viewed = ref(false), busy = ref(false), includeProducts = ref(false), status = ref('');
async function preview() {
  status.value = ''; viewed.value = true;
  if (!await Dexie.exists('panen-iwak-demo-v1')) { status.value = 'Tidak ada database lokal lama di browser ini.'; return; }
  const db = new Dexie('panen-iwak-demo-v1');
  try {
    await db.open(); rows.value = await db.table('batches').toArray();
    if (db.tables.some(t => t.name === 'products')) products.value = await db.table('products').toArray();
    status.value = 'Pilih hanya data usaha Anda. Data contoh mungkin juga ada dalam daftar. Riwayat lama tidak diimpor atau diatribusikan ke akun.';
  } catch { status.value = 'Data lama tidak dapat dibaca. Data asli tidak diubah.'; }
  finally { db.close(); }
}
async function importSelected() {
  if (busy.value) return;
  busy.value = true; status.value = '';
  let count = 0;
  try {
    if (includeProducts.value) for (const p of products.value) { await $fetch('/api/products/save', { method: 'POST', body: { id: p.id, fish: p.fish, size: p.size } }); count++; }
    for (const b of rows.value.filter(row => selected.value.includes(row.id))) {
      await $fetch('/api/batches/save', { method: 'POST', body: { id: b.id, origin: b.origin, date: b.date, items: b.items, version: 0 } });
      selected.value = selected.value.filter(id => id !== b.id); count++;
    }
    status.value = `${count} data berhasil diimpor. Data asli tetap tersimpan di browser lama. Nomor batch baru diberikan server.`;
  } catch (e: any) { status.value = `${count} data berhasil diimpor. Proses dihentikan: ${e.data?.statusMessage || 'koneksi terputus'}. Data lokal tidak dihapus. Retry tidak membuat duplikat ID.`; }
  finally { busy.value = false; emit('imported'); }
}
</script>
<template>
  <section class="legacy-import"><h2>Data lokal sebelum login</h2><p>Data lama tidak otomatis dimasukkan ke akun mana pun. Admin dapat memeriksa dan memilih data milik usaha ini. Impor memerlukan internet dan akan tercatat atas username admin saat ini.</p><button v-if="!viewed" class="secondary" @click="preview">Periksa data lama</button><template v-else><p role="status">{{ status }}</p><div v-for="row in rows" :key="row.id" class="legacy-row"><label><input v-model="selected" type="checkbox" :value="row.id" :disabled="busy" />{{ row.code }} · {{ row.origin }} · {{ row.date }} · {{ row.items?.length || 0 }} transaksi</label></div><label v-if="products.length" class="legacy-row"><input v-model="includeProducts" type="checkbox" :disabled="busy" /> Sertakan {{ products.length }} master produk lokal</label><button class="primary" :disabled="busy || (!selected.length && !includeProducts)" @click="importSelected">{{ busy ? 'Mengimpor…' : 'Impor data terpilih' }}</button></template></section>
</template>
