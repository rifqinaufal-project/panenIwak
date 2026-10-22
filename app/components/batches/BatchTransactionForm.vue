<script setup lang="ts">
import { IconCheck, IconPlus, IconX } from '@tabler/icons-vue';
import type { UnwrapRef } from 'vue';
import type { Batch, CatalogProduct, Item } from '#shared/types/workspace';
import type { useBatchTransactions } from '../../features/batches/useBatchTransactions';
import { lineTotal } from '#shared/utils/finance';
import { idr, kg } from '../../utils/workspace-format';
import MoneyInput from '../MoneyInput.vue';
import ProductPicker from '../ProductPicker.vue';
defineProps<{
  model: UnwrapRef<ReturnType<typeof useBatchTransactions>>;
  batch: Batch;
  catalog: CatalogProduct[];
  kind: Item['kind'];
  editing: boolean;
  error: string;
  busy: boolean;
}>();
defineEmits<{ back: [] }>();
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="breadcrumb">
        Batch <span>/</span> {{ batch.code }} <span>/</span>
        {{ kind === 'sale' ? 'Penjualan' : kind === 'purchase' ? 'Pembelian' : 'Biaya perjalanan' }}
      </div>
      <h1>
        {{
          kind === 'sale'
            ? 'Catat penjualan ikan'
            : kind === 'purchase'
              ? 'Catat pembelian ikan'
              : 'Catat biaya perjalanan'
        }}
      </h1>
      <p>
        {{ batch.origin }} · {{ batch.code }} —
        {{
          kind === 'sale'
            ? 'Pilih ikan dari pembelian. Size opsional; gunakan campur untuk penjualan gabungan.'
            : 'Lengkapi rincian transaksi di bawah ini.'
        }}
      </p>
    </div>
  </div>
  <form
    v-if="kind === 'sale'"
    class="entry-form transaction-form sales-form"
    @submit.prevent="model.saveSales"
  >
    <fieldset :disabled="model.saving" class="sales-fieldset">
      <h2>{{ editing ? 'Edit penjualan' : 'Rincian penjualan' }}</h2>
      <div class="form-grid">
        <label>Tanggal penjualan<input v-model="model.entry.date" type="date" required /></label>
      </div>
      <p v-if="!model.products.length" class="form-error">
        Belum ada pembelian ikan pada batch ini. Catat pembelian terlebih dahulu.
      </p>
      <article v-for="(row, index) in model.rows" :key="row.key" class="product-card">
        <div class="section-heading">
          <h2>Item penjualan {{ index + 1 }}</h2>
          <button
            v-if="model.rows.length > 1"
            type="button"
            class="icon-button"
            :aria-label="`Hapus item penjualan ${index + 1}`"
            @click="model.rows.splice(index, 1)"
          >
            <IconX :size="16" />
          </button>
        </div>
        <div class="form-grid">
          <ProductPicker
            v-model:fish="row.fish"
            v-model:size="row.size"
            :options="model.products"
            optional-size
          /><label
            >Bobot terjual (kg)<input
              v-model="row.weight"
              type="number"
              inputmode="decimal"
              min="0.001"
              step="0.001"
              placeholder="0"
              required /></label
          ><label>Harga jual per kg (Rp)<MoneyInput v-model="row.price" required /></label>
        </div>
        <div class="product-subtotal">
          <span>Subtotal item</span><strong>{{ idr(lineTotal(row.weight, row.price)) }}</strong>
        </div>
      </article>
      <button
        v-if="!editing"
        type="button"
        class="add-product"
        @click="model.rows.push(model.newSaleRow())"
      >
        <IconPlus :size="18" /> Tambah item penjualan
      </button>
      <div class="draft-summary">
        <div>
          <span>{{ model.rows.length }} item · total bobot terjual</span
          ><strong>{{ kg(model.weight) }} kg</strong>
        </div>
        <div class="draft-grand-total">
          <span>Total penjualan</span><strong>{{ idr(model.total) }}</strong>
        </div>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="form-actions">
        <button type="button" class="secondary" @click="$emit('back')">Batal</button
        ><button class="primary" :disabled="model.saving || !model.products.length">
          <IconCheck :size="17" /> {{ model.saving ? 'Menyimpan…' : 'Simpan semua penjualan' }}
        </button>
      </div>
    </fieldset>
  </form>
  <form v-else class="entry-form transaction-form" @submit.prevent="model.saveEntry">
    <div class="section-heading">
      <h2>
        {{ editing ? 'Edit' : 'Tambah' }}
        {{ kind === 'purchase' ? 'pembelian' : 'biaya perjalanan' }}
      </h2>
      <button type="button" class="icon-button" aria-label="Batal input" @click="$emit('back')">
        <IconX :size="18" />
      </button>
    </div>
    <div class="form-grid">
      <label>Tanggal<input v-model="model.entry.date" type="date" required /></label>
      <template v-if="kind !== 'expense'"
        ><ProductPicker
          :key="kind"
          v-model:fish="model.entry.fish"
          v-model:size="model.entry.size"
          :options="catalog"
          allow-other /><label
          >Bobot (kg)<input
            v-model="model.entry.weight"
            type="number"
            step="0.001"
            min="0.001"
            inputmode="decimal"
            required /></label
      ></template>
      <label
        >{{ kind === 'expense' ? 'Jumlah biaya (Rp)' : 'Harga per kg (Rp)'
        }}<MoneyInput v-model="model.entry.price" required
      /></label>
      <label v-if="kind === 'expense'"
        >Kategori<select v-model="model.entry.fish">
          <option>BBM</option>
          <option>Tol</option>
          <option>Makan</option>
          <option>Es</option>
          <option>Parkir</option>
          <option>Lainnya</option>
        </select></label
      >
      <label v-if="kind === 'expense'"
        >Keterangan (opsional)<input v-model="model.entry.description"
      /></label>
    </div>
    <p class="preview-total">
      Total {{ idr(lineTotal(kind === 'expense' ? 1 : model.entry.weight, model.entry.price)) }}
    </p>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="form-actions">
      <button type="button" class="secondary" @click="$emit('back')">Batal</button
      ><button class="primary" :disabled="busy"><IconCheck :size="17" /> Simpan transaksi</button>
    </div>
  </form>
</template>
