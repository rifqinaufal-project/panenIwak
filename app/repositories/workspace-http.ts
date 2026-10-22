import type { Batch, CatalogProduct, WorkspaceData } from '#shared/types/workspace';
import type { WorkspaceRepository } from '../features/workspace/contracts';

/** The only HTTP adapter for the workspace. Secrets and authorization remain server-side. */
export function createWorkspaceRepository(request: typeof $fetch = $fetch): WorkspaceRepository {
  return {
    load() {
      return request<WorkspaceData>('/api/workspace');
    },
    async saveBatch(batch: Batch) {
      const { id, origin, date, items, version = 0 } = batch;
      return (
        await request<{ batch: Batch }>('/api/batches/save', {
          method: 'POST',
          body: { id, origin, date, items, version },
        })
      ).batch;
    },
    async deleteBatch(batch) {
      await request('/api/batches/delete', {
        method: 'POST',
        body: { id: batch.id, version: batch.version },
      });
    },
    async addProduct(product) {
      return (
        await request<{ product: CatalogProduct }>('/api/products/save', {
          method: 'POST',
          body: product,
        })
      ).product;
    },
    async editProduct(product) {
      await request('/api/products/manage', {
        method: 'POST',
        body: { action: 'edit', ...product },
      });
    },
    async deleteProduct(id) {
      await request('/api/products/manage', { method: 'POST', body: { action: 'delete', id } });
    },
  };
}
