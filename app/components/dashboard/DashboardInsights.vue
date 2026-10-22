<script setup lang="ts">
import {
  IconArrowRight,
  IconArrowUpRight,
  IconChartBar,
  IconPackage,
  IconShieldCheck,
} from '@tabler/icons-vue';
import { metrics } from '#shared/utils/finance';
import { idr, kg } from '../../utils/workspace-format';

const props = defineProps<{ totals: ReturnType<typeof metrics> }>();
const composition = computed(() => [
  { label: 'Pembelian ikan', amount: props.totals.purchases, color: '#3777e8' },
  { label: 'Biaya perjalanan', amount: props.totals.expense, color: '#a9c6f6' },
]);
</script>
<template>
  <aside class="dashboard-insights" aria-label="Kinerja usaha">
    <div class="section-heading panel-heading">
      <div>
        <h2>Kinerja usaha</h2>
        <p>Laba, bobot, dan alokasi modal.</p>
      </div>
      <IconChartBar :size="19" class="muted" />
    </div>
    <section class="performance-card">
      <div class="metric-label">Laba operasional berjalan <IconArrowUpRight :size="18" /></div>
      <strong :class="totals.profit.isNegative() ? 'red' : ''">{{ idr(totals.profit) }}</strong>
      <div class="performance-foot">
        <span
          class="badge"
          :class="totals.margin === null ? '' : totals.profit.isNegative() ? 'warning' : 'complete'"
          >Margin {{ totals.margin === null ? '—' : kg(totals.margin) + '%' }}</span
        ><span>Perhitungan berjalan</span>
      </div>
    </section>
    <section class="weight-card">
      <div class="section-heading">
        <h2>Pergerakan bobot</h2>
        <IconPackage :size="18" class="muted" />
      </div>
      <div class="weight-summary">
        <div>
          <span>Dibeli</span><strong>{{ kg(totals.bought) }} <small>kg</small></strong>
        </div>
        <IconArrowRight :size="18" />
        <div>
          <span>Terjual</span><strong>{{ kg(totals.sold) }} <small>kg</small></strong>
        </div>
      </div>
      <div class="weight-difference">
        <span>Selisih bobot</span
        ><strong
          >{{ totals.difference.greaterThan(0) ? '+' : '' }}{{ kg(totals.difference) }} kg</strong
        >
      </div>
      <p>
        {{
          totals.bought.isZero() && totals.sold.isZero()
            ? 'Belum ada pembelian atau penjualan pada periode ini.'
            : totals.difference.isZero()
              ? 'Bobot pembelian dan penjualan seimbang.'
              : totals.difference.isNegative()
                ? 'Penjualan masih berjalan. Selisih belum berarti kerugian.'
                : 'Tonjolan bobot tercatat, bukan tambahan pendapatan.'
        }}
      </p>
    </section>
    <section class="cost-section">
      <div class="section-heading">
        <div>
          <h2>Komposisi biaya</h2>
          <p>Alokasi modal perjalanan.</p>
        </div>
        <IconChartBar :size="19" class="muted" />
      </div>
      <div class="cost-total">
        <span>Total biaya tercatat</span><strong>{{ idr(totals.cost) }}</strong>
      </div>
      <div class="cost-bar" :class="{ 'is-empty': totals.cost.isZero() }">
        <span
          v-for="cost in composition"
          :key="cost.label"
          :style="{
            flex: totals.cost.isZero() ? 1 : cost.amount.div(totals.cost).toNumber(),
            background: cost.color,
          }"
        ></span>
      </div>
      <div class="cost-lines">
        <div v-for="cost in composition" :key="cost.label">
          <span><i :style="{ background: cost.color }"></i>{{ cost.label }}</span
          ><strong>{{ idr(cost.amount) }}</strong
          ><small
            >{{
              totals.cost.isZero() ? 0 : cost.amount.div(totals.cost).times(100).toFixed(1)
            }}%</small
          >
        </div>
      </div>
      <div class="cost-note">
        <IconShieldCheck :size="16" /> Perhitungan menggunakan seluruh transaksi tercatat.
      </div>
    </section>
  </aside>
</template>
