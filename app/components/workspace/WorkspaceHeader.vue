<script setup lang="ts">
import {
  IconBell,
  IconChartBar,
  IconCheck,
  IconFish,
  IconLayersIntersect,
  IconLayoutGrid,
  IconReceipt,
  IconUsers,
  IconWifi,
  IconWifiOff,
} from '@tabler/icons-vue';
import type { Profile } from '#shared/types/auth';
import type { WorkspacePage } from '#shared/utils/workspace-routes';
import { useMobileNavScroll } from '../../composables/useMobileNavScroll';

const props = defineProps<{
  user: Profile;
  page: WorkspacePage;
  online: boolean;
  batchCount: number;
  signingOut: boolean;
}>();
defineEmits<{ navigate: [page: WorkspacePage]; logout: [] }>();
const notice = ref(false);
const navScroll = useMobileNavScroll();
const navigation = computed(() =>
  [
    { name: 'Dashboard' as const, icon: IconLayoutGrid, admin: true },
    { name: 'Batch' as const, icon: IconLayersIntersect },
    { name: 'Produk' as const, icon: IconFish },
    { name: 'Laporan' as const, icon: IconChartBar, admin: true },
    { name: 'Log' as const, icon: IconReceipt },
    { name: 'Pengguna' as const, icon: IconUsers, admin: true },
  ].filter((item) => !item.admin || props.user.role === 'admin'),
);
watch(
  () => props.page,
  () => {
    notice.value = false;
  },
);
</script>

<template>
  <header class="topbar">
    <button class="brand" @click="$emit('navigate', 'Dashboard')">
      <span class="brand-mark"><IconFish :size="26" stroke-width="1.7" /></span>panen<span
        class="brand-light"
        >iwak</span
      ><span class="brand-dot">.</span>
    </button>
    <div class="header-right">
      <span class="connection" :class="{ offline: !online }"
        ><component :is="online ? IconWifi : IconWifiOff" :size="15" />{{
          online ? 'Online' : 'Offline'
        }}</span
      >
      <button
        class="icon-button notification"
        aria-label="Lihat pemberitahuan"
        @click="notice = !notice"
      >
        <IconBell :size="20" /><i></i>
      </button>
      <span class="header-divider"></span>
      <div class="profile">
        <span class="avatar">{{
          user.name
            .split(' ')
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        }}</span>
        <span
          ><strong>{{ user.name }}</strong
          ><small
            >@{{ user.username }} · {{ user.role === 'admin' ? 'Admin' : 'Staf lapangan' }}</small
          ></span
        >
      </div>
      <button class="secondary" :disabled="signingOut" @click="$emit('logout')">
        {{ signingOut ? 'Keluar…' : 'Keluar' }}
      </button>
    </div>
    <div v-if="notice" class="notification-panel">
      <strong>Pusat aktivitas</strong>
      <p>
        Transaksi disimpan ke server dengan identitas @{{ user.username }}. Saat offline,
        penyimpanan ke server belum tersedia. Jangan tutup formulir sebelum tersimpan.
      </p>
      <button class="text-button" @click="notice = false">Mengerti <IconCheck :size="16" /></button>
    </div>
    <nav
      class="main-nav"
      :class="{ 'is-dragging': navScroll.dragging.value }"
      aria-label="Navigasi utama, geser kiri atau kanan untuk melihat semua menu"
      tabindex="0"
      @pointerdown="navScroll.start"
      @pointermove="navScroll.move"
      @pointerup="navScroll.finish"
      @pointercancel="navScroll.finish"
      @lostpointercapture="navScroll.finish"
      @click.capture="navScroll.click"
    >
      <button
        v-for="item in navigation"
        :key="item.name"
        :class="{ active: page === item.name }"
        :aria-current="page === item.name ? 'page' : undefined"
        :aria-label="item.name"
        :title="item.name"
        @click="$emit('navigate', item.name)"
      >
        <component :is="item.icon" :size="18" stroke-width="1.65" /><span class="nav-label">{{
          item.name
        }}</span>
        <span v-if="item.name === 'Batch' && batchCount > 0" class="nav-count">{{
          batchCount
        }}</span>
      </button>
    </nav>
  </header>
</template>
