import { computed, reactive, ref, watch } from 'vue';
import { createWorkspaceRepository } from '../../repositories/workspace-http';
import { createAuthenticationRepository } from '../../repositories/auth-http';
import { useWorkspaceData } from './useWorkspaceData';
import { useWorkspaceFeedback } from './useWorkspaceFeedback';
import { useWorkspaceRoute } from './useWorkspaceRoute';
import { useWorkspaceSession } from './useWorkspaceSession';
import { useUnsavedNavigation } from './useUnsavedNavigation';
import { useBatchOperations } from '../batches/useBatchOperations';
import { useBatchDraft } from '../batches/useBatchDraft';
import { useBatchTransactions } from '../batches/useBatchTransactions';
import { useProductCatalog } from '../products/useProductCatalog';
import { useOverview } from '../dashboard/useOverview';
import { useReports } from '../reports/useReports';

/** Composition root: create adapters, connect feature controllers, coordinate route entry. */
export function useWorkspace() {
  const repository = createWorkspaceRepository();
  const feedback = useWorkspaceFeedback();
  const data = useWorkspaceData(repository, feedback.notify);
  const routing = useWorkspaceRoute(data);
  const messages = { ...feedback, requestMessage: data.requestMessage };
  const accountState = ref({ dirty: false, busy: false }),
    importing = ref(false);
  // These getters run after construction; controllers don't depend on each other cyclically.
  const busy = computed(
    () =>
      batch.saving.value ||
      batch.deleting.value ||
      sales.saving.value ||
      catalog.saving.value ||
      session.signingOut.value ||
      accountState.value.busy ||
      importing.value,
  );
  const guard = useUnsavedNavigation({
    currentUser: data.currentUser,
    busy,
    accountDirty: computed(() => accountState.value.dirty),
    confirm: feedback.confirm,
    notify: feedback.notify,
    snapshot: () =>
      routing.showForm.value
        ? draft.snapshot()
        : routing.showProductForm.value
          ? catalog.snapshot()
          : routing.transaction.value
            ? sales.snapshot()
            : '',
  });
  const batch = useBatchOperations({
    repository,
    batches: data.batches,
    active: routing.active,
    online: feedback.online,
    feedback: messages,
    refreshActivity: data.refreshActivity,
    finishNavigation: guard.finishNavigation,
  });
  const setError = (message: string) => {
    batch.error.value = message;
  };
  const draft = useBatchDraft({
    persist: batch.persist,
    setError,
    finishNavigation: guard.finishNavigation,
    notify: feedback.notify,
  });
  const sales = useBatchTransactions({
    active: routing.active,
    kind: routing.transaction,
    editingId: routing.editingItemId,
    busy: batch.saving,
    returnPath: routing.transactionReturnPath,
    feedback: messages,
    setError,
    persist: batch.persist,
    finishNavigation: guard.finishNavigation,
  });
  const catalog = useProductCatalog({
    repository,
    catalog: data.catalog,
    editingId: routing.editingProductId,
    online: feedback.online,
    feedback: messages,
    finishNavigation: guard.finishNavigation,
    refreshActivity: data.refreshActivity,
  });
  const overview = useOverview(data.batches, feedback.notify);
  const reports = useReports(data.batches, feedback.notify);
  const session = useWorkspaceSession({
    repository: createAuthenticationRepository(),
    currentUser: data.currentUser,
    busy,
    feedback: messages,
    loadWorkspace: data.loadWorkspace,
    clear: data.clear,
    confirmDiscard: guard.confirmDiscard,
    resetForms() {
      draft.reset();
      sales.reset();
      catalog.reset();
      guard.resetBaseline();
    },
  });
  watch(
    [routing.path, data.ready, data.currentUser],
    (_next, previous) => {
      if (!data.currentUser.value || !data.ready.value) return;
      if (previous?.[0] !== routing.path.value) {
        const previousPage = previous?.[0]?.split('/')[1];
        if (previousPage !== routing.path.value.split('/')[1]) overview.search.value = '';
      }
      batch.error.value = '';
      catalog.error.value = '';
      accountState.value = { dirty: false, busy: false };
      if (routing.showForm.value) draft.reset();
      if (routing.showProductForm.value) catalog.reset();
      if (routing.transaction.value) sales.reset();
      guard.resetBaseline();
    },
    { flush: 'post' },
  );

  return reactive({
    data,
    routing,
    session,
    batch,
    draft,
    sales,
    catalog,
    overview,
    reports,
    accountState,
    importing,
    online: feedback.online,
    toast: feedback.toast,
    confirmDialog: feedback.confirmDialog,
  });
}

export type Workspace = ReturnType<typeof useWorkspace>;
