<script setup lang="ts">
import { IconPlus } from '@tabler/icons-vue';
import type { Profile } from '#shared/types/auth';
import type { FormState } from '../features/common/contracts';
import { useUsersPanel } from '../composables/useUsersPanel';
import UserAccountForm from './users/UserAccountForm.vue';
import UsersTable from './users/UsersTable.vue';

const props = defineProps<{ currentUser: Profile }>();
const emit = defineEmits<{ changed: []; formState: [state: FormState] }>();
const model = useUsersPanel({
  currentUser: () => props.currentUser,
  changed: () => emit('changed'),
  formState: (state) => emit('formState', state),
});
const { confirmDialog } = toRefs(model);
</script>

<template>
  <section class="users-panel">
    <p v-if="model.error" class="form-error" role="alert">
      {{ model.error }}
      <button
        v-if="model.view === 'list'"
        class="secondary"
        :disabled="model.loading || model.busy"
        @click="model.load"
      >
        Coba muat ulang
      </button>
    </p>
    <p v-if="model.message" class="account-message" role="status">{{ model.message }}</p>
    <template v-if="model.view === 'list'">
      <div class="list-toolbar">
        <h2>
          Akun pengguna <span class="count">{{ model.users.length }}</span>
        </h2>
        <button class="primary" :disabled="model.busy || model.loading" @click="model.startCreate">
          <IconPlus :size="17" /> Tambah pengguna
        </button>
      </div>
      <WorkspaceLoading v-if="model.loading" title="Memuat pengguna…" layout="list" />
      <UsersTable
        v-else
        :users="model.users"
        :current-user="currentUser"
        :busy="model.busy"
        @update="model.update"
        @reset="model.startReset"
      />
    </template>
    <UserAccountForm v-else :model="model" />
    <ConfirmDialog ref="confirmDialog" />
  </section>
</template>
