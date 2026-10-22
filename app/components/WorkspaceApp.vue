<script setup lang="ts">
import { useWorkspace } from '../features/workspace/useWorkspace';
import WorkspaceHeader from './workspace/WorkspaceHeader.vue';
import WorkspaceHeading from './workspace/WorkspaceHeading.vue';
import WorkspaceFooter from './workspace/WorkspaceFooter.vue';
import WorkspaceToast from './workspace/WorkspaceToast.vue';
import DashboardView from './dashboard/DashboardView.vue';
import BatchList from './batches/BatchList.vue';
import BatchCreateView from './batches/BatchCreateView.vue';
import BatchWorkspaceView from './batches/BatchWorkspaceView.vue';
import ProductCatalogView from './products/ProductCatalogView.vue';
import ReportsView from './reports/ReportsView.vue';
import ActivityView from './activity/ActivityView.vue';

const workspace = useWorkspace();
const {
  data,
  routing,
  session,
  batch,
  draft,
  sales,
  catalog,
  overview,
  reports,
  accountState,
  importing,
  online,
  toast,
  confirmDialog,
} = toRefs(workspace);
const router = useRouter();
</script>

<template>
  <WorkspaceLoading
    v-if="!session.checked"
    layout="session"
    title="Menyiapkan Panen Iwak"
    description="Memeriksa sesi masuk Anda…"
  />
  <LoginScreen v-else-if="!data.currentUser" @authenticated="session.authenticated" />
  <div v-else class="application">
    <WorkspaceHeader
      :user="data.currentUser"
      :page="routing.page"
      :online="online"
      :batch-count="data.batches.length"
      :signing-out="session.signingOut"
      @navigate="routing.go"
      @logout="session.logout"
    />
    <main>
      <div v-if="data.workspaceError" class="form-error" role="alert">
        {{ data.workspaceError }}
        <button class="secondary" @click="data.loadWorkspace">Coba muat ulang</button>
      </div>
      <p v-if="!online" class="form-error">
        Anda offline. Data pada layar belum tentu terbaru; perubahan belum bisa disimpan ke server.
        Jangan tutup formulir yang belum tersimpan.
      </p>
      <section v-if="routing.issue" class="empty route-error" role="alert">
        <h1>Halaman tidak tersedia</h1>
        <p>{{ routing.issue }}</p>
        <button class="secondary" @click="routing.go(routing.page)">Kembali ke daftar</button>
      </section>
      <WorkspaceLoading
        v-else-if="!data.ready"
        :layout="routing.page === 'Dashboard' ? 'overview' : 'list'"
        :title="`Memuat ${routing.page.toLowerCase()}…`"
      />
      <template v-else-if="!data.workspaceError">
        <template v-if="!routing.active && !routing.showForm">
          <WorkspaceHeading
            v-model:period="overview.period"
            :page="routing.page"
            :revenue="overview.totals.revenue"
            :batch-count="overview.visible.length"
            :product-form="routing.showProductForm"
            :editing-product="!!routing.editingProductId"
            @download="routing.page === 'Laporan' ? reports.download() : overview.download()"
            @new-batch="router.push('/batch/baru')"
            @new-product="router.push('/produk/baru')"
          />
          <DashboardView
            v-if="routing.page === 'Dashboard'"
            :batches="overview.visible"
            :totals="overview.totals"
            @open="routing.openBatch"
            @all-batches="routing.go('Batch')"
            @download="overview.download"
          />
          <BatchList
            v-if="routing.page === 'Batch'"
            v-model:search="overview.search"
            :batches="overview.visible"
            @open="routing.openBatch"
          />
          <ReportsView
            v-if="routing.page === 'Laporan'"
            :model="reports"
            :batches="data.batches"
            @open="routing.openBatch"
          />
          <ActivityView
            v-if="routing.page === 'Log'"
            :logs="data.activityLogs"
            :batches="data.batches"
            @open="routing.openBatch"
          />
          <ProductCatalogView
            v-if="routing.page === 'Produk'"
            :model="catalog"
            :products="data.catalog"
            :form-visible="routing.showProductForm"
            :editing-id="routing.editingProductId"
            @back="routing.go('Produk')"
            @edit="routing.editProduct"
          />
          <template v-if="routing.page === 'Pengguna' && data.currentUser.role === 'admin'">
            <UsersPanel
              :current-user="data.currentUser"
              @changed="data.refreshActivity"
              @form-state="accountState = $event"
            />
            <LegacyImport @imported="data.refreshWorkspace" @busy="importing = $event" />
          </template>
        </template>
        <BatchCreateView
          v-if="routing.showForm"
          :model="draft"
          :catalog="data.catalog"
          :saving="batch.saving"
          :error="batch.error"
          @back="routing.go('Batch')"
        />
        <BatchWorkspaceView
          v-if="routing.active"
          :batch="routing.active"
          :catalog="data.catalog"
          :managing="routing.managingBatch"
          :kind="routing.transaction"
          :editing="!!routing.editingItemId"
          :operations="batch"
          :transactions="sales"
          @back="routing.backFromBatch"
          @manage="routing.manageBatch"
          @finish="routing.openBatch(routing.active)"
          @start="routing.startTransaction"
          @edit="routing.editItem"
        />
        <p
          v-if="batch.error && !routing.showForm && !routing.transaction"
          class="form-error"
          role="alert"
        >
          {{ batch.error }}
        </p>
      </template>
    </main>
    <ConfirmDialog ref="confirmDialog" />
    <WorkspaceFooter :username="data.currentUser.username" />
    <WorkspaceToast :message="toast" @close="toast = ''" />
  </div>
</template>
