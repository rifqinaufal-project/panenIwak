import { reactive } from 'vue';
import type { Profile } from '#shared/types/auth';
import { useAuthentication } from '../features/auth/useAuthentication';
import { createAuthenticationRepository } from '../repositories/auth-http';

/** Composition root for the login/registration screen. */
export function useLoginScreen(authenticated: (user: Profile) => void) {
  return reactive(
    useAuthentication({ repository: createAuthenticationRepository(), authenticated }),
  );
}
