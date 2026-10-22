<script setup lang="ts">
import { IconArrowRight, IconArrowUpRight, IconReceipt, IconTruck } from '@tabler/icons-vue';
import type { Batch } from '#shared/types/workspace';
import { metrics } from '#shared/utils/finance';
import { dateLabel, idr, kg } from '../../utils/workspace-format';
import DashboardInsights from './DashboardInsights.vue';
import FinancialChart from './FinancialChart.vue';

defineProps<{ batches: Batch[]; totals: ReturnType<typeof metrics> }>();
defineEmits<{ open: [batch: Batch]; allBatches: []; download: [] }>();
</script>
<template>
  <div class="dashboard-layout">
    <section class="dashboard-overview" aria-label="Ringkasan usaha">
      <div class="section-heading panel-heading">
        <div>
          <h2>Ringkasan usaha</h2>
          <p>Pendapatan, modal, dan perjalanan Anda.</p>
        </div>
        <span class="server-status"><span class="tiny-dot"></span> Data server</span>
      </div>
      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Total pendapatan <IconArrowUpRight :size="17" /></div>
          <strong>{{ idr(totals.revenue) }}</strong>
          <div class="metric-foot">
            <span :class="{ green: !totals.sold.isZero() }"
              ><IconArrowUpRight :size="14" />
              {{ totals.sold.isZero() ? 'Belum ada penjualan' : 'Penjualan tercatat' }}</span
            ><span>{{ kg(totals.sold) }} kg terjual</span>
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">Total biaya <IconReceipt :size="17" /></div>
          <strong>{{ idr(totals.cost) }}</strong>
          <div class="metric-foot">
            <span>Pembelian + perjalanan</span><span>{{ batches.length }} batch</span>
          </div>
        </div>
      </div>
      <FinancialChart :batches="batches" @download="$emit('download')" />
      <section class="recent-section">
        <div class="section-heading">
          <div>
            <h2>
              Perjalanan terbaru <span class="count">{{ batches.length }}</span>
            </h2>
            <p>Pembelian dan penjualan terbaru.</p>
          </div>
          <button class="text-button" @click="$emit('allBatches')">
            Semua batch <IconArrowRight :size="16" />
          </button>
        </div>
        <div class="mini-table">
          <div class="table-head">
            <span>Batch / rute</span><span>Status</span><span>Pendapatan</span><span></span>
          </div>
          <button
            v-for="batch in batches.slice(0, 3)"
            :key="batch.id"
            class="mini-row"
            @click="$emit('open', batch)"
          >
            <span class="route-cell"
              ><span class="route-icon"><IconTruck :size="21" stroke-width="1.5" /></span
              ><span
                ><strong>{{ batch.origin }}</strong
                ><small>{{ batch.code }} <i>·</i> {{ dateLabel(batch.date) }}</small></span
              ></span
            >
            <span
              ><span class="badge" :class="batch.closed ? 'complete' : 'in-progress'"
                ><i></i>{{ batch.closed ? 'Selesai' : 'Aktif' }}</span
              ></span
            >
            <strong class="row-money">{{ idr(metrics(batch.items).revenue) }}</strong
            ><IconArrowUpRight :size="17" class="row-arrow" />
          </button>
          <div v-if="!batches.length" class="empty">Belum ada batch pada periode ini.</div>
        </div>
      </section>
    </section>
    <DashboardInsights :totals="totals" />
  </div>
</template>
