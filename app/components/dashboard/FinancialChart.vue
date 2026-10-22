<script setup lang="ts">
import { IconDownload } from '@tabler/icons-vue';
import type { Batch } from '#shared/types/workspace';
import { itemAmount } from '#shared/utils/finance';
import { idr, kg } from '../../utils/workspace-format';

const props = defineProps<{ batches: Batch[] }>();
defineEmits<{ download: [] }>();
const hoverDay = ref<number | null>(null);
const trend = computed(() => {
  const values = Array.from({ length: 7 }, () => ({ revenue: 0, cost: 0 }));
  for (const batch of props.batches)
    for (const item of batch.items) {
      const index = (new Date(`${item.date}T12:00:00`).getDay() + 6) % 7;
      const value = itemAmount(item).toNumber();
      if (item.kind === 'sale') values[index]!.revenue += value;
      else values[index]!.cost += value;
    }
  return values;
});
const maximum = computed(
  () => Math.max(1000000, ...trend.value.flatMap((day) => [day.revenue, day.cost])) * 1.2,
);
const chartPath = (key: 'revenue' | 'cost') =>
  trend.value
    .map(
      (day, index) =>
        `${index ? 'L' : 'M'} ${60 + index * 170} ${225 - (day[key] / maximum.value) * 190}`,
    )
    .join(' ');
</script>
<template>
  <section class="chart-section">
    <div class="section-heading">
      <div>
        <h2>Arus usaha</h2>
        <p>Pendapatan dan biaya dari batch pada periode terpilih</p>
      </div>
      <div class="legend">
        <span><i class="blue"></i>Pendapatan</span><span><i class="orange"></i>Biaya</span
        ><button class="icon-button" aria-label="Unduh data grafik" @click="$emit('download')">
          <IconDownload :size="17" />
        </button>
      </div>
    </div>
    <div class="chart">
      <div class="y-labels">
        <span v-for="ratio in [1, 0.75, 0.5, 0.25, 0]" :key="ratio"
          >{{ kg((maximum * ratio) / 1000000) }} jt</span
        >
      </div>
      <svg
        viewBox="0 0 1140 260"
        preserveAspectRatio="none"
        role="img"
        aria-label="Grafik pendapatan dan biaya per hari"
      >
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3777e8" stop-opacity=".10" />
            <stop offset="100%" stop-color="#3777e8" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="revenue-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3777e8" stop-opacity=".75" />
            <stop offset="100%" stop-color="#c4d9ff" stop-opacity=".3" />
          </linearGradient>
        </defs>
        <line
          v-for="y in [35, 82.5, 130, 177.5, 225]"
          :key="y"
          x1="0"
          x2="1140"
          :y1="y"
          :y2="y"
          stroke="#edf0f3"
        />
        <path :d="`${chartPath('revenue')} L 1080 225 L 60 225 Z`" fill="url(#area)" />
        <rect
          v-for="(day, index) in trend"
          :key="`bar-${index}`"
          :x="42 + index * 170"
          :y="225 - (day.revenue / maximum) * 190"
          :height="(day.revenue / maximum) * 190"
          width="36"
          rx="8"
          fill="url(#revenue-bar)"
        />
        <path
          :d="chartPath('revenue')"
          fill="none"
          stroke="#3777e8"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
        <path
          :d="chartPath('cost')"
          fill="none"
          stroke="#e5a167"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
        <g
          v-for="(day, index) in trend"
          :key="index"
          @mouseenter="hoverDay = index"
          @mouseleave="hoverDay = null"
        >
          <rect :x="index * 163" y="0" width="163" height="260" fill="transparent" />
          <circle
            :cx="60 + index * 170"
            :cy="225 - (day.revenue / maximum) * 190"
            :r="hoverDay === index ? 6 : 3"
            fill="#3777e8"
            stroke="white"
            stroke-width="2"
          />
        </g>
      </svg>
      <div
        v-if="hoverDay !== null"
        class="chart-tooltip"
        :style="{ left: `${Math.min(78, 8 + hoverDay * 13)}%` }"
      >
        <strong>{{
          ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'][hoverDay]
        }}</strong>
        <span
          >Pendapatan <b>{{ idr(trend[hoverDay]!.revenue) }}</b></span
        ><span
          >Biaya <b>{{ idr(trend[hoverDay]!.cost) }}</b></span
        >
      </div>
      <div class="x-labels">
        <span v-for="day in ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']" :key="day">{{
          day
        }}</span>
      </div>
    </div>
  </section>
</template>
