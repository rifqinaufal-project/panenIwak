import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import type { Profile } from '#shared/types/auth';
import type { Confirm } from './contracts';

export function useUnsavedNavigation(options: {
  currentUser: Ref<Profile | null>;
  busy: Ref<boolean>;
  snapshot: () => string;
  accountDirty: Ref<boolean>;
  confirm: Confirm;
  notify: (message: string) => void;
}) {
  const router = useRouter();
  const baseline = ref('');
  const dirty = computed(
    () =>
      options.currentUser.value !== null &&
      ((baseline.value !== '' && options.snapshot() !== baseline.value) ||
        options.accountDirty.value),
  );
  let confirming = false,
    savedTarget: string | null = null;
  let removeGuard: (() => void) | undefined;

  function resetBaseline() {
    baseline.value = options.snapshot();
  }
  async function confirmDiscard() {
    if (!dirty.value) return true;
    if (confirming) return false;
    confirming = true;
    try {
      return await options.confirm({
        title: 'Tinggalkan isian?',
        message:
          'Ada perubahan yang belum disimpan. Jika meninggalkan halaman ini, perubahan tersebut akan hilang.',
        label: 'Ya, tinggalkan',
      });
    } finally {
      confirming = false;
    }
  }
  async function finishNavigation(path: string) {
    resetBaseline();
    savedTarget = path;
    try {
      await router.replace(path);
    } finally {
      savedTarget = null;
    }
  }
  function beforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value && !options.busy.value) return;
    event.preventDefault();
    event.returnValue = '';
  }
  onMounted(() => {
    window.addEventListener('beforeunload', beforeUnload);
    removeGuard = router.beforeEach(async (to, from) => {
      if (!options.currentUser.value || to.path === from.path || savedTarget === to.path)
        return true;
      if (options.busy.value) {
        options.notify('Tunggu proses penyimpanan selesai sebelum berpindah halaman.');
        return false;
      }
      return confirmDiscard();
    });
  });
  onBeforeUnmount(() => {
    removeGuard?.();
    window.removeEventListener('beforeunload', beforeUnload);
  });
  return { dirty, resetBaseline, confirmDiscard, finishNavigation };
}
