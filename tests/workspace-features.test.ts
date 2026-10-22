import { describe, expect, test } from 'bun:test';
import { computed, ref } from 'vue';
import type { Batch, WorkspaceData } from '../shared/types/workspace';
import type { Feedback, WorkspaceRepository } from '../app/features/workspace/contracts';
import { useBatchOperations } from '../app/features/batches/useBatchOperations';
import { useBatchDraft } from '../app/features/batches/useBatchDraft';
import { useBatchTransactions } from '../app/features/batches/useBatchTransactions';
import { useProductCatalog } from '../app/features/products/useProductCatalog';
import { useWorkspaceData } from '../app/features/workspace/useWorkspaceData';

const batch: Batch = {
  id: 'b1',
  code: 'PI-0018',
  origin: 'Lamongan',
  date: '2026-10-22',
  destination: '',
  staff: '',
  closed: false,
  version: 1,
  items: [
    {
      id: 'p1',
      kind: 'purchase',
      fish: 'Nila',
      size: '8–10',
      weight: '100',
      price: '20000',
      date: '2026-10-22',
      description: '',
    },
  ],
};
function fixture() {
  const state = { fail: false, confirmed: true, writes: 0, events: [] as string[] };
  const data: WorkspaceData = {
    batches: [structuredClone(batch)],
    products: [{ id: 'prod1', fish: 'Nila', size: '8–10' }],
    logs: [],
  };
  const write = async () => {
    state.writes++;
    if (state.fail) throw { status: 503, data: { statusMessage: 'Server contoh tidak tersedia.' } };
  };
  const repository: WorkspaceRepository = {
    async load() {
      return structuredClone(data);
    },
    async saveBatch(document) {
      await write();
      return {
        ...document,
        items: document.items.map((item) => ({ ...item })),
        code: 'PI-0018',
        version: 2,
      };
    },
    async deleteBatch() {
      await write();
    },
    async addProduct(product) {
      await write();
      return product;
    },
    async editProduct() {
      await write();
    },
    async deleteProduct() {
      await write();
    },
  };
  const feedback: Feedback = {
    async confirm() {
      return state.confirmed;
    },
    notify(message) {
      state.events.push(message);
    },
    requestMessage() {
      return 'Server contoh tidak tersedia.';
    },
  };
  const batches = ref(structuredClone(data.batches)),
    catalog = ref(structuredClone(data.products)),
    online = ref(true);
  const active = computed(() => batches.value[0]);
  const finishNavigation = async (path: string) => {
    state.events.push(`navigate:${path}`);
  };
  const refreshActivity = async () => {
    state.events.push('refresh-log');
  };
  const options = {
    repository,
    batches,
    catalog,
    online,
    active,
    feedback,
    finishNavigation,
    refreshActivity,
  };
  return { state, options };
}

describe('feature controllers with injected repositories (no mounted component or HTTP)', () => {
  test('batch persistence updates the server-confirmed document and version only after success', async () => {
    const { state, options } = fixture();
    const controller = useBatchOperations(options);
    const document = { ...options.batches.value[0]!, origin: 'Gresik' };
    state.fail = true;
    expect(await controller.persist(document)).toBe(false);
    expect(options.batches.value[0]?.origin).toBe('Lamongan');
    expect(controller.error.value).toContain('Server contoh');
    expect(controller.saving.value).toBe(false);
    state.fail = false;
    expect(await controller.persist(document)).toBe(true);
    expect(options.batches.value[0]?.origin).toBe('Gresik');
    expect(options.batches.value[0]?.version).toBe(2);
  });
  test('offline persistence cannot call the repository or discard existing data', async () => {
    const { state, options } = fixture();
    options.online.value = false;
    const controller = useBatchOperations(options);
    expect(await controller.persist(structuredClone(batch))).toBe(false);
    expect(state.writes).toBe(0);
    expect(options.batches.value).toHaveLength(1);
  });
  test('cancelled deletion never writes; confirmed deletion waits for server success', async () => {
    const { state, options } = fixture();
    const controller = useBatchOperations(options);
    state.confirmed = false;
    await controller.remove();
    expect(state.writes).toBe(0);
    state.confirmed = true;
    state.fail = true;
    await controller.remove();
    expect(options.batches.value).toHaveLength(1);
    state.fail = false;
    await controller.remove();
    expect(options.batches.value).toHaveLength(0);
    expect(state.events).toContain('navigate:/batch');
  });
  test('product failure retains form/list and does not navigate; success edits the selected record', async () => {
    const { state, options } = fixture();
    const controller = useProductCatalog({ ...options, editingId: ref('prod1') });
    controller.reset();
    controller.form.fish = 'Lele';
    state.fail = true;
    await controller.save();
    expect(controller.form.fish).toBe('Lele');
    expect(options.catalog.value[0]?.fish).toBe('Nila');
    expect(state.events).toEqual([]);
    expect(controller.saving.value).toBe(false);
    state.fail = false;
    await controller.save();
    expect(options.catalog.value[0]?.fish).toBe('Lele');
    expect(state.events).toContain('navigate:/produk');
  });
  test('failed new batch retains its draft and stable IDs for retry', async () => {
    const { options } = fixture();
    const controller = useBatchDraft({
      ...options,
      persist: async () => false,
      setError() {},
      notify: options.feedback.notify,
    });
    Object.assign(controller.form, { origin: 'Gresik', date: batch.date });
    Object.assign(controller.products.value[0]!, {
      fish: 'Nila',
      size: '8–10',
      weight: '100',
      price: '20000',
    });
    const snapshot = controller.snapshot();
    await controller.save();
    expect(controller.snapshot()).toBe(snapshot);
  });
  test('cancelling linked-sale correction leaves both the batch and draft untouched', async () => {
    const { state, options } = fixture();
    options.batches.value[0]!.items.push({ ...batch.items[0]!, id: 's1', kind: 'sale', size: '' });
    const operations = useBatchOperations(options);
    const controller = useBatchTransactions({
      ...options,
      kind: ref('purchase'),
      editingId: ref('p1'),
      busy: operations.saving,
      returnPath: ref('/batch/b1/edit'),
      persist: operations.persist,
      setError() {},
    });
    controller.reset();
    controller.entry.fish = 'Lele';
    state.confirmed = false;
    await controller.saveEntry();
    expect(state.writes).toBe(0);
    expect(options.batches.value[0]?.items[0]?.fish).toBe('Nila');
    expect(controller.entry.fish).toBe('Lele');
    state.confirmed = true;
    await controller.saveEntry();
    expect(options.batches.value[0]?.items.every((item) => item.fish === 'Lele')).toBe(true);
  });
  test('workspace data is scoped to each instance, not shared between accounts or SSR requests', async () => {
    const { options } = fixture();
    const first = useWorkspaceData(options.repository, options.feedback.notify);
    const second = useWorkspaceData(options.repository, options.feedback.notify);
    await first.loadWorkspace();
    expect(first.batches.value).toHaveLength(1);
    expect(second.batches.value).toHaveLength(0);
    first.requestMessage({ status: 401 });
    expect(first.batches.value).toHaveLength(0);
  });

  test('background refresh preserves readiness so account/import panels and their drafts stay mounted', async () => {
    const { options, state } = fixture();
    const controller = useWorkspaceData(options.repository, options.feedback.notify);
    await controller.loadWorkspace();
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    options.repository.load = async () => {
      await held;
      return { batches: [], products: [], logs: [] };
    };
    const refreshing = controller.refreshWorkspace();
    expect(controller.ready.value).toBe(true);
    expect(controller.batches.value).toHaveLength(1);
    release();
    await refreshing;
    expect(controller.ready.value).toBe(true);
    expect(controller.batches.value).toHaveLength(0);
    options.repository.load = async () => {
      throw { data: { statusMessage: 'Refresh contoh gagal.' } };
    };
    await controller.refreshWorkspace();
    expect(controller.ready.value).toBe(true);
    expect(controller.workspaceError.value).toBe('');
    expect(state.events).toContain('Refresh contoh gagal.');
  });
});
