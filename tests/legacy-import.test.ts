import { describe, expect, test } from 'bun:test';
import type { Batch } from '../shared/types/workspace';
import type { LegacySnapshot } from '../shared/types/legacy-import';
import { decodeLegacySnapshot } from '../shared/utils/legacy-import';
import { useLegacyImport } from '../app/features/legacy-import/useLegacyImport';

const item = {
  id: 'p1',
  kind: 'purchase',
  fish: 'Nila',
  size: '8–10',
  weight: '100',
  price: '20000',
  date: '2026-10-22',
  description: '',
} as const;
const data: LegacySnapshot = {
  batches: ['b1', 'b2', 'b3'].map((id, index) => ({
    id,
    code: `LOCAL-${index + 1}`,
    origin: 'Lamongan',
    date: item.date,
    items: [{ ...item, id: `p${index + 1}` }],
  })),
  products: [{ id: 'prod1', fish: 'Nila', size: '8–10' }],
};

describe('legacy storage boundary', () => {
  test('decodes old numeric amounts without inventing IDs or copying technical/history fields', () => {
    const input = {
      ...data.batches[0]!,
      ownerId: 'unverified',
      logs: ['unverified actor'],
      items: [{ ...item, weight: 100.125, price: 20000 }],
    };
    const decoded = decodeLegacySnapshot([input], data.products);
    expect(decoded.batches[0]?.items[0]?.weight).toBe('100.125');
    expect(decoded.batches[0]?.items[0]?.price).toBe('20000');
    expect(decoded.batches[0]?.id).toBe('b1');
    expect(decoded.batches[0]).not.toHaveProperty('ownerId');
    expect(decoded.batches[0]).not.toHaveProperty('logs');
    expect(input.items[0]?.weight).toBe(100.125);
  });
  test('malformed data fails explicitly, instead of silently skipping records or inventing missing sizes', () => {
    for (const invalid of [
      null,
      { ...data.batches[0], id: undefined },
      { ...data.batches[0], items: [{}] },
      { ...data.batches[0], items: [{ ...item, size: undefined }] },
    ]) {
      expect(() => decodeLegacySnapshot([invalid], [])).toThrow();
    }
    expect(() => decodeLegacySnapshot([], [{ id: 'prod1', fish: 'Nila' }])).toThrow();
  });
});

describe('legacy import controller with injected source/destination', () => {
  function fixture() {
    const state = {
      missing: false,
      unreadable: false,
      failId: '',
      reads: 0,
      imported: 0,
      products: [] as string[],
      batches: [] as Batch[],
      hold: undefined as Promise<void> | undefined,
    };
    const controller = useLegacyImport({
      source: {
        async read() {
          state.reads++;
          if (state.unreadable) throw new Error('Read failed');
          return state.missing ? null : structuredClone(data);
        },
      },
      destination: {
        async addProduct(product) {
          await state.hold;
          state.products.push(product.id);
          return product;
        },
        async saveBatch(batch) {
          await state.hold;
          if (batch.id === state.failId) throw { data: { statusMessage: 'Impor contoh gagal.' } };
          state.batches.push(batch);
          return batch;
        },
      },
      imported: () => state.imported++,
    });
    return { state, controller };
  }
  test('preview is read-only and never selects examples automatically', async () => {
    const { state, controller } = fixture();
    await controller.preview();
    expect(state.reads).toBe(1);
    expect(state.products).toEqual([]);
    expect(state.batches).toEqual([]);
    expect(controller.rows.value).toHaveLength(3);
    expect(controller.selected.value).toEqual([]);
    expect(controller.includeProducts.value).toBe(false);
    await controller.importSelected();
    expect(state.imported).toBe(0);
  });
  test('missing and unreadable databases are safe, visible states', async () => {
    const { state, controller } = fixture();
    state.missing = true;
    await controller.preview();
    expect(controller.status.value).toContain('Tidak ada database');
    expect(controller.checking.value).toBe(false);
    state.unreadable = true;
    await controller.preview();
    expect(controller.status.value).toContain('Data asli tidak diubah');
    expect(controller.rows.value).toEqual([]);
    expect(state.batches).toEqual([]);
  });
  test('only checked batches are sent; source IDs and items are retained and version starts at zero', async () => {
    const { state, controller } = fixture();
    await controller.preview();
    controller.selected.value = ['b2'];
    await controller.importSelected();
    expect(state.batches.map((batch) => batch.id)).toEqual(['b2']);
    expect(state.products).toEqual([]);
    expect(state.batches[0]?.version).toBe(0);
    expect(state.batches[0]?.items).toEqual(data.batches[1]?.items);
    expect(controller.selected.value).toEqual([]);
    expect(state.imported).toBe(1);
    expect(controller.rows.value).toEqual(data.batches);
  });
  test('partial failure stops import, deselects successful batches and retries only the remaining IDs', async () => {
    const { state, controller } = fixture();
    await controller.preview();
    controller.selected.value = ['b1', 'b2', 'b3'];
    state.failId = 'b2';
    await controller.importSelected();
    expect(state.batches.map((batch) => batch.id)).toEqual(['b1']);
    expect(controller.selected.value).toEqual(['b2', 'b3']);
    expect(controller.status.value).toContain('1 data berhasil');
    expect(controller.status.value).toContain('Impor contoh gagal');
    expect(controller.busy.value).toBe(false);
    expect(state.imported).toBe(1);
    state.failId = '';
    await controller.importSelected();
    expect(state.batches.map((batch) => batch.id)).toEqual(['b1', 'b2', 'b3']);
    expect(controller.selected.value).toEqual([]);
    expect(state.imported).toBe(2);
    expect(controller.rows.value).toEqual(data.batches);
  });
  test('products are imported only by explicit opt-in, and pending imports cannot be duplicated', async () => {
    const { state, controller } = fixture();
    let release!: () => void;
    state.hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    await controller.preview();
    controller.includeProducts.value = true;
    const first = controller.importSelected();
    expect(controller.busy.value).toBe(true);
    await controller.importSelected();
    await controller.preview();
    expect(state.reads).toBe(1);
    release();
    await first;
    expect(state.products).toEqual(['prod1']);
    expect(state.batches).toEqual([]);
    expect(state.imported).toBe(1);
  });
});
