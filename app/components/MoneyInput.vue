<script setup lang="ts">
const model = defineModel<string>({ default: '' });
defineProps<{ required?: boolean; placeholder?: string }>();
function format(value: string) {
  const [whole = '', fraction] = value.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction === undefined ? '' : `,${fraction}`);
}
function update(event: Event) {
  const input = event.target as HTMLInputElement;
  const before = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\./g, '').length;
  const clean = input.value.replace(/\./g, '').replace(/[^\d,]/g, '');
  const [whole = '', ...fractions] = clean.split(',');
  const value = (whole.replace(/^0+(?=\d)/, '') || (fractions.length ? '0' : '')) + (fractions.length ? `.${fractions.join('').slice(0, 2)}` : '');
  model.value = value;
  input.value = format(value);
  let count = 0, caret = 0;
  while (caret < input.value.length && count < before) {
    if (input.value[caret] !== '.') count++;
    caret++;
  }
  input.setSelectionRange(caret, caret);
}
</script>

<template>
  <input type="text" inputmode="decimal" :value="format(model)" :required="required" :placeholder="placeholder ?? '0'" @input="update" />
</template>
