<script setup lang="ts">
import { createAuditDiff } from '#shared/utils/audit-diff';

const props = defineProps<{ before?: unknown; after?: unknown }>();
const expanded = ref(false);
// Large documents are compared only when the user expands this activity.
const diff = computed(() => createAuditDiff(props.before, props.after));
const labels = { added: 'Ditambahkan', removed: 'Dihapus', updated: 'Diubah' };
function toggle(event: Event) { expanded.value = (event.currentTarget as HTMLDetailsElement).open; }
</script>

<template>
  <details class="audit-changes" @toggle="toggle">
    <summary>Lihat perubahan</summary>
    <div v-if="expanded" class="audit-diff">
      <p v-if="diff.incomplete" class="audit-diff-notice">Sebagian rincian tidak dapat dibandingkan karena format data lama tidak lengkap atau tidak valid.</p>
      <p v-else-if="!diff.groups.length" class="audit-diff-notice">Tidak ada perubahan pada data usaha yang ditampilkan.</p>
      <section v-for="group in diff.groups" :key="group.key" class="audit-group">
        <div class="audit-group-heading">
          <h3>{{ group.title }}</h3><span class="audit-kind" :class="group.kind">{{ labels[group.kind] }}</span>
        </div>
        <dl class="audit-fields">
          <div v-for="field in group.fields" :key="field.key" class="audit-field" :class="{ 'is-long-text': field.key === 'description' }">
            <dt>{{ field.label }}</dt>
            <dd><small>Sebelum</small><span>{{ field.before ?? '—' }}</span></dd>
            <dd><small>Sesudah</small><span>{{ field.after ?? '—' }}</span></dd>
          </div>
        </dl>
      </section>
    </div>
  </details>
</template>

<style scoped>
.audit-changes > summary { padding-block: 12px; color: #3f5e91; font-size: 12px; font-weight: 500; line-height: 20px; }
.audit-diff { display: grid; gap: 12px; min-width: 0; }
.audit-group { min-width: 0; padding: 16px; border: 1px solid var(--line); border-radius: 12px; background: #fafbfc; }
.audit-group-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.audit-group h3 { margin: 0; color: var(--ink); font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.audit-kind { flex: 0 0 auto; padding: 4px 7px; border-radius: 5px; background: #edf0f5; color: #4b5f7c; font-size: 10px; }
.audit-kind.added { background: #e8f3ed; color: #287153; }
.audit-kind.removed { background: #faecee; color: #a84352; }
.audit-fields { margin: 12px 0 0; }
.audit-field { display: grid; grid-template-columns: minmax(100px, .8fr) repeat(2, minmax(0, 1fr)); gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); }
.audit-field dt { color: #606b7b; font-size: 12px; line-height: 1.7; }
.audit-field dd { min-width: 0; margin: 0; color: #303c4e; font-size: 12px; line-height: 1.7; }
.audit-field dd small { display: block; margin-bottom: 4px; color: #717989; font-size: 10px; }
.audit-field dd span { white-space: pre-wrap; overflow-wrap: anywhere; }
.audit-diff-notice { margin: 0; color: #697487; font-size: 12px; line-height: 1.7; }
@media (max-width: 767px) {
  .audit-group { padding: 12px; }
  .audit-group-heading { flex-wrap: wrap; gap: 8px; }
  .audit-field { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
  .audit-field dt { grid-column: 1 / -1; font-weight: 500; }
  .audit-field.is-long-text dd { grid-column: 1 / -1; }
}
</style>
