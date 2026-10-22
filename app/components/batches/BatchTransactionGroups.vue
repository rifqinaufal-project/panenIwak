<script setup lang="ts">
import { IconFish, IconPackage, IconReceipt } from '@tabler/icons-vue';
import type { Batch, Item } from '#shared/types/workspace';
import { itemAmount, metrics, productHpps } from '#shared/utils/finance';
import { dateLabel, idr, kg } from '../../utils/workspace-format';
const props = defineProps<{ batch: Batch; managing: boolean; busy: boolean }>();
defineEmits<{ edit: [item: Item]; remove: [item: Item] }>();
const totals = computed(() => metrics(props.batch.items));
const hpps = computed(() => productHpps(props.batch.items));
const groups = [
  {
    kind: 'purchase',
    title: 'Pembelian ikan',
    hint: 'Produk dan modal pembelian ikan.',
    metric: 'purchases',
  },
  {
    kind: 'expense',
    title: 'Biaya perjalanan',
    hint: 'Tol, BBM, es, dan biaya operasional lainnya.',
    metric: 'expense',
  },
  {
    kind: 'sale',
    title: 'Penjualan ikan',
    hint: 'Ikan terjual dan pendapatan yang tercatat.',
    metric: 'revenue',
  },
] as const;
</script>
<template>
  <section v-for="group in groups" :key="group.kind" class="transactions batch-transaction-group">
    <div class="section-heading">
      <div>
        <h2>
          {{ group.title }}
          <span class="count">{{
            batch.items.filter((item) => item.kind === group.kind).length
          }}</span>
        </h2>
        <p>{{ group.hint }}</p>
        <p v-if="group.kind === 'purchase'" class="purchase-hpp-help">
          HPP/kg = harga beli rata-rata ikan & size yang sama + alokasi biaya perjalanan per kg
          beli.
        </p>
      </div>
      <div class="group-total">
        <span>{{ group.kind === 'sale' ? 'Total pendapatan' : 'Total biaya' }}</span
        ><strong>{{ idr(totals[group.metric]) }}</strong>
      </div>
    </div>
    <div
      v-for="item in batch.items.filter((item) => item.kind === group.kind)"
      :key="item.id"
      class="transaction-row"
    >
      <span class="route-icon"
        ><component
          :is="
            item.kind === 'expense'
              ? IconReceipt
              : item.kind === 'purchase'
                ? IconPackage
                : IconFish
          "
          :size="20"
      /></span>
      <div>
        <strong
          >{{
            item.kind === 'purchase' ? 'Pembelian' : item.kind === 'sale' ? 'Penjualan' : 'Biaya'
          }}
          {{ item.fish }}</strong
        ><small>{{
          item.kind === 'expense'
            ? item.description
            : `${kg(item.weight)} kg · ${idr(item.price)} / kg · ${item.size ? 'Size ' + item.size : 'Campur semua size'}`
        }}</small>
      </div>
      <span class="transaction-date">{{ dateLabel(item.date) }}</span
      ><strong>{{ idr(itemAmount(item)) }}</strong>
      <div v-if="item.kind === 'purchase'" class="purchase-row-hpp">
        <template
          v-for="row in hpps.filter(
            (row) =>
              row.fish.toLowerCase() === item.fish.toLowerCase() &&
              row.size.toLowerCase() === item.size.toLowerCase(),
          )"
          :key="JSON.stringify([row.fish, row.size])"
          ><span>HPP produk / kg</span><strong>{{ row.hpp === null ? '—' : idr(row.hpp) }}</strong
          ><small
            >{{ row.purchasePerKg === null ? '—' : idr(row.purchasePerKg) }} beli +
            {{ idr(row.expensePerKg) }} biaya</small
          ></template
        >
      </div>
      <div v-if="managing" class="transaction-actions">
        <button type="button" class="secondary" :disabled="busy" @click="$emit('edit', item)">
          Edit</button
        ><button type="button" class="secondary" :disabled="busy" @click="$emit('remove', item)">
          Hapus
        </button>
      </div>
    </div>
    <div v-if="!batch.items.some((item) => item.kind === group.kind)" class="empty">
      <IconReceipt :size="32" />
      <h2>Belum ada {{ group.title.toLowerCase() }}.</h2>
      <p>
        {{
          batch.closed
            ? 'Tidak ada catatan pada bagian ini.'
            : 'Gunakan tombol tambah di bagian atas untuk mencatat transaksi.'
        }}
      </p>
    </div>
  </section>
</template>
