import { decodeLegacySnapshot } from '#shared/utils/legacy-import';
import type { LegacySource } from '../features/legacy-import/contracts';

/** Browser-only, read-only adapter. Never creates/upgrades/deletes the legacy database. */
export function createLegacySource(): LegacySource {
  return {
    async read() {
      const { default: Dexie } = await import('dexie');
      const name = 'panen-iwak-demo-v1';
      if (!(await Dexie.exists(name))) return null;
      const db = new Dexie(name);
      try {
        await db.open();
        const batches = db.table<unknown>('batches');
        const products = db.tables.some((table) => table.name === 'products')
          ? db.table<unknown>('products')
          : null;
        return await db.transaction('r', products ? [batches, products] : [batches], async () =>
          decodeLegacySnapshot(await batches.toArray(), products ? await products.toArray() : []),
        );
      } finally {
        db.close();
      }
    },
  };
}
