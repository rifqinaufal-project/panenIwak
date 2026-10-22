<script setup lang="ts">
import type { Profile } from '#shared/types/auth';

defineProps<{ users: Profile[]; currentUser: Profile; busy: boolean }>();
const emit = defineEmits<{
  update: [user: Profile, role: Profile['role'], active: boolean];
  reset: [user: Profile];
}>();
function changeRole(event: Event, user: Profile) {
  const select = event.target as HTMLSelectElement;
  const role = select.value as Profile['role'];
  // The selected value follows server-confirmed data, even if updating fails.
  select.value = user.role;
  emit('update', user, role, user.is_active);
}
</script>

<template>
  <div class="report-table-scroll">
    <table class="report-table">
      <thead>
        <tr>
          <th>Nama / username</th>
          <th>Role</th>
          <th>Status</th>
          <th>Tindakan</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>
            <strong>{{ user.name }}</strong
            ><small>@{{ user.username }}</small>
          </td>
          <td>
            <select
              class="account-role"
              :value="user.role"
              :disabled="busy || user.id === currentUser.id"
              aria-label="Role pengguna"
              @change="changeRole($event, user)"
            >
              <option value="admin">Admin</option>
              <option value="field_staff">Staf lapangan</option>
            </select>
          </td>
          <td>{{ user.is_active ? 'Aktif' : 'Nonaktif' }}</td>
          <td>
            <div class="user-actions">
              <button class="secondary" :disabled="busy" @click="$emit('reset', user)">
                Reset password</button
              ><button
                class="secondary"
                :disabled="busy || user.id === currentUser.id"
                @click="$emit('update', user, user.role, !user.is_active)"
              >
                {{ user.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
