import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import type {
  AuthenticatedUser,
  Authenticator,
} from '../../application/ports/Authenticator';

/**
 * The identifier of the project's web client, needed on Android and used on
 * iOS to have Google issue a token Firebase will accept from either platform.
 * Empty here means iOS reads its own client from the configuration file the
 * console generated.
 */
const WEB_CLIENT_ID = '';

let isConfigured = false;

function configure() {
  if (isConfigured) return;

  GoogleSignin.configure({
    // The iOS client is read from GoogleService-Info.plist when it is not
    // named here, which keeps one copy of it in the project.
    ...(WEB_CLIENT_ID.length > 0 ? { webClientId: WEB_CLIENT_ID } : {}),
    scopes: ['profile', 'email'],
  });
  isConfigured = true;
}

function toUser(user: {
  uid: string;
  displayName: string | null;
  email: string | null;
}): AuthenticatedUser {
  return { id: user.uid, name: user.displayName, email: user.email };
}

export class SignInCancelledError extends Error {
  constructor() {
    super('The learner closed the Google sheet.');
    this.name = 'SignInCancelledError';
  }
}

export const firebaseAuthenticator: Authenticator = {
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

  subscribe(listener) {
    return onAuthStateChanged(getAuth(), user => {
      listener(user == null ? null : toUser(user));
    });
  },
};
