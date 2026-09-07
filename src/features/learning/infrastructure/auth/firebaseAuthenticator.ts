import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import type {
  AuthenticatedUser,
  Authenticator,
} from '../../application/ports/Authenticator';

/**
 * The identifier of the project's web OAuth client. Android needs it to ask
 * Google for the ID token Firebase accepts; iOS can use the same client.
 */
const WEB_CLIENT_ID =
  '307113843446-vkbk7g3462lc9ue6mdq03i3ek1smvc4f.apps.googleusercontent.com';

let isConfigured = false;

function configure() {
  if (isConfigured) return;

  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });
  isConfigured = true;
}

function toUser(user: {
  uid: string;
  displayName: string | null;
  email: string | null;
  emailVerified?: boolean;
  providerData?: readonly { providerId?: string | null }[];
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}): AuthenticatedUser {
  const parseTime = (value: string | undefined) => {
    if (value == null) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    id: user.uid,
    name: user.displayName,
    email: user.email,
    providerIds: [
      ...new Set(
        (user.providerData ?? [])
          .map(provider => provider.providerId?.trim())
          .filter((providerId): providerId is string => providerId != null),
      ),
    ],
    emailVerified: user.emailVerified ?? false,
    createdAtMs: parseTime(user.metadata?.creationTime),
    lastSignInAtMs: parseTime(user.metadata?.lastSignInTime),
  };
}

export class SignInCancelledError extends Error {
  constructor() {
    super('The learner closed the sign-in sheet.');
    this.name = 'SignInCancelledError';
  }
}

function isCancellation(error: unknown): boolean {
  const code = (error as { code?: string }).code ?? '';
  return code.toLowerCase().includes('cancel');
}

export const firebaseAuthenticator: Authenticator = {
  async signInWithApple() {
    try {
      const appleResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        // Apple recommends requesting the full name before the email. Both are
        // normally returned only on the first authorization for this app.
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });

      if (appleResponse.identityToken == null) {
        const error = new Error('Apple did not return an identity token.');
        error.name = 'AppleIdentityTokenMissingError';
        throw error;
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: appleResponse.identityToken,
        // The Apple Authentication package hashes this value before sending it
        // to Apple and returns the original value required by Firebase.
        rawNonce: appleResponse.nonce,
        fullName: appleResponse.fullName ?? undefined,
      });
      const signedIn = await signInWithCredential(getAuth(), credential);
      return toUser(signedIn.user);
    } catch (error) {
      if (isCancellation(error)) throw new SignInCancelledError();
      throw error;
    }
  },

  async signInWithEmail(email, password) {
    const signedIn = await signInWithEmailAndPassword(
      getAuth(),
      email.trim(),
      password,
    );
    return toUser(signedIn.user);
  },

  async createAccountWithEmail(email, password) {
    const signedIn = await createUserWithEmailAndPassword(
      getAuth(),
      email.trim(),
      password,
    );
    await sendEmailVerification(signedIn.user).catch(() => undefined);
    return toUser(signedIn.user);
  },

  async sendPasswordReset(email) {
    await sendPasswordResetEmail(getAuth(), email.trim());
  },

  async signInWithGoogle() {
    configure();
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    try {
      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled' || response.data == null) {
        throw new SignInCancelledError();
      }

      const credential = GoogleAuthProvider.credential(
        response.data.idToken,
        // The access token is not needed for Firebase, which only reads the
        // identity token.
        undefined,
      );
      const signedIn = await signInWithCredential(getAuth(), credential);

      return toUser(signedIn.user);
    } catch (error) {
      if ((error as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED) {
        throw new SignInCancelledError();
      }

      throw error;
    }
  },

  async signOut() {
    configure();
    await GoogleSignin.signOut().catch(() => undefined);
    await firebaseSignOut(getAuth());
  },

  async deleteAccount() {
    const user = getAuth().currentUser;
    if (user == null) return;

    await deleteUser(user);
    await GoogleSignin.signOut().catch(() => undefined);
  },

  subscribe(listener) {
    try {
      return onAuthStateChanged(getAuth(), user => {
        listener(user == null ? null : toUser(user));
      });
    } catch {
      // Android can still run in guest mode before its machine-local Firebase
      // configuration file has been added.
      listener(null);
      return () => undefined;
    }
  },
};
