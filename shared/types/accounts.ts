import type { Profile } from './auth';

export type LoginCredentials = { username: string; password: string };
export type RegistrationInput = LoginCredentials & { name: string };
export type CreateUserInput = RegistrationInput & { role: Profile['role'] };
export type UpdateUserInput = Pick<Profile, 'id' | 'role' | 'is_active'>;
export type ResetPasswordInput = { id: string; password: string };
