<script setup lang="ts">
import { IconFish, IconArrowRight } from '@tabler/icons-vue';
import type { Profile } from '../../shared/types/auth';
const emit = defineEmits<{ authenticated: [Profile] }>();
const username = ref(''), password = ref(''), error = ref(''), busy = ref(false);
const registering = ref(false), name = ref(''), message = ref('');
function toggleMode() {
  registering.value = !registering.value; error.value = ''; message.value = ''; password.value = '';
}
async function login() {
  if (busy.value) return;
  error.value = ''; busy.value = true;
  try {
    if (registering.value) {
      await $fetch('/api/auth/register', { method: 'POST', body: { name: name.value, username: username.value, password: password.value } });
      registering.value = false; password.value = '';
      message.value = 'Akun berhasil dibuat. Silakan masuk dengan username dan password Anda.';
      return;
    }
    const result = await $fetch<{ user: Profile }>('/api/auth/login', { method: 'POST', body: { username: username.value, password: password.value } });
    password.value = ''; emit('authenticated', result.user);
  } catch (e: any) { error.value = e.data?.statusMessage || 'Tidak dapat masuk. Periksa koneksi dan coba kembali.'; }
  finally { busy.value = false; }
}
</script>
<template>
  <main class="login-page">
    <form class="login-card" @submit.prevent="login">
      <div class="brand"><span class="brand-mark"><IconFish :size="26" /></span>panen<span class="brand-light">iwak</span><span class="brand-dot">.</span></div>
      <h1>{{ registering ? 'Buat akun Anda.' : 'Selamat datang kembali.' }}</h1>
      <p>{{ registering ? 'Daftar dengan username dan password. Tidak perlu email.' : 'Masuk untuk mencatat perjalanan dan hasil usaha Anda.' }}</p>
      <p v-if="message" class="account-message" role="status">{{ message }}</p>
      <div class="form-grid">
        <label v-if="registering">Nama lengkap<input v-model="name" autocomplete="name" maxlength="100" required :disabled="busy" /></label>
        <label>Username<input v-model="username" autocomplete="username" autocapitalize="none" :spellcheck="false" minlength="3" maxlength="32" pattern="[A-Za-z0-9_]{3,32}" required :disabled="busy" /><small v-if="registering">3–32 karakter: huruf, angka, atau underscore.</small></label>
        <label>Password<input v-model="password" type="password" :autocomplete="registering ? 'new-password' : 'current-password'" :minlength="registering ? 8 : 1" maxlength="128" required :disabled="busy" /><small v-if="registering">Minimal 8 karakter. Akun baru langsung menjadi admin dengan akses seluruh data usaha.</small></label>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <button class="primary login-submit" :disabled="busy">{{ busy ? 'Memproses…' : registering ? 'Buat akun' : 'Masuk' }}<IconArrowRight :size="17" /></button>
      <p class="login-help"><button type="button" class="text-button" :disabled="busy" @click="toggleMode">{{ registering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar akun' }}</button></p>
      <p v-if="!registering" class="login-help">Lupa password? Hubungi admin usaha Anda.</p>
    </form>
  </main>
</template>
