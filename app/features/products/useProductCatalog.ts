import { reactive, ref, type Ref } from 'vue';
import type { CatalogProduct } from '#shared/types/workspace';
import { validateCatalogProduct } from '#shared/utils/transactions';
import { pagePath } from '#shared/utils/workspace-routes';
import type { Feedback, FinishNavigation, WorkspaceRepository } from '../workspace/contracts';

export function useProductCatalog(options: {
  repository: WorkspaceRepository;
  catalog: Ref<CatalogProduct[]>;
  editingId: Ref<string | null>;
  online: Ref<boolean>;
  feedback: Feedback;
  finishNavigation: FinishNavigation;
  refreshActivity: () => Promise<void>;
}) {
  const form = reactive({ fish: '', size: '' });
  const saving = ref(false),
    error = ref('');
  function reset() {
    const product = options.catalog.value.find((product) => product.id === options.editingId.value);
    Object.assign(form, { fish: product?.fish ?? '', size: product?.size ?? '' });
    error.value = '';
  }
  function snapshot() {
    return JSON.stringify(form);
  }
  async function save() {
    if (saving.value) return;
    error.value = validateCatalogProduct(form, options.catalog.value, options.editingId.value);
    if (error.value) return;
    const product = {
      id: options.editingId.value ?? crypto.randomUUID(),
      fish: form.fish.trim(),
      size: form.size.trim(),
    };
    saving.value = true;
    try {
      if (!options.online.value) throw new Error('offline');
      if (options.editingId.value) {
        await options.repository.editProduct(product);
        options.catalog.value = options.catalog.value.map((row) =>
          row.id === product.id ? product : row,
        );
      } else {
        const saved = await options.repository.addProduct(product);
        if (!options.catalog.value.some((row) => row.id === saved.id))
          options.catalog.value.push(saved);
      }
      await options.refreshActivity();
      await options.finishNavigation(pagePath('Produk'));
      options.feedback.notify('Produk tersimpan di server.');
    } catch (failure) {
      error.value = !options.online.value
        ? 'Sambungkan internet untuk menyimpan produk. Isian tetap tersedia.'
        : options.feedback.requestMessage(failure);
    } finally {
      saving.value = false;
    }
  }
  async function remove(product: CatalogProduct) {
    if (saving.value) return;
    if (
      !(await options.feedback.confirm({
        title: 'Hapus produk ikan?',
        message: `${product.fish} · Size ${product.size} akan dihapus dari master produk. Transaksi batch lama tidak berubah.`,
        label: 'Ya, hapus produk',
      }))
    )
      return;
    saving.value = true;
    error.value = '';
    try {
      await options.repository.deleteProduct(product.id);
      options.catalog.value = options.catalog.value.filter((row) => row.id !== product.id);
      await options.refreshActivity();
      options.feedback.notify('Produk ikan dihapus.');
    } catch (failure) {
      error.value = options.feedback.requestMessage(failure);
    } finally {
      saving.value = false;
    }
  }
  return { form, saving, error, reset, snapshot, save, remove };
}
