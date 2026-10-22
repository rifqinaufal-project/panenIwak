<script setup lang="ts">
import { IconArrowLeft, IconCheck, IconEdit, IconFish, IconTrash } from '@tabler/icons-vue';
import type { UnwrapRef } from 'vue';
import type { CatalogProduct } from '#shared/types/workspace';
import type { useProductCatalog } from '../../features/products/useProductCatalog';

defineProps<{
  model: UnwrapRef<ReturnType<typeof useProductCatalog>>;
  products: CatalogProduct[];
  formVisible: boolean;
  editingId: string | null;
}>();
defineEmits<{ back: []; edit: [product: CatalogProduct] }>();
</script>
<template>
  <section class="catalog-page">
    <template v-if="formVisible">
      <button class="back" @click="$emit('back')">
        <IconArrowLeft :size="17" /> Kembali ke daftar produk
      </button>
      <form class="entry-form catalog-form" @submit.prevent="model.save">
        <h2>{{ editingId ? 'Edit produk ikan' : 'Tambah produk ikan' }}</h2>
        <p>
          Setiap produk merupakan pasangan nama ikan dan size. Satu ikan dapat memiliki beberapa
          size.
        </p>
        <div class="form-grid">
          <label
            ><span id="catalog-fish-label">Nama ikan</span
            ><input
              v-model="model.form.fish"
              aria-labelledby="catalog-fish-label"
              aria-describedby="catalog-fish-hint"
              maxlength="100"
              placeholder="Contoh: Nila"
              required
            /><small id="catalog-fish-hint"
              >Gunakan nama ikan yang biasa dicatat saat pembelian.</small
            ></label
          >
          <label
            ><span id="catalog-size-label">Size</span
            ><input
              v-model="model.form.size"
              aria-labelledby="catalog-size-label"
              aria-describedby="catalog-size-hint"
              maxlength="50"
              placeholder="Contoh: 8, 10–12, atau Besar"
              required
            /><small id="catalog-size-hint"
              >Wajib diisi. Satu jenis ikan dapat memiliki beberapa size.</small
            ></label
          >
        </div>
        <p v-if="model.error" class="form-error" role="alert">{{ model.error }}</p>
        <div class="form-actions">
          <button type="button" class="secondary" @click="$emit('back')">Batal</button
          ><button class="primary" :disabled="model.saving">
            <IconCheck :size="17" />
            {{ model.saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : 'Simpan produk' }}
          </button>
        </div>
      </form>
    </template>
    <section v-else class="catalog-list">
      <p v-if="model.error" class="form-error" role="alert">{{ model.error }}</p>
      <div class="list-toolbar">
        <h2>
          Daftar produk <span class="count">{{ products.length }}</span>
        </h2>
      </div>
      <div v-if="products.length" class="catalog-row catalog-head">
        <span>Nama ikan</span><span>Size</span><span class="catalog-action-label">Tindakan</span>
      </div>
      <div v-for="product in products" :key="product.id" class="catalog-row">
        <div class="catalog-fish">
          <span class="catalog-fish-icon" aria-hidden="true"
            ><IconFish :size="20" stroke-width="1.6" /></span
          ><strong>{{ product.fish }}</strong>
        </div>
        <span
          ><span class="catalog-size">{{ product.size }}</span></span
        >
        <div class="catalog-actions">
          <button
            type="button"
            class="icon-button"
            :disabled="model.saving"
            :aria-label="`Edit ${product.fish} size ${product.size}`"
            title="Edit produk"
            @click="$emit('edit', product)"
          >
            <IconEdit :size="16" />
          </button>
          <button
            type="button"
            class="icon-button danger"
            :disabled="model.saving"
            :aria-label="`Hapus ${product.fish} size ${product.size}`"
            title="Hapus produk"
            @click="model.remove(product)"
          >
            <IconTrash :size="16" />
          </button>
        </div>
      </div>
      <div v-if="!products.length" class="empty">
        <IconFish :size="30" />
        <h2>Belum ada produk ikan</h2>
        <p>Tambahkan nama ikan dan size untuk digunakan saat mencatat pembelian.</p>
      </div>
    </section>
  </section>
</template>
