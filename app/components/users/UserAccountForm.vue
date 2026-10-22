<script setup lang="ts">
import { IconArrowLeft, IconCheck } from '@tabler/icons-vue';
import type { UnwrapRef } from 'vue';
import type { useUsers } from '../../features/users/useUsers';
defineProps<{ model: UnwrapRef<ReturnType<typeof useUsers>> }>();
</script>

<template>
  <button class="back" :disabled="model.busy" @click="model.cancelForm">
    <IconArrowLeft :size="17" /> Kembali ke daftar pengguna
  </button>
  <form class="entry-form transaction-form" @submit.prevent="model.save">
    <h2>
      {{
        model.view === 'create' ? 'Buat akun pengguna' : `Reset password @${model.target?.username}`
      }}
    </h2>
    <div class="form-grid">
      <template v-if="model.view === 'create'">
        <label
          >Nama lengkap<input
            v-model="model.form.name"
            maxlength="100"
            required
            :disabled="model.busy"
        /></label>
        <label
          ><span id="user-username-label">Username</span
          ><input
            v-model="model.form.username"
            aria-labelledby="user-username-label"
            aria-describedby="user-username-hint"
            autocapitalize="none"
            :spellcheck="false"
            pattern="[A-Za-z0-9_]{3,32}"
            minlength="3"
            maxlength="32"
            autocomplete="off"
            required
            :disabled="model.busy"
          /><small id="user-username-hint"
            >3–32 karakter: huruf, angka, atau underscore. Username tidak dapat diubah.</small
          ></label
        >
        <label
          >Role<select v-model="model.form.role" :disabled="model.busy">
            <option value="field_staff">Staf lapangan</option>
            <option value="admin">Admin</option>
          </select></label
        >
        <label
          ><span id="user-password-label">Password</span
          ><input
            v-model="model.form.password"
            aria-labelledby="user-password-label"
            aria-describedby="user-password-hint"
            type="password"
            autocomplete="new-password"
            minlength="8"
            maxlength="128"
            required
            :disabled="model.busy"
          /><small id="user-password-hint"
            >Minimal 8 karakter. Sampaikan secara pribadi ke pengguna.</small
          ></label
        >
      </template>
      <label v-else
        ><span id="user-reset-password-label">Password baru</span
        ><input
          v-model="model.resetPassword"
          aria-labelledby="user-reset-password-label"
          aria-describedby="user-reset-password-hint"
          type="password"
          autocomplete="new-password"
          minlength="8"
          maxlength="128"
          required
          :disabled="model.busy"
        /><small id="user-reset-password-hint">Minimal 8 karakter.</small></label
      >
    </div>
    <div class="form-actions">
      <button class="primary" :disabled="model.busy">
        <IconCheck :size="17" />{{ model.busy ? 'Menyimpan…' : 'Simpan akun' }}
      </button>
    </div>
  </form>
</template>
