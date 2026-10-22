import { reactive, ref } from 'vue';
import type { Profile } from '#shared/types/auth';
import { requestErrorMessage } from '../../utils/request-error';
import type { AuthenticationRepository } from './contracts';

export function useAuthentication(options: {
  repository: Pick<AuthenticationRepository, 'login' | 'register'>;
  authenticated: (user: Profile) => void;
}) {
  const form = reactive({ username: '', password: '', name: '' });
  const registering = ref(false),
    busy = ref(false),
    error = ref(''),
    message = ref('');

  function toggleMode() {
    if (busy.value) return;
    registering.value = !registering.value;
    error.value = '';
    message.value = '';
    form.password = '';
  }
  async function submit() {
    if (busy.value) return;
    error.value = '';
    busy.value = true;
    try {
      if (registering.value) {
        await options.repository.register({ ...form });
        registering.value = false;
        form.password = '';
        message.value = 'Akun berhasil dibuat. Silakan masuk dengan username dan password Anda.';
        return;
      }
      const user = await options.repository.login({
        username: form.username,
        password: form.password,
      });
      form.password = '';
      options.authenticated(user);
    } catch (failure) {
      error.value = requestErrorMessage(
        failure,
        'Tidak dapat masuk. Periksa koneksi dan coba kembali.',
      );
    } finally {
      busy.value = false;
    }
  }
  return { form, registering, busy, error, message, toggleMode, submit };
}
