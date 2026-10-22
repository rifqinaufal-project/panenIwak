import type { Profile } from '#shared/types/auth';
import type { CreateUserInput, ResetPasswordInput, UpdateUserInput } from '#shared/types/accounts';

export interface UsersRepository {
  list(): Promise<Profile[]>;
  create(input: CreateUserInput): Promise<void>;
  update(input: UpdateUserInput): Promise<void>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
}
