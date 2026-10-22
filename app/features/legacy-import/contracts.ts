import type { LegacySnapshot } from '#shared/types/legacy-import';
import type { WorkspaceRepository } from '../workspace/contracts';

export interface LegacySource {
  /** Null means no legacy database. Reading never changes or deletes local records. */
  read(): Promise<LegacySnapshot | null>;
}

export type LegacyDestination = Pick<WorkspaceRepository, 'saveBatch' | 'addProduct'>;
