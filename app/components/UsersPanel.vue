<script setup lang="ts">
import { IconPlus, IconArrowLeft, IconCheck } from '@tabler/icons-vue';
import type { Profile } from '../../shared/types/auth';
const props = defineProps<{ currentUser: Profile }>();
const emit = defineEmits<{ changed: []; formState: [state: { dirty: boolean; busy: boolean }] }>();
const users = ref<Profile[]>([]), loading = ref(true), busy = ref(false), error = ref(''), message = ref('');
const view = ref<'list' | 'create' | 'reset'>('list');
const target = ref<Profile | null>(null);
const form = reactive({ username: '', name: '', password: '', role: 'field_staff' as Profile['role'] });
const resetPassword = ref('');
const confirmDialog = ref<{ confirm: (options: { title: string; message: string; label?: string }) => Promise<boolean> } | null>(null);
const dirty = computed(() => view.value === 'create' ? !!(form.username || form.name || form.password || form.role !== 'field_staff') : view.value === 'reset' && !!resetPassword.value);
watch([dirty, busy], ([dirty, busy]) => emit('formState', { dirty, busy }), { immediate: true, flush: 'sync' });
async function cancelForm() {
  if (busy.value) return;
  if (dirty.value && !await confirmDialog.value?.confirm({ title: 'Tinggalkan isian?', message: 'Perubahan akun yang belum disimpan akan hilang.', label: 'Ya, tinggalkan' })) return;
  view.value = 'list'; Object.assign(form, { username: '', name: '', password: '', role: 'field_staff' }); resetPassword.value = ''; error.value = '';
}
async function load() {
  try { users.value = (await $fetch<{ users: Profile[] }>('/api/admin/users')).users; }
  catch (e: any) { error.value = e.data?.statusMessage || 'Daftar pengguna gagal dimuat.'; }
  finally { loading.value = false; }
}
async function save() {
  if (busy.value) return;
  busy.value = true; error.value = ''; message.value = '';
  try {
    if (view.value === 'create') await $fetch('/api/admin/users', { method: 'POST', body: form });
    else await $fetch('/api/admin/password', { method: 'POST', body: { id: target.value?.id, password: resetPassword.value } });
    form.password = ''; resetPassword.value = ''; form.username = ''; form.name = ''; form.role = 'field_staff'; view.value = 'list'; message.value = 'Perubahan akun berhasil disimpan.'; await load(); emit('changed');
  } catch (e: any) { error.value = e.data?.statusMessage || 'Perubahan gagal disimpan.'; }
  finally { busy.value = false; }
}
async function update(user: Profile, role: Profile['role'], active: boolean) {
  if (busy.value) return;
  busy.value = true; error.value = ''; message.value = '';
  try { await $fetch('/api/admin/users', { method: 'PATCH', body: { id: user.id, role, is_active: active } }); await load(); emit('changed'); message.value = 'Status/role akun berhasil diperbarui.'; }
  catch (e: any) { error.value = e.data?.statusMessage || 'Perubahan akun gagal.'; await load(); }
  finally { busy.value = false; }
}
onMounted(load);
</script>
<template>
  <section class="users-panel"><p v-if="error" class="form-error" role="alert">{{ error }}</p><p v-if="message" class="account-message" role="status">{{ message }}</p>
    <template v-if="view === 'list'"><div class="list-toolbar"><h2>Akun pengguna <span class="count">{{ users.length }}</span></h2><button class="primary" @click="view = 'create'; error = ''; message = ''"><IconPlus :size="17" /> Tambah pengguna</button></div><p v-if="loading">Memuat pengguna…</p><div class="report-table-scroll"><table class="report-table"><thead><tr><th>Nama / username</th><th>Role</th><th>Status</th><th>Tindakan</th></tr></thead><tbody><tr v-for="user in users" :key="user.id"><td><strong>{{ user.name }}</strong><small>@{{ user.username }}</small></td><td><select class="account-role" :value="user.role" :disabled="busy || user.id === props.currentUser.id" aria-label="Role pengguna" @change="update(user, ($event.target as HTMLSelectElement).value as Profile['role'], user.is_active)"><option value="admin">Admin</option><option value="field_staff">Staf lapangan</option></select></td><td>{{ user.is_active ? 'Aktif' : 'Nonaktif' }}</td><td><div class="user-actions"><button class="secondary" :disabled="busy" @click="target = user; view = 'reset'; resetPassword = ''; error = ''; message = ''">Reset password</button><button class="secondary" :disabled="busy || user.id === props.currentUser.id" @click="update(user, user.role, !user.is_active)">{{ user.is_active ? 'Nonaktifkan' : 'Aktifkan' }}</button></div></td></tr></tbody></table></div></template>
    <template v-else>
      <button class="back" @click="cancelForm"><IconArrowLeft :size="17" /> Kembali ke daftar pengguna</button>
      <form class="entry-form transaction-form" @submit.prevent="save">
        <h2>{{ view === 'create' ? 'Buat akun pengguna' : `Reset password @${target?.username}` }}</h2>
        <div class="form-grid">
          <template v-if="view === 'create'">
            <label>Nama lengkap<input v-model="form.name" maxlength="100" required /></label>
            <label>Username<input v-model="form.username" autocapitalize="none" :spellcheck="false" pattern="[A-Za-z0-9_]{3,32}" minlength="3" maxlength="32" autocomplete="off" required /><small>3–32 karakter: huruf, angka, atau underscore. Username tidak dapat diubah.</small></label>
            <label>Role<select v-model="form.role"><option value="field_staff">Staf lapangan</option><option value="admin">Admin</option></select></label>
            <label>Password<input v-model="form.password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required /><small>Minimal 8 karakter. Sampaikan secara pribadi ke pengguna.</small></label>
          </template>
          <label v-else>Password baru<input v-model="resetPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required /><small>Minimal 8 karakter.</small></label>
        </div>
        <div class="form-actions"><button class="primary" :disabled="busy"><IconCheck :size="17" />{{ busy ? 'Menyimpan…' : 'Simpan akun' }}</button></div>
      </form>
    </template>
    <ConfirmDialog ref="confirmDialog" />
  </section>
</template>
