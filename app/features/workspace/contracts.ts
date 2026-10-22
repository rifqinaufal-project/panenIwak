import type { Batch, CatalogProduct, WorkspaceData } from '#shared/types/workspace';
import type { Confirm } from '../common/contracts';

/** Application port. Feature controllers depend on this, never on $fetch/Supabase. */
export interface WorkspaceRepository {
  load(): Promise<WorkspaceData>;
  saveBatch(batch: Batch): Promise<Batch>;
  deleteBatch(batch: Batch): Promise<void>;
  addProduct(product: CatalogProduct): Promise<CatalogProduct>;
  editProduct(product: CatalogProduct): Promise<void>;
  deleteProduct(id: string): Promise<void>;
}

export type { Confirm, ConfirmOptions } from '../common/contracts';
export type Feedback = {
  confirm: Confirm;
  notify: (message: string) => void;
  requestMessage: (error: unknown) => string;
};
export type FinishNavigation = (path: string) => Promise<void>;
