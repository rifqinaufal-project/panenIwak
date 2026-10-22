import type { Profile } from '#shared/types/auth';
import type { UsersRepository } from '../features/users/contracts';

export function createUsersRepository(request: typeof $fetch = $fetch): UsersRepository {
  return {
    async list() {
      return (await request<{ users: Profile[] }>('/api/admin/users')).users;
    },
    async create(input) {
      const { name, username, password, role } = input;
      await request('/api/admin/users', {
        method: 'POST',
        body: { name, username, password, role },
      });
    },
    async update(input) {
      const { id, role, is_active } = input;
      await request('/api/admin/users', { method: 'PATCH', body: { id, role, is_active } });
    },
    async resetPassword(input) {
      const { id, password } = input;
      await request('/api/admin/password', { method: 'POST', body: { id, password } });
    },
  };
}
