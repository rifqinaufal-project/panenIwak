import { ref } from 'vue';
import type { ConfirmationDialog, Confirm } from '../features/common/contracts';

/** Each owner gets its own dialog reference; no shared pending confirmation. */
export function useConfirmationDialog() {
  const confirmDialog = ref<ConfirmationDialog | null>(null);
  const confirm: Confirm = (options) =>
    confirmDialog.value?.confirm(options) ?? Promise.resolve(false);
  return { confirmDialog, confirm };
}
