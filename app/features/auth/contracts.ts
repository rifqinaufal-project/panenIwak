import type { Profile } from '#shared/types/auth';
import type { LoginCredentials, RegistrationInput } from '#shared/types/accounts';

export interface AuthenticationRepository {
  session(): Promise<Profile>;
  logout(): Promise<void>;
  login(input: LoginCredentials): Promise<Profile>;
  register(input: RegistrationInput): Promise<void>;
}
