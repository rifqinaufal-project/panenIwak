<script setup lang="ts">
import { useLegacyImportPanel } from '../composables/useLegacyImportPanel';

const emit = defineEmits<{ imported: []; busy: [value: boolean] }>();
const model = useLegacyImportPanel({
  imported: () => emit('imported'),
  busy: (value) => emit('busy', value),
});
</script>

<template>
  <section class="legacy-import">
    <h2>Data lokal sebelum login</h2>
    <p>
      Data lama tidak otomatis dimasukkan ke akun mana pun. Admin dapat memeriksa dan memilih data
      milik usaha ini. Impor memerlukan internet dan akan tercatat atas username admin saat ini.
    </p>
    <button v-if="!model.viewed" class="secondary" @click="model.preview">Periksa data lama</button>
    <WorkspaceLoading v-else-if="model.checking" title="Memeriksa data lama…" layout="list" />
    <template v-else>
      <p role="status">{{ model.status }}</p>
      <div v-for="row in model.rows" :key="row.id" class="legacy-row">
        <label
          ><input
            v-model="model.selected"
            type="checkbox"
            :value="row.id"
            :disabled="model.busy"
          />{{ row.code }} · {{ row.origin }} · {{ row.date }} ·
          {{ row.items.length }} transaksi</label
        >
      </div>
      <label v-if="model.products.length" class="legacy-row"
        ><input v-model="model.includeProducts" type="checkbox" :disabled="model.busy" /> Sertakan
        {{ model.products.length }} master produk lokal</label
      >
      <button
        class="primary"
        :disabled="model.busy || (!model.selected.length && !model.includeProducts)"
        @click="model.importSelected"
      >
        {{ model.busy ? 'Mengimpor…' : 'Impor data terpilih' }}
      </button>
    </template>
  </section>
</template>
