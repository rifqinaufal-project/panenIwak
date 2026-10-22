import { ref, type Ref } from 'vue';
import type { Batch } from '#shared/types/workspace';
import { pagePath } from '#shared/utils/workspace-routes';
import type { Feedback, FinishNavigation, WorkspaceRepository } from '../workspace/contracts';

export function useBatchOperations(options: {
  repository: WorkspaceRepository;
  batches: Ref<Batch[]>;
  active: Ref<Batch | undefined>;
  online: Ref<boolean>;
  feedback: Feedback;
  refreshActivity: () => Promise<void>;
  finishNavigation: FinishNavigation;
}) {
  const saving = ref(false),
    deleting = ref(false),
    error = ref('');
  async function persist(batch: Batch) {
    if (saving.value || deleting.value) return false;
    saving.value = true;
    try {
      if (!options.online.value) {
        error.value =
          'Belum tersimpan: sambungkan internet untuk menyimpan ke server. Input tetap tersedia.';
        return false;
      }
      const saved = await options.repository.saveBatch(batch);
      Object.assign(batch, saved);
      options.batches.value = options.batches.value.some((row) => row.id === saved.id)
        ? options.batches.value.map((row) => (row.id === saved.id ? saved : row))
        : [saved, ...options.batches.value];
      await options.refreshActivity();
      return true;
    } catch (failure) {
      error.value = options.feedback.requestMessage(failure);
      return false;
    } finally {
      saving.value = false;
    }
  }
  async function remove() {
    const batch = options.active.value;
    if (!batch || saving.value || deleting.value) return;
    if (
      !(await options.feedback.confirm({
        title: 'Hapus batch ini?',
        message: `${batch.code} · ${batch.origin} beserta seluruh pembelian, biaya, dan penjualannya akan dikeluarkan dari daftar dan laporan. Riwayat tetap disimpan. Tidak ada tombol pulihkan di aplikasi.`,
        label: 'Ya, hapus batch',
      }))
    )
      return;
    if (options.active.value?.id !== batch.id) return;
    deleting.value = true;
    error.value = '';
    try {
      await options.repository.deleteBatch(batch);
      options.batches.value = options.batches.value.filter((row) => row.id !== batch.id);
      await options.finishNavigation(pagePath('Batch'));
      await options.refreshActivity();
      options.feedback.notify('Batch dihapus dari daftar dan laporan.');
    } catch (failure) {
      error.value = options.feedback.requestMessage(failure);
    } finally {
      deleting.value = false;
    }
  }
  return { saving, deleting, error, persist, remove };
}
