<script setup lang="ts">
const fish = defineModel<string>('fish', { default: '' });
const size = defineModel<string>('size', { default: '' });
const props = defineProps<{ options: { fish: string; size: string }[]; allowOther?: boolean; optionalSize?: boolean }>();
const other = ref(false);
const names = computed(() => [...new Set(props.options.map(p => p.fish))]);
const sizes = computed(() => [...new Set(props.options.filter(p => p.fish === fish.value).map(p => p.size))]);
function choose(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  other.value = value === '__other';
  fish.value = other.value ? '' : value;
  size.value = '';
}
</script>

<template>
  <label>Jenis ikan<select :value="other ? '__other' : fish" required @change="choose"><option value="" disabled>Pilih ikan</option><option v-for="name in names" :key="name" :value="name">{{ name }}</option><option v-if="allowOther" value="__other">Lainnya — isi manual</option></select></label>
  <label v-if="!other">{{ optionalSize ? 'Size (opsional)' : 'Size' }}<select v-model="size" :required="!optionalSize" :disabled="!fish"><option value="" :disabled="!optionalSize">{{ optionalSize ? 'Campur semua size' : 'Pilih size' }}</option><option v-for="s in sizes" :key="s" :value="s">{{ s }}</option></select><small v-if="optionalSize">Biarkan campur jika penjualan tidak dipisahkan per size.</small></label>
  <template v-else><label>Nama ikan lainnya<input v-model="fish" placeholder="Masukkan nama ikan" required /></label><label>Size<input v-model="size" placeholder="Contoh: 8, 10–12, atau Besar" required /></label></template>
</template>
