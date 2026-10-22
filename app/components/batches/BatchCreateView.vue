<script setup lang="ts">
import { IconArrowLeft, IconCheck, IconFish, IconPlus, IconX } from '@tabler/icons-vue';
import type { UnwrapRef } from 'vue';
import type { CatalogProduct } from '#shared/types/workspace';
import type { useBatchDraft } from '../../features/batches/useBatchDraft';
import { lineTotal } from '#shared/utils/finance';
import { idr } from '../../utils/workspace-format';
import BatchDraftHpp from './BatchDraftHpp.vue';
import MoneyInput from '../MoneyInput.vue';
import ProductPicker from '../ProductPicker.vue';
defineProps<{
  model: UnwrapRef<ReturnType<typeof useBatchDraft>>;
  catalog: CatalogProduct[];
  saving: boolean;
  error: string;
}>();
defineEmits<{ back: [] }>();
</script>
<template>
  <button class="back" @click="$emit('back')"><IconArrowLeft :size="17" /> Kembali ke batch</button>
  <div class="page-heading">
    <div>
      <div class="breadcrumb">Perjalanan <span>/</span> Batch baru</div>
      <h1>Mulai perjalanan baru</h1>
      <p>Isi tanggal dan asal, lalu catat seluruh produk yang dibeli dalam satu batch.</p>
    </div>
  </div>
  <form class="entry-form batch-create" @submit.prevent="model.save">
    <h2>Informasi perjalanan</h2>
    <div class="form-grid">
      <label>Tanggal perjalanan<input v-model="model.form.date" type="date" required /></label
      ><label
        >Asal perjalanan<input v-model="model.form.origin" placeholder="Contoh: Lamongan" required
      /></label>
    </div>
    <BatchDraftHpp :model="model" />
    <section class="draft-section">
      <div class="section-heading">
        <div>
          <h2>Produk yang dibeli</h2>
          <p>Tambahkan kartu untuk setiap jenis ikan atau size yang berbeda.</p>
        </div>
        <span class="count">{{ model.products.length }} produk</span>
      </div>
      <article v-for="(product, index) in model.products" :key="product.key" class="product-card">
        <div class="section-heading">
          <h2><IconFish :size="18" /> Produk {{ index + 1 }}</h2>
          <button
            v-if="model.products.length > 1"
            type="button"
            class="icon-button"
            :aria-label="`Hapus produk ${index + 1}`"
            @click="model.products.splice(index, 1)"
          >
            <IconX :size="16" />
          </button>
        </div>
        <div class="form-grid">
          <ProductPicker
            v-model:fish="product.fish"
            v-model:size="product.size"
            :options="catalog"
            allow-other
          />
          <label
            >Bobot (kg)<input
              v-model="product.weight"
              type="number"
              inputmode="decimal"
              min="0.001"
              step="0.001"
              placeholder="0"
              required
          /></label>
          <label>Harga beli per kg (Rp)<MoneyInput v-model="product.price" required /></label>
        </div>
        <div class="product-subtotal">
          <span>Subtotal produk</span
          ><strong>{{ idr(lineTotal(product.weight, product.price)) }}</strong>
        </div>
      </article>
      <button type="button" class="add-product" @click="model.products.push(model.newProduct())">
        <IconPlus :size="18" /> Tambah produk
      </button>
    </section>
    <section class="draft-section">
      <div class="section-heading">
        <div>
          <h2>Biaya perjalanan <span class="optional">Opsional</span></h2>
          <p>Catat BBM, tol, es, atau biaya lainnya jika sudah ada.</p>
        </div>
      </div>
      <article v-for="(expense, index) in model.expenses" :key="expense.id" class="product-card">
        <div class="section-heading">
          <h2>Biaya {{ index + 1 }}</h2>
          <button
            type="button"
            class="icon-button"
            :aria-label="`Hapus biaya ${index + 1}`"
            @click="model.expenses.splice(index, 1)"
          >
            <IconX :size="16" />
          </button>
        </div>
        <div class="form-grid">
          <label
            >Kategori<select v-model="expense.category">
              <option>BBM</option>
              <option>Tol</option>
              <option>Es</option>
              <option>Makan</option>
              <option>Parkir</option>
              <option>Lainnya</option>
            </select></label
          ><label>Jumlah (Rp)<MoneyInput v-model="expense.price" required /></label
          ><label class="full-field"
            >Keterangan (opsional)<input
              v-model="expense.description"
              placeholder="Contoh: BBM perjalanan dari Lamongan"
          /></label>
        </div>
      </article>
      <button type="button" class="add-product" @click="model.expenses.push(model.newExpense())">
        <IconPlus :size="18" /> Tambah biaya
      </button>
    </section>
    <div class="draft-summary">
      <div>
        <span>Total pembelian · {{ model.products.length }} produk</span
        ><strong>{{ idr(model.total) }}</strong>
      </div>
      <div>
        <span>Biaya perjalanan</span><strong>{{ idr(model.expenseTotal) }}</strong>
      </div>
      <div class="draft-grand-total">
        <span>Total modal batch</span
        ><strong>{{ idr(model.total.plus(model.expenseTotal)) }}</strong>
      </div>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="form-actions">
      <button type="button" class="secondary" @click="$emit('back')">Batal</button
      ><button class="primary" :disabled="saving">
        <IconCheck :size="17" /> Simpan batch & pembelian
      </button>
    </div>
  </form>
</template>
