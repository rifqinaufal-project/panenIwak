import { z } from 'zod';
import type { LegacySnapshot } from '../types/legacy-import';

// Check the storage boundary without inventing identifiers, sizes or transaction data.
// Value limits and authorization are still enforced by the destination API.
const numberText = z.union([z.string(), z.number().finite()]).transform(String);
const item = z.object({
  id: z.string(),
  kind: z.enum(['purchase', 'expense', 'sale']),
  fish: z.string(),
  size: z.string(),
  weight: numberText,
  price: numberText,
  description: z.string(),
  date: z.string(),
});
const snapshot = z.object({
  batches: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      origin: z.string(),
      date: z.string(),
      items: z.array(item),
    }),
  ),
  products: z.array(z.object({ id: z.string(), fish: z.string(), size: z.string() })),
});

export function decodeLegacySnapshot(batches: unknown[], products: unknown[]): LegacySnapshot {
  return snapshot.parse({ batches, products });
}
