<script setup lang="ts">
import { IconCheck, IconX } from '@tabler/icons-vue';
defineProps<{ message: string }>();
defineEmits<{ close: [] }>();
</script>
<template>
  <Transition name="toast">
    <div v-if="message" class="toast-message" role="status">
      <IconCheck :size="18" />{{ message
      }}<button aria-label="Tutup pemberitahuan" @click="$emit('close')">
        <IconX :size="16" />
      </button>
    </div>
  </Transition>
</template>
