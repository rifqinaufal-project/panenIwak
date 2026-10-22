import { reactive, watch } from 'vue';
import { useLegacyImport } from '../features/legacy-import/useLegacyImport';
import { createLegacySource } from '../repositories/legacy-indexeddb';
import { createWorkspaceRepository } from '../repositories/workspace-http';

export function useLegacyImportPanel(options: {
  imported: () => void;
  busy: (value: boolean) => void;
}) {
  const controller = useLegacyImport({
    source: createLegacySource(),
    destination: createWorkspaceRepository(),
    imported: options.imported,
  });
  watch(controller.busy, (value) => options.busy(value), { flush: 'sync' });
  return reactive(controller);
}
