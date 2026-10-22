import { onMounted, reactive, watch } from 'vue';
import type { Profile } from '#shared/types/auth';
import type { FormState } from '../features/common/contracts';
import { useUsers } from '../features/users/useUsers';
import { createUsersRepository } from '../repositories/users-http';
import { useConfirmationDialog } from './useConfirmationDialog';

/** Component lifecycle/events and infrastructure selection stay outside the feature controller. */
export function useUsersPanel(options: {
  currentUser: () => Profile;
  changed: () => void;
  formState: (state: FormState) => void;
}) {
  const { confirmDialog, confirm } = useConfirmationDialog();
  const users = useUsers({ ...options, repository: createUsersRepository(), confirm });
  watch([users.dirty, users.busy], ([dirty, busy]) => options.formState({ dirty, busy }), {
    immediate: true,
    flush: 'sync',
  });
  onMounted(users.load);
  return reactive({ ...users, confirmDialog });
}
