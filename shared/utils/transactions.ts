import type {
  Batch,
  BatchDraft,
  CatalogProduct,
  ExpenseDraft,
  Item,
  PurchaseDraft,
  SaleDraft,
} from '../types/workspace';
import { safeDecimal } from './finance';

/** Business rules only: no Vue state, router, HTTP, browser APIs or random IDs. */
export function validSaleReferences(items: readonly Item[]) {
  return items
    .filter((item) => item.kind === 'sale')
    .every((sale) =>
      items.some(
        (purchase) =>
          purchase.kind === 'purchase' &&
          purchase.fish === sale.fish &&
          (!sale.size || purchase.size === sale.size),
      ),
    );
}

export function purchasedProducts(items: readonly Item[]) {
  const products = new Map<string, Pick<CatalogProduct, 'fish' | 'size'>>();
  for (const item of items) {
    if (item.kind === 'purchase')
      products.set(JSON.stringify([item.fish, item.size]), { fish: item.fish, size: item.size });
  }
  return [...products.values()];
}

export function validateBatchDraft(
  form: BatchDraft,
  products: readonly PurchaseDraft[],
  expenses: readonly ExpenseDraft[],
) {
  if (!form.origin.trim() || !form.date) return 'Lengkapi tanggal dan asal perjalanan.';
  if (
    !products.length ||
    products.some(
      (product) =>
        !product.fish.trim() ||
        !product.size.trim() ||
        !safeDecimal(product.weight).gt(0) ||
        !safeDecimal(product.price).gt(0),
    )
  ) {
    return 'Lengkapi jenis ikan, size, bobot, dan harga pada setiap produk.';
  }
  if (expenses.some((expense) => !safeDecimal(expense.price).gt(0)))
    return 'Isi jumlah setiap biaya perjalanan dengan nilai lebih dari nol.';
  return '';
}

export function buildBatch(
  id: string,
  form: BatchDraft,
  products: readonly PurchaseDraft[],
  expenses: readonly ExpenseDraft[],
): Batch {
  return {
    id,
    code: '',
    origin: form.origin.trim(),
    date: form.date,
    destination: '',
    staff: '',
    closed: false,
    items: [
      ...products.map(({ key: _key, ...product }) => ({
        ...product,
        fish: product.fish.trim(),
        size: product.size.trim(),
        kind: 'purchase' as const,
        date: form.date,
        description: '',
      })),
      ...expenses.map((expense) => ({
        id: expense.id,
        kind: 'expense' as const,
        fish: expense.category,
        size: '',
        weight: '0',
        price: expense.price,
        description: expense.description.trim(),
        date: form.date,
      })),
    ],
  };
}

export function validateSales(date: string, rows: readonly SaleDraft[], items: readonly Item[]) {
  if (!date || !rows.length) return 'Isi tanggal dan minimal satu item penjualan.';
  const products = purchasedProducts(items);
  for (const [index, row] of rows.entries()) {
    if (
      !safeDecimal(row.weight).gt(0) ||
      !safeDecimal(row.price).gt(0) ||
      !products.some(
        (product) => product.fish === row.fish && (!row.size || product.size === row.size),
      )
    ) {
      return `Item ${index + 1}: pilih ikan dari pembelian, isi bobot dan harga lebih dari nol. Size opsional, tetapi harus sesuai pembelian jika dipilih.`;
    }
  }
  return '';
}

export function validateEntry(entry: Omit<Item, 'id' | 'kind'>, kind: Item['kind']) {
  if (
    !entry.date ||
    !safeDecimal(entry.price).gt(0) ||
    (kind !== 'expense' &&
      (!entry.fish.trim() ||
        (kind === 'purchase' && !entry.size.trim()) ||
        !safeDecimal(entry.weight).gt(0)))
  ) {
    return 'Isi tanggal, ikan, bobot, dan harga yang valid. Size wajib untuk pembelian, opsional untuk penjualan.';
  }
  return '';
}

/** Return a new document and proposed linked-sale corrections; confirmation belongs to the application layer. */
export function replaceTransaction(batch: Batch, item: Item) {
  const previous = batch.items.find((row) => row.id === item.id);
  const items = batch.items.filter((row) => row.id !== item.id).map((row) => ({ ...row }));
  items.push({ ...item });
  const affected =
    previous?.kind === 'purchase' && (previous.fish !== item.fish || previous.size !== item.size)
      ? items.filter(
          (sale) =>
            sale.kind === 'sale' &&
            sale.fish === previous.fish &&
            (!sale.size || sale.size === previous.size) &&
            !items.some(
              (purchase) =>
                purchase.kind === 'purchase' &&
                purchase.fish === sale.fish &&
                (!sale.size || purchase.size === sale.size),
            ),
        )
      : [];
  return { document: { ...batch, items }, previous, affected };
}

export function validateCatalogProduct(
  form: Pick<CatalogProduct, 'fish' | 'size'>,
  catalog: readonly CatalogProduct[],
  editingId: string | null,
) {
  const fish = form.fish.trim(),
    size = form.size.trim();
  if (!fish || !size) return 'Isi nama ikan dan size.';
  if (
    catalog.some(
      (product) =>
        product.id !== editingId &&
        product.fish.toLowerCase() === fish.toLowerCase() &&
        product.size.toLowerCase() === size.toLowerCase(),
    )
  ) {
    return 'Produk dengan nama ikan dan size tersebut sudah tersedia.';
  }
  return '';
}
