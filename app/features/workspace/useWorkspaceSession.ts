import { onMounted, ref, type Ref } from 'vue';
import type { Profile } from '#shared/types/auth';
import { canAccessPage, pagePath, resolveWorkspacePath } from '#shared/utils/workspace-routes';
import type { Feedback } from './contracts';
import type { AuthenticationRepository } from '../auth/contracts';

export function useWorkspaceSession(options: {
  repository: Pick<AuthenticationRepository, 'session' | 'logout'>;
  currentUser: Ref<Profile | null>;
  busy: Ref<boolean>;
  feedback: Feedback;
  loadWorkspace: () => Promise<void>;
  clear: () => void;
  resetForms: () => void;
  confirmDiscard: () => Promise<boolean>;
}) {
  const route = useRoute(),
    router = useRouter();
  const checked = ref(false),
    signingOut = ref(false);
  async function authenticated(user: Profile) {
    options.currentUser.value = user;
    const target = resolveWorkspacePath(route.path);
    if (
      route.path === '/' ||
      route.path === '/masuk' ||
      !target ||
      !canAccessPage(target.page, user.role)
    ) {
      await router.replace(pagePath(user.role === 'admin' ? 'Dashboard' : 'Batch'));
    }
    await options.loadWorkspace();
  }
  async function logout() {
    if (options.busy.value || !(await options.confirmDiscard())) return;
    signingOut.value = true;
    try {
      await options.repository.logout();
      options.clear();
      options.resetForms();
      await router.replace('/masuk');
    } catch (failure) {
      options.feedback.notify(options.feedback.requestMessage(failure));
    } finally {
      signingOut.value = false;
    }
  }
  onMounted(async () => {
    try {
      const user = await options.repository.session();
      checked.value = true;
      await authenticated(user);
    } catch {
      options.clear();
    } finally {
      checked.value = true;
    }
  });
  return { checked, signingOut, authenticated, logout };
}
