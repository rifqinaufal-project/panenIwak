import type { Batch, CatalogProduct } from './workspace';

export type LegacyBatch = Pick<Batch, 'id' | 'code' | 'origin' | 'date' | 'items'>;
export type LegacySnapshot = { batches: LegacyBatch[]; products: CatalogProduct[] };
