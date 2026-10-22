<script setup lang="ts">
import { IconArrowUpRight } from '@tabler/icons-vue';
import type { Batch } from '#shared/types/workspace';
import { itemAmount, metrics } from '#shared/utils/finance';
import { dateLabel, idr, kg } from '../../utils/workspace-format';
const props = defineProps<{ batch: Batch }>();
defineEmits<{ open: [batch: Batch] }>();
const totals = computed(() => metrics(props.batch.items));
</script>
<template>
  <section class="report-detail">
    <div class="section-heading">
      <div>
        <h2>Rincian {{ batch.code }} · {{ batch.origin }}</h2>
        <p>Perhitungan langsung dari transaksi saat ini</p>
      </div>
      <button class="text-button" @click="$emit('open', batch)">
        Buka batch <IconArrowUpRight :size="16" />
      </button>
    </div>
    <div class="report-weight">
      <div>
        <span>Bobot beli</span><strong>{{ kg(totals.bought) }} kg</strong>
      </div>
      <div>
        <span>Bobot terjual</span><strong>{{ kg(totals.sold) }} kg</strong>
      </div>
      <div>
        <span>Selisih bobot</span><strong>{{ kg(totals.difference) }} kg</strong>
      </div>
      <div>
        <span>HPP efektif per kg terjual</span
        ><strong>{{ totals.hpp ? idr(totals.hpp) : 'Belum tersedia' }}</strong>
      </div>
    </div>
    <div class="report-table-scroll" tabindex="0" aria-label="Rincian transaksi batch">
      <table class="report-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Jenis</th>
            <th>Ikan / kategori</th>
            <th>Size</th>
            <th>Bobot</th>
            <th>Harga / jumlah biaya</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in batch.items" :key="item.id">
            <td>{{ dateLabel(item.date) }}</td>
            <td>
              {{
                item.kind === 'purchase'
                  ? 'Pembelian'
                  : item.kind === 'sale'
                    ? 'Penjualan'
                    : 'Biaya perjalanan'
              }}
            </td>
            <td>
              {{ item.fish || 'Operasional'
              }}<small v-if="item.description">{{ item.description }}</small>
            </td>
            <td>{{ item.kind === 'expense' ? '—' : item.size || 'Campur semua size' }}</td>
            <td>{{ item.kind === 'expense' ? '—' : kg(item.weight) + ' kg' }}</td>
            <td>{{ idr(item.price) }}</td>
            <td>{{ idr(itemAmount(item)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
