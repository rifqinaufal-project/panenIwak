export type WorkspacePage = 'Dashboard' | 'Batch' | 'Produk' | 'Laporan' | 'Log' | 'Pengguna';
export type TransactionKind = 'purchase' | 'expense' | 'sale';
export type WorkspaceRoute =
  | { page: WorkspacePage; view: 'list' }
  | { page: 'Batch'; view: 'new-batch' }
  | { page: 'Batch'; view: 'batch' | 'manage-batch'; batchId: string }
  | { page: 'Batch'; view: 'new-transaction'; batchId: string; kind: TransactionKind }
  | { page: 'Batch'; view: 'edit-transaction'; batchId: string; itemId: string }
  | { page: 'Produk'; view: 'new-product' }
  | { page: 'Produk'; view: 'edit-product'; productId: string };

const pages: Record<WorkspacePage, string> = {
  Dashboard: '/dashboard', Batch: '/batch', Produk: '/produk',
  Laporan: '/laporan', Log: '/log', Pengguna: '/pengguna',
};
const kinds: Record<TransactionKind, string> = { purchase: 'pembelian', expense: 'biaya', sale: 'penjualan' };

export const pagePath = (page: WorkspacePage) => pages[page];
export const batchPath = (id: string, manage = false) => `/batch/${encodeURIComponent(id)}${manage ? '/edit' : ''}`;
export const transactionPath = (id: string, kind: TransactionKind) => `${batchPath(id)}/${kinds[kind]}/baru`;
export const editTransactionPath = (batchId: string, itemId: string) => `${batchPath(batchId)}/transaksi/${encodeURIComponent(itemId)}/edit`;
export const editProductPath = (id: string) => `/produk/${encodeURIComponent(id)}/edit`;
export const canAccessPage = (page: WorkspacePage, role: 'admin' | 'field_staff') => role === 'admin' || !['Dashboard', 'Laporan', 'Pengguna'].includes(page);

/** Accept only known application URLs; never interpret an arbitrary redirect URL. */
export function resolveWorkspacePath(path: string): WorkspaceRoute | null {
  const normalized = path.replace(/\/+$/, '') || '/';
  if (normalized === '/' || normalized === '/masuk') return { page: 'Dashboard', view: 'list' };
  for (const [page, url] of Object.entries(pages)) {
    if (normalized === url) return { page: page as WorkspacePage, view: 'list' };
  }
  if (normalized === '/batch/baru') return { page: 'Batch', view: 'new-batch' };
  if (normalized === '/produk/baru') return { page: 'Produk', view: 'new-product' };
  let segments: string[];
  try { segments = normalized.slice(1).split('/').map(decodeURIComponent); }
  catch { return null; }
  if (segments.some(segment => !segment || /[/\\]/.test(segment) || segment === '.' || segment === '..')) return null;
  const [section, id, action, itemId, suffix] = segments;
  if (section === 'batch' && id) {
    if (segments.length === 2) return { page: 'Batch', view: 'batch', batchId: id };
    if (segments.length === 3 && action === 'edit') return { page: 'Batch', view: 'manage-batch', batchId: id };
    if (segments.length === 4 && itemId === 'baru') {
      const kind = Object.entries(kinds).find(([, value]) => value === action)?.[0] as TransactionKind | undefined;
      if (kind) return { page: 'Batch', view: 'new-transaction', batchId: id, kind };
    }
    if (segments.length === 5 && action === 'transaksi' && itemId && suffix === 'edit') return { page: 'Batch', view: 'edit-transaction', batchId: id, itemId };
  }
  if (section === 'produk' && id && segments.length === 3 && action === 'edit') return { page: 'Produk', view: 'edit-product', productId: id };
  return null;
}
