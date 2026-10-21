import { describe, expect, test } from 'bun:test';
import { batchPath, canAccessPage, editProductPath, editTransactionPath, pagePath, resolveWorkspacePath, transactionPath, type WorkspacePage } from '../shared/utils/workspace-routes';

describe('workspace URLs', () => {
  test('each top-level menu has a stable URL', () => {
    for (const page of ['Dashboard', 'Batch', 'Produk', 'Laporan', 'Log', 'Pengguna'] as WorkspacePage[]) {
      expect(resolveWorkspacePath(pagePath(page))).toEqual({ page, view: 'list' });
    }
  });
  test('entry paths are recognized before choosing a role-specific home', () => {
    expect(resolveWorkspacePath('/')).toEqual({ page: 'Dashboard', view: 'list' });
    expect(resolveWorkspacePath('/masuk')).not.toBeNull();
    expect(resolveWorkspacePath('/batch/')).toEqual({ page: 'Batch', view: 'list' });
  });
  test('batch forms, details, management and transactions can be deep-linked', () => {
    expect(resolveWorkspacePath('/batch/baru')).toEqual({ page: 'Batch', view: 'new-batch' });
    expect(resolveWorkspacePath(batchPath('b1'))).toEqual({ page: 'Batch', view: 'batch', batchId: 'b1' });
    expect(resolveWorkspacePath(batchPath('b1', true))).toEqual({ page: 'Batch', view: 'manage-batch', batchId: 'b1' });
    for (const kind of ['purchase', 'expense', 'sale'] as const) expect(resolveWorkspacePath(transactionPath('b1', kind))).toEqual({ page: 'Batch', view: 'new-transaction', batchId: 'b1', kind });
    expect(resolveWorkspacePath(editTransactionPath('b1', 'i1'))).toEqual({ page: 'Batch', view: 'edit-transaction', batchId: 'b1', itemId: 'i1' });
  });
  test('product form URLs distinguish creation and editing', () => {
    expect(resolveWorkspacePath('/produk/baru')).toEqual({ page: 'Produk', view: 'new-product' });
    expect(resolveWorkspacePath(editProductPath('p1'))).toEqual({ page: 'Produk', view: 'edit-product', productId: 'p1' });
  });
  test('IDs are encoded and invalid or unknown paths do not silently become a dashboard', () => {
    expect(resolveWorkspacePath(batchPath('batch 1'))).toEqual({ page: 'Batch', view: 'batch', batchId: 'batch 1' });
    for (const path of ['/unknown', '/batch//edit', '/batch/b1/other', '/batch/b1/penjualan/edit', '/produk/p1', '/batch/%ZZ', '/batch/%2F', '/batch/%5C', '/batch/..', 'https://evil.example']) expect(resolveWorkspacePath(path)).toBeNull();
  });
  test('staff cannot select admin screens; server authorization remains separate', () => {
    for (const page of ['Dashboard', 'Laporan', 'Pengguna'] as const) {
      expect(canAccessPage(page, 'field_staff')).toBe(false);
      expect(canAccessPage(page, 'admin')).toBe(true);
    }
    for (const page of ['Batch', 'Produk', 'Log'] as const) expect(canAccessPage(page, 'field_staff')).toBe(true);
  });
});
