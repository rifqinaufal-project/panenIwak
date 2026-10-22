import type { Profile } from '#shared/types/auth';
import type { AuthenticationRepository } from '../features/auth/contracts';

export function createAuthenticationRepository(
  request: typeof $fetch = $fetch,
): AuthenticationRepository {
  return {
    async session() {
      return (await request<{ user: Profile }>('/api/auth/me')).user;
    },
    async logout() {
      await request('/api/auth/logout', { method: 'POST', body: {} });
    },
    async login(input) {
      return (await request<{ user: Profile }>('/api/auth/login', { method: 'POST', body: input }))
        .user;
    },
    async register(input) {
      const { username, name, password } = input;
      await request('/api/auth/register', { method: 'POST', body: { username, name, password } });
    },
  };
}
