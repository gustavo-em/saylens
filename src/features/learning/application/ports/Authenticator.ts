export interface AuthenticatedUser {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * Who the learner is, when they choose to say.
 *
 * Signing in is optional in this app: everything works without an account, and
 * an account is what carries the words to another phone.
 */
export interface Authenticator {
  signInWithGoogle(): Promise<AuthenticatedUser>;
  signOut(): Promise<void>;
  /** Calls back with the current user, and again whenever it changes. */
  subscribe(listener: (user: AuthenticatedUser | null) => void): () => void;
}
