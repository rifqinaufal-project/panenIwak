import { ref } from 'vue';
import type { LegacyBatch } from '#shared/types/legacy-import';
import type { CatalogProduct } from '#shared/types/workspace';
import type { LegacyDestination, LegacySource } from './contracts';
import { requestErrorMessage } from '../../utils/request-error';

export function useLegacyImport(options: {
  source: LegacySource;
  destination: LegacyDestination;
  imported: () => void;
}) {
  const rows = ref<LegacyBatch[]>([]),
    products = ref<CatalogProduct[]>([]),
    selected = ref<string[]>([]);
  const viewed = ref(false),
    checking = ref(false),
    busy = ref(false);
  const includeProducts = ref(false),
    status = ref('');

  async function preview() {
    if (checking.value || busy.value) return;
    checking.value = true;
    status.value = '';
    viewed.value = true;
    rows.value = [];
    products.value = [];
    selected.value = [];
    includeProducts.value = false;
    try {
      const snapshot = await options.source.read();
      if (!snapshot) {
        status.value = 'Tidak ada database lokal lama di browser ini.';
        return;
      }
      rows.value = snapshot.batches;
      products.value = snapshot.products;
      status.value =
        'Pilih hanya data usaha Anda. Data contoh mungkin juga ada dalam daftar. Riwayat lama tidak diimpor atau diatribusikan ke akun.';
    } catch {
      status.value = 'Data lama tidak dapat dibaca. Data asli tidak diubah.';
    } finally {
      checking.value = false;
    }
  }
  async function importSelected() {
    if (
      busy.value ||
      checking.value ||
      !viewed.value ||
      (!selected.value.length && !includeProducts.value)
    )
      return;
    busy.value = true;
    status.value = '';
    let count = 0;
    try {
      if (includeProducts.value)
        for (const product of products.value) {
          await options.destination.addProduct({ ...product });
          count++;
        }
      const selectedIds = new Set(selected.value);
      for (const row of rows.value.filter((row) => selectedIds.has(row.id))) {
        await options.destination.saveBatch({
          ...row,
          items: row.items.map((item) => ({ ...item })),
          version: 0,
          destination: '',
          staff: '',
          closed: false,
        });
        selected.value = selected.value.filter((id) => id !== row.id);
        count++;
      }
      status.value = `${count} data berhasil diimpor. Data asli tetap tersimpan di browser lama. Nomor batch baru diberikan server.`;
    } catch (failure) {
      status.value = `${count} data berhasil diimpor. Proses dihentikan: ${requestErrorMessage(failure, 'koneksi terputus')}. Data lokal tidak dihapus. Retry tidak membuat duplikat ID.`;
    } finally {
      busy.value = false;
      options.imported();
    }
  }
  return {
    rows,
    products,
    selected,
    viewed,
    checking,
    busy,
    includeProducts,
    status,
    preview,
    importSelected,
  };
}
