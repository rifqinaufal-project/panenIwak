import { computed, reactive, ref } from 'vue';
import type { Profile } from '#shared/types/auth';
import type { CreateUserInput } from '#shared/types/accounts';
import type { Confirm } from '../common/contracts';
import type { UsersRepository } from './contracts';
import { requestErrorMessage } from '../../utils/request-error';

export function useUsers(options: {
  repository: UsersRepository;
  currentUser: () => Profile;
  confirm: Confirm;
  changed: () => void;
}) {
  const users = ref<Profile[]>([]),
    loading = ref(true),
    busy = ref(false);
  const error = ref(''),
    message = ref('');
  const view = ref<'list' | 'create' | 'reset'>('list');
  const target = ref<Profile | null>(null),
    resetPassword = ref('');
  const emptyForm = (): CreateUserInput => ({
    username: '',
    name: '',
    password: '',
    role: 'field_staff',
  });
  const form = reactive(emptyForm());
  const dirty = computed(() =>
    view.value === 'create'
      ? !!(form.username || form.name || form.password || form.role !== 'field_staff')
      : view.value === 'reset' && !!resetPassword.value,
  );

  function clearMessages() {
    error.value = '';
    message.value = '';
  }
  function clearForm() {
    Object.assign(form, emptyForm());
    resetPassword.value = '';
    target.value = null;
  }
  function startCreate() {
    if (busy.value) return;
    clearForm();
    clearMessages();
    view.value = 'create';
  }
  function startReset(user: Profile) {
    if (busy.value) return;
    clearForm();
    clearMessages();
    target.value = user;
    view.value = 'reset';
  }
  async function cancelForm() {
    if (busy.value) return;
    if (
      dirty.value &&
      !(await options.confirm({
        title: 'Tinggalkan isian?',
        message: 'Perubahan akun yang belum disimpan akan hilang.',
        label: 'Ya, tinggalkan',
      }))
    )
      return;
    view.value = 'list';
    clearForm();
    error.value = '';
  }
  async function load() {
    loading.value = true;
    error.value = '';
    try {
      users.value = await options.repository.list();
    } catch (failure) {
      error.value = requestErrorMessage(failure, 'Daftar pengguna gagal dimuat.');
    } finally {
      loading.value = false;
    }
  }
  async function save() {
    const account = target.value;
    if (busy.value || view.value === 'list' || (view.value === 'reset' && !account)) return;
    busy.value = true;
    clearMessages();
    try {
      if (view.value === 'create') await options.repository.create({ ...form });
      else if (account)
        await options.repository.resetPassword({ id: account.id, password: resetPassword.value });
      clearForm();
      view.value = 'list';
      message.value = 'Perubahan akun berhasil disimpan.';
      await load();
      options.changed();
    } catch (failure) {
      error.value = requestErrorMessage(failure, 'Perubahan gagal disimpan.');
    } finally {
      busy.value = false;
    }
  }
  async function update(user: Profile, role: Profile['role'], active: boolean) {
    // UI safety only: the API/DB remain responsible for authorization and self-edit rules.
    if (busy.value || user.id === options.currentUser().id) return;
    busy.value = true;
    clearMessages();
    try {
      await options.repository.update({ id: user.id, role, is_active: active });
      await load();
      options.changed();
      message.value = 'Status/role akun berhasil diperbarui.';
    } catch (failure) {
      await load();
      error.value = requestErrorMessage(failure, 'Perubahan akun gagal.');
    } finally {
      busy.value = false;
    }
  }
  return {
    users,
    loading,
    busy,
    error,
    message,
    view,
    target,
    form,
    resetPassword,
    dirty,
    startCreate,
    startReset,
    cancelForm,
    load,
    save,
    update,
  };
}
