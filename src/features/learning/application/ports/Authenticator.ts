export interface AuthenticatedUser {
  id: string;
  name: string | null;
  email: string | null;
  providerIds?: readonly string[];
  emailVerified?: boolean;
  createdAtMs?: number | null;
  lastSignInAtMs?: number | null;
}

/**
 * Who the learner is, when they choose to say.
 *
 * Signing in is optional in this app: everything works without an account, and
 * an account is what carries the words to another phone.
 */
export interface Authenticator {
  signInWithApple(): Promise<AuthenticatedUser>;
  signInWithEmail(email: string, password: string): Promise<AuthenticatedUser>;
  createAccountWithEmail(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser>;
  sendPasswordReset(email: string): Promise<void>;
  signInWithGoogle(): Promise<AuthenticatedUser>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  /** Calls back with the current user, and again whenever it changes. */
  subscribe(listener: (user: AuthenticatedUser | null) => void): () => void;
}
