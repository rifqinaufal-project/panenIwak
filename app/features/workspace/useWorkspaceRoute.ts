import { computed, type Ref } from 'vue';
import type { Profile } from '#shared/types/auth';
import type { Batch, CatalogProduct, Item } from '#shared/types/workspace';
import {
  batchPath,
  canAccessPage,
  editProductPath,
  editTransactionPath,
  pagePath,
  resolveWorkspacePath,
  transactionPath,
  type WorkspacePage,
} from '#shared/utils/workspace-routes';

export function useWorkspaceRoute(data: {
  currentUser: Ref<Profile | null>;
  batches: Ref<Batch[]>;
  catalog: Ref<CatalogProduct[]>;
  ready: Ref<boolean>;
  workspaceError: Ref<string>;
}) {
  const route = useRoute(),
    router = useRouter();
  const resolved = computed(() => resolveWorkspacePath(route.path));
  const page = computed(() => resolved.value?.page ?? 'Dashboard');
  const active = computed(() => {
    const target = resolved.value;
    return target && 'batchId' in target
      ? data.batches.value.find((batch) => batch.id === target.batchId)
      : undefined;
  });
  const showForm = computed(() => resolved.value?.view === 'new-batch');
  const showProductForm = computed(() =>
    ['new-product', 'edit-product'].includes(resolved.value?.view ?? ''),
  );
  const editingProductId = computed(() =>
    resolved.value?.view === 'edit-product' ? resolved.value.productId : null,
  );
  const editingItemId = computed(() =>
    resolved.value?.view === 'edit-transaction' ? resolved.value.itemId : null,
  );
  const transaction = computed(() => {
    const target = resolved.value;
    if (target?.view === 'new-transaction') return target.kind;
    if (target?.view === 'edit-transaction')
      return active.value?.items.find((item) => item.id === target.itemId)?.kind ?? null;
    return null;
  });
  const managingBatch = computed(
    () =>
      resolved.value?.view === 'manage-batch' ||
      resolved.value?.view === 'edit-transaction' ||
      (resolved.value?.view === 'new-transaction' && resolved.value.kind !== 'sale'),
  );
  const transactionReturnPath = computed(() =>
    active.value ? batchPath(active.value.id, managingBatch.value) : pagePath('Batch'),
  );
  const issue = computed(() => {
    if (!data.ready.value || data.workspaceError.value || !data.currentUser.value) return '';
    const target = resolved.value;
    if (!target) return 'Halaman tidak ditemukan.';
    if (!canAccessPage(target.page, data.currentUser.value.role))
      return 'Anda tidak memiliki akses ke halaman ini.';
    if ('batchId' in target) {
      if (!active.value)
        return 'Batch tidak ditemukan atau Anda tidak memiliki akses. Batch mungkin sudah dihapus.';
      if (
        target.view === 'edit-transaction' &&
        !active.value.items.some((item) => item.id === target.itemId)
      )
        return 'Transaksi tidak ditemukan. Transaksi mungkin sudah dihapus.';
    }
    if (
      target.view === 'edit-product' &&
      !data.catalog.value.some((product) => product.id === target.productId)
    )
      return 'Produk tidak ditemukan. Produk mungkin sudah dihapus.';
    return '';
  });
  function go(name: WorkspacePage) {
    return router.push(
      pagePath(canAccessPage(name, data.currentUser.value?.role ?? 'field_staff') ? name : 'Batch'),
    );
  }
  function openBatch(batch: Batch) {
    return router.push(batchPath(batch.id));
  }
  function manageBatch() {
    if (active.value) return router.push(batchPath(active.value.id, true));
  }
  function startTransaction(kind: Item['kind']) {
    if (active.value) return router.push(transactionPath(active.value.id, kind));
  }
  function editItem(item: Item) {
    if (active.value) return router.push(editTransactionPath(active.value.id, item.id));
  }
  function editProduct(product: CatalogProduct) {
    return router.push(editProductPath(product.id));
  }
  function backFromBatch() {
    return router.push(
      transaction.value
        ? transactionReturnPath.value
        : managingBatch.value && active.value
          ? batchPath(active.value.id)
          : pagePath('Batch'),
    );
  }
  return {
    path: computed(() => route.path),
    resolved,
    page,
    active,
    showForm,
    showProductForm,
    editingProductId,
    editingItemId,
    transaction,
    managingBatch,
    transactionReturnPath,
    issue,
    go,
    openBatch,
    manageBatch,
    startTransaction,
    editItem,
    editProduct,
    backFromBatch,
  };
}
