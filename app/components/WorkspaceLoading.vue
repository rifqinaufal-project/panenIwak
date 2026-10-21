<script setup lang="ts">
import { IconFish } from '@tabler/icons-vue';

withDefaults(defineProps<{
  title?: string;
  description?: string;
  layout?: 'list' | 'overview' | 'session';
}>(), {
  title: 'Memuat data…',
  description: 'Mengambil data terbaru dari server. Mohon tunggu sebentar.',
  layout: 'list',
});
</script>

<template>
  <section class="workspace-loading" :class="`is-${layout}`" role="status" aria-live="polite" aria-atomic="true">
    <div class="loading-message">
      <span class="loading-mark" aria-hidden="true"><IconFish :size="24" stroke-width="1.6" /></span>
      <div><h2>{{ title }}</h2><p>{{ description }}</p></div>
    </div>
    <div v-if="layout !== 'session'" class="loading-preview" aria-hidden="true">
      <template v-if="layout === 'overview'">
        <div class="loading-metrics">
          <div v-for="index in 4" :key="index" class="loading-card">
            <span class="skeleton skeleton-label"></span><span class="skeleton skeleton-value"></span><span class="skeleton skeleton-note"></span>
          </div>
        </div>
        <div class="loading-card loading-chart"><span class="skeleton skeleton-label"></span><span class="skeleton skeleton-plot"></span></div>
      </template>
      <div v-else class="loading-list">
        <div class="loading-list-heading"><span class="skeleton skeleton-label"></span><span class="skeleton skeleton-note"></span></div>
        <div v-for="index in 4" :key="index" class="loading-row">
          <span class="skeleton skeleton-icon"></span>
          <div><span class="skeleton skeleton-label"></span><span class="skeleton skeleton-note"></span></div>
          <span class="skeleton skeleton-end"></span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.workspace-loading { min-width: 0; padding: 24px; border-radius: 22px; background: var(--panel, #f5f5f6); }
.loading-message { display: flex; align-items: center; gap: 14px; }
.loading-mark { display: grid; place-items: center; flex: 0 0 48px; height: 48px; border: 1px solid var(--line); border-radius: 14px; background: #fff; color: var(--ink); }
.loading-message h2 { margin: 0; color: var(--ink); font-size: 17px; font-weight: 600; line-height: 1.5; }
.loading-message p { max-width: 48ch; margin: 5px 0 0; color: #696d75; font-size: 13px; line-height: 1.7; }
.loading-preview { margin-top: 24px; }
.loading-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.loading-card, .loading-list { min-width: 0; border: 1px solid var(--line); border-radius: 16px; background: #fff; }
.loading-card { display: grid; gap: 16px; padding: 22px; }
.loading-chart { margin-top: 12px; }
.skeleton { display: block; max-width: 100%; height: 12px; border-radius: 5px; background: #e9ebef; animation: loading-breathe 1.8s ease-in-out infinite; }
.skeleton-label { width: 120px; }
.skeleton-note { width: 80px; height: 9px; }
.skeleton-value { width: 160px; height: 28px; }
.skeleton-plot { width: 100%; height: 180px; background: #f1f2f5; }
.loading-list-heading { display: flex; justify-content: space-between; gap: 16px; padding: 22px; border-bottom: 1px solid var(--line); }
.loading-row { display: grid; grid-template-columns: 36px minmax(0, 1fr) minmax(48px, 100px); align-items: center; gap: 14px; padding: 22px; }
.loading-row + .loading-row { border-top: 1px solid var(--line); }
.loading-row > div { display: grid; gap: 10px; }
.skeleton-icon { width: 36px; height: 36px; border-radius: 10px; }
.skeleton-end { width: 100%; }
.workspace-loading.is-session { display: grid; place-items: center; min-height: 100dvh; padding: 24px; border-radius: 0; background: #fff; }
.is-session .loading-message { flex-direction: column; text-align: center; }
@keyframes loading-breathe { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@media (max-width: 767px) {
  .workspace-loading { padding: 18px 16px; border-radius: 20px; }
  .loading-message { align-items: flex-start; gap: 12px; }
  .loading-message h2 { font-size: 16px; }
  .loading-mark { flex-basis: 40px; height: 40px; border-radius: 12px; }
  .loading-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .loading-card, .loading-list-heading, .loading-row { padding: 16px 12px; }
  .loading-row { grid-template-columns: 32px minmax(0, 1fr) 48px; gap: 10px; }
  .skeleton-icon { width: 32px; height: 32px; }
}
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
</style>
