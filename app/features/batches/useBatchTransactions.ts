import { computed, reactive, ref, type Ref } from 'vue';
import Decimal from 'decimal.js';
import type { Batch, Item, SaleDraft } from '#shared/types/workspace';
import { safeDecimal } from '#shared/utils/finance';
import {
  purchasedProducts,
  replaceTransaction,
  validateEntry,
  validateSales,
  validSaleReferences,
} from '#shared/utils/transactions';
import { today } from '../../utils/workspace-format';
import type { Feedback, FinishNavigation } from '../workspace/contracts';

export function useBatchTransactions(options: {
  active: Ref<Batch | undefined>;
  kind: Ref<Item['kind'] | null>;
  editingId: Ref<string | null>;
  busy: Ref<boolean>;
  returnPath: Ref<string>;
  feedback: Feedback;
  setError: (message: string) => void;
  persist: (batch: Batch) => Promise<boolean>;
  finishNavigation: FinishNavigation;
}) {
  let key = 0;
  const id = ref<string>(crypto.randomUUID());
  const newSaleRow = (): SaleDraft => ({
    id: crypto.randomUUID(),
    key: ++key,
    fish: '',
    size: '',
    weight: '',
    price: '',
  });
  const rows = ref([newSaleRow()]),
    saving = ref(false);
  const entry = reactive({
    fish: '',
    size: '',
    weight: '',
    price: '',
    description: '',
    date: today(),
  });
  const products = computed(() => purchasedProducts(options.active.value?.items ?? []));
  const total = computed(() =>
    rows.value.reduce(
      (sum, row) => sum.plus(safeDecimal(row.weight).times(safeDecimal(row.price))),
      new Decimal(0),
    ),
  );
  const weight = computed(() =>
    rows.value.reduce((sum, row) => sum.plus(safeDecimal(row.weight)), new Decimal(0)),
  );
  function reset() {
    id.value = options.editingId.value ?? crypto.randomUUID();
    rows.value = [newSaleRow()];
    Object.assign(entry, {
      fish: options.kind.value === 'expense' ? 'BBM' : '',
      size: '',
      weight: '',
      price: '',
      description: '',
      date: today(),
    });
    const item = options.active.value?.items.find((item) => item.id === options.editingId.value);
    if (item) {
      const { id: _id, kind: _kind, ...fields } = item;
      Object.assign(entry, fields);
      if (item.kind === 'sale') rows.value = [{ ...newSaleRow(), ...item }];
    }
  }
  function snapshot() {
    return JSON.stringify(
      options.kind.value === 'sale' ? { date: entry.date, rows: rows.value } : entry,
    );
  }
  async function saveSales() {
    const active = options.active.value;
    if (!active || saving.value || options.busy.value) return;
    const error = validateSales(entry.date, rows.value, active.items);
    options.setError(error);
    if (error) return;
    saving.value = true;
    try {
      const batch = {
        ...active,
        items: active.items.filter((item) => item.id !== options.editingId.value),
      };
      batch.items.push(
        ...rows.value.map((row) => ({
          id: row.id,
          kind: 'sale' as const,
          fish: row.fish,
          size: row.size,
          weight: row.weight,
          price: row.price,
          date: entry.date,
          description: '',
        })),
      );
      if (await options.persist(batch)) {
        options.feedback.notify(
          options.editingId.value
            ? 'Perubahan penjualan tersimpan di server.'
            : 'Semua item penjualan tersimpan di server.',
        );
        await options.finishNavigation(options.returnPath.value);
      }
    } finally {
      saving.value = false;
    }
  }
  async function saveEntry() {
    const active = options.active.value,
      kind = options.kind.value;
    if (!active || !kind || options.busy.value) return;
    const error = validateEntry(entry, kind);
    options.setError(error);
    if (error) return;
    const { document, previous, affected } = replaceTransaction(active, {
      ...entry,
      id: id.value,
      kind,
      weight: kind === 'expense' ? '0' : entry.weight,
    });
    if (previous && previous.kind !== kind) return;
    if (affected.length) {
      if (
        !(await options.feedback.confirm({
          title: 'Sesuaikan penjualan terkait?',
          message: `${affected.length} penjualan terkait akan mengikuti koreksi nama/size pembelian ini.`,
          label: 'Simpan koreksi',
        }))
      )
        return;
      if (options.active.value?.id !== active.id || options.editingId.value !== previous?.id)
        return;
      for (const sale of affected) {
        sale.fish = entry.fish;
        if (sale.size) sale.size = entry.size;
      }
    }
    if (!validSaleReferences(document.items)) {
      options.setError(
        'Penjualan harus tetap memiliki pembelian dengan ikan dan size yang sesuai.',
      );
      return;
    }
    if (await options.persist(document)) {
      await options.finishNavigation(options.returnPath.value);
      options.feedback.notify('Transaksi tersimpan di server.');
    }
  }
  async function remove(item: Item) {
    const active = options.active.value;
    if (!active || options.busy.value || saving.value) return;
    const batch = { ...active, items: active.items.filter((row) => row.id !== item.id) };
    if (!validSaleReferences(batch.items)) {
      options.setError(
        'Pembelian ini masih menjadi acuan penjualan. Sesuaikan atau hapus penjualan terkait terlebih dahulu.',
      );
      return;
    }
    if (
      !(await options.feedback.confirm({
        title: 'Hapus transaksi?',
        message: `${item.kind === 'expense' ? 'Biaya' : item.kind === 'purchase' ? 'Pembelian' : 'Penjualan'} ${item.fish} akan dihapus. HPP dan laba akan dihitung ulang. Tindakan ini tidak dapat dibatalkan dan tercatat di log.`,
        label: 'Ya, hapus transaksi',
      }))
    )
      return;
    if (options.active.value?.id !== batch.id) return;
    options.setError('');
    if (await options.persist(batch))
      options.feedback.notify('Transaksi dihapus. Perhitungan batch sudah diperbarui.');
  }
  return {
    entry,
    rows,
    products,
    total,
    weight,
    saving,
    newSaleRow,
    reset,
    snapshot,
    saveSales,
    saveEntry,
    remove,
  };
}
