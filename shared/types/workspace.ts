export type Item = {
  id: string;
  kind: 'purchase' | 'expense' | 'sale';
  fish: string;
  size: string;
  weight: string;
  price: string;
  description: string;
  date: string;
};

export type Batch = {
  version?: number;
  ownerId?: string;
  id: string;
  code: string;
  origin: string;
  destination: string;
  date: string;
  staff: string;
  closed: boolean;
  items: Item[];
};

export type CatalogProduct = { id: string; fish: string; size: string };
export type ActivityLog = {
  id: string;
  username: string;
  actorId: string;
  timestamp: string;
  action: string;
  detail: string;
  batchId?: string;
  oldValues?: unknown;
  newValues?: unknown;
};
export type WorkspaceData = { batches: Batch[]; products: CatalogProduct[]; logs: ActivityLog[] };
export type PurchaseDraft = Pick<Item, 'id' | 'fish' | 'size' | 'weight' | 'price'> & {
  key: number;
};
export type ExpenseDraft = { id: string; category: string; description: string; price: string };
export type SaleDraft = PurchaseDraft;
export type BatchDraft = { origin: string; date: string };
