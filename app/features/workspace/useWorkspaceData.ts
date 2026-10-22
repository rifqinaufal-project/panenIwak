import { ref } from 'vue';
import type { Profile } from '#shared/types/auth';
import type { ActivityLog, Batch, CatalogProduct, WorkspaceData } from '#shared/types/workspace';
import type { WorkspaceRepository } from './contracts';
import { requestErrorMessage } from '../../utils/request-error';

export function useWorkspaceData(
  repository: WorkspaceRepository,
  notify: (message: string) => void,
) {
  const currentUser = ref<Profile | null>(null);
  const batches = ref<Batch[]>([]),
    catalog = ref<CatalogProduct[]>([]),
    activityLogs = ref<ActivityLog[]>([]);
  const ready = ref(false),
    workspaceError = ref('');

  function clear() {
    currentUser.value = null;
    batches.value = [];
    catalog.value = [];
    activityLogs.value = [];
  }
  function requestMessage(error: unknown) {
    const failure = error as {
      status?: number;
      statusCode?: number;
      data?: { statusMessage?: string };
    } | null;
    if (failure?.status === 401 || failure?.statusCode === 401) clear();
    return requestErrorMessage(
      error,
      'Permintaan gagal. Periksa koneksi dan coba kembali. Input belum dihapus.',
    );
  }
  function applyData(data: WorkspaceData) {
    batches.value = data.batches;
    catalog.value = data.products;
    activityLogs.value = data.logs;
  }
  async function refreshWorkspace() {
    // Keep the import panel and any account draft mounted, including partial-import selections.
    try {
      applyData(await repository.load());
    } catch (error) {
      notify(requestMessage(error));
    }
  }
  async function refreshActivity() {
    try {
      activityLogs.value = (await repository.load()).logs;
    } catch {
      notify('Data tersimpan; riwayat belum dapat dimuat ulang.');
    }
  }
  async function loadWorkspace() {
    workspaceError.value = '';
    ready.value = false;
    try {
      applyData(await repository.load());
    } catch (error) {
      workspaceError.value = requestMessage(error);
    } finally {
      ready.value = true;
    }
  }
  return {
    currentUser,
    batches,
    catalog,
    activityLogs,
    ready,
    workspaceError,
    clear,
    requestMessage,
    refreshActivity,
    refreshWorkspace,
    loadWorkspace,
  };
}
