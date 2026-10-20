<script setup lang="ts">
const dialog = ref<HTMLDialogElement | null>(null);
const title = ref(''), message = ref(''), label = ref('Lanjutkan');
let resolve: ((value: boolean) => void) | undefined;
function finish(value: boolean) { dialog.value?.close(); resolve?.(value); resolve = undefined; }
async function confirm(options: { title: string; message: string; label?: string }) {
  if (resolve) return false;
  title.value = options.title; message.value = options.message; label.value = options.label ?? 'Lanjutkan';
  const result = new Promise<boolean>(done => { resolve = done; });
  await nextTick(); dialog.value?.showModal(); return result;
}
onBeforeUnmount(() => resolve?.(false));
defineExpose({ confirm });
</script>
<template>
  <dialog ref="dialog" class="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-message" @cancel.prevent="finish(false)">
    <h2 id="confirm-title">{{ title }}</h2>
    <p id="confirm-message">{{ message }}</p>
    <div class="form-actions"><button type="button" class="secondary" autofocus @click="finish(false)">Batal</button><button type="button" class="primary" @click="finish(true)">{{ label }}</button></div>
  </dialog>
</template>
