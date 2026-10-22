import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useConfirmationDialog } from '../../composables/useConfirmationDialog';

export function useWorkspaceFeedback() {
  const online = ref(true),
    toast = ref('');
  const { confirmDialog, confirm } = useConfirmationDialog();
  let timer: ReturnType<typeof setTimeout>;
  function notify(message: string) {
    toast.value = message;
    clearTimeout(timer);
    timer = setTimeout(() => {
      toast.value = '';
    }, 4500);
  }
  function updateOnline() {
    online.value = navigator.onLine;
  }
  onMounted(() => {
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
  });
  onBeforeUnmount(() => {
    clearTimeout(timer);
    window.removeEventListener('online', updateOnline);
    window.removeEventListener('offline', updateOnline);
  });
  return { online, toast, confirmDialog, confirm, notify };
}
