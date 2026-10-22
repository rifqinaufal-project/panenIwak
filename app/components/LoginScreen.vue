<script setup lang="ts">
import { IconFish, IconArrowRight } from '@tabler/icons-vue';
import type { Profile } from '#shared/types/auth';
import { useLoginScreen } from '../composables/useLoginScreen';
const emit = defineEmits<{ authenticated: [Profile] }>();
const model = useLoginScreen((user) => emit('authenticated', user));
</script>
<template>
  <main class="login-page">
    <form class="login-card" @submit.prevent="model.submit">
      <div class="brand">
        <span class="brand-mark"><IconFish :size="26" /></span>panen<span class="brand-light"
          >iwak</span
        ><span class="brand-dot">.</span>
      </div>
      <h1>{{ model.registering ? 'Buat akun Anda.' : 'Selamat datang kembali.' }}</h1>
      <p>
        {{
          model.registering
            ? 'Daftar dengan username dan password. Tidak perlu email.'
            : 'Masuk untuk mencatat perjalanan dan hasil usaha Anda.'
        }}
      </p>
      <p v-if="model.message" class="account-message" role="status">{{ model.message }}</p>
      <div class="form-grid">
        <label v-if="model.registering"
          >Nama lengkap<input
            v-model="model.form.name"
            autocomplete="name"
            maxlength="100"
            required
            :disabled="model.busy"
        /></label>
        <label
          ><span id="login-username-label">Username</span
          ><input
            v-model="model.form.username"
            aria-labelledby="login-username-label"
            :aria-describedby="model.registering ? 'login-username-hint' : undefined"
            autocomplete="username"
            autocapitalize="none"
            :spellcheck="false"
            minlength="3"
            maxlength="32"
            pattern="[A-Za-z0-9_]{3,32}"
            required
            :disabled="model.busy"
          /><small v-if="model.registering" id="login-username-hint"
            >3–32 karakter: huruf, angka, atau underscore.</small
          ></label
        >
        <label
          ><span id="login-password-label">Password</span
          ><input
            v-model="model.form.password"
            aria-labelledby="login-password-label"
            :aria-describedby="model.registering ? 'login-password-hint' : undefined"
            type="password"
            :autocomplete="model.registering ? 'new-password' : 'current-password'"
            :minlength="model.registering ? 8 : 1"
            maxlength="128"
            required
            :disabled="model.busy"
          /><small v-if="model.registering" id="login-password-hint"
            >Minimal 8 karakter. Akun baru langsung menjadi admin dengan akses seluruh data
            usaha.</small
          ></label
        >
      </div>
      <p v-if="model.error" class="form-error" role="alert">{{ model.error }}</p>
      <button class="primary login-submit" :disabled="model.busy">
        {{ model.busy ? 'Memproses…' : model.registering ? 'Buat akun' : 'Masuk'
        }}<IconArrowRight :size="17" />
      </button>
      <p class="login-help">
        <button type="button" class="text-button" :disabled="model.busy" @click="model.toggleMode">
          {{ model.registering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar akun' }}
        </button>
      </p>
      <p v-if="!model.registering" class="login-help">Lupa password? Hubungi admin usaha Anda.</p>
    </form>
  </main>
</template>
