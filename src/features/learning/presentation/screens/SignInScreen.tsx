import { AppleButton } from '@invertase/react-native-apple-authentication';
import { useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import styled from 'styled-components/native';

import { AppMark } from '../../../../app/components/AppMark';
import type { AuthenticatedUser } from '../../application/ports/Authenticator';
import type { LearningCopy } from '../localization/learningCopy';

interface SignInScreenProps {
  copy: LearningCopy;
  accountMessage?: string | null;
  /** Called when the learner asks to sign in. Until an identity provider is
   * configured this is absent, and the button says so rather than failing. */
  onSignInWithApple?: () => void;
  onSignInWithEmail?: (email: string, password: string) => void;
  onSignInWithGoogle?: () => void;
  onCreateAccountWithEmail?: (email: string, password: string) => void;
  onSendPasswordReset?: (email: string) => void;
  onClose: () => void;
  /** Called when the learner asks to leave the account they are in. */
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
  /** What went wrong on the last attempt, if anything did. */
  signInError?: string | null;
  /** Who is signed in, when anybody is. */
  user?: AuthenticatedUser | null;
}

function GoogleMark() {
  return (
    <Svg height={19} viewBox="0 0 48 48" width={19}>
      <Path
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1Z"
        fill="#4285F4"
      />
      <Path
        d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.7C7.9 41 15.4 46 24 46Z"
        fill="#34A853"
      />
      <Path
        d="M11.7 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.4A22 22 0 0 0 2 24c0 3.6.9 6.9 2.4 9.8l7.3-5.7Z"
        fill="#FBBC05"
      />
      <Path
        d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C35 4.2 30 2 24 2 15.4 2 7.9 7 4.4 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.3-9.1Z"
        fill="#EA4335"
      />
    </Svg>
  );
}

/**
 * Where a learner signs in, once there is something to sign in to.
 *
 * The screen is built and reachable before the identity provider exists, so
 * the shape of it can be judged now. With no provider configured the button
 * says what is true — everything is kept on this phone — instead of failing
 * into a dead end.
 */
export function SignInScreen({
  accountMessage,
  copy,
  onClose,
  onCreateAccountWithEmail,
  onDeleteAccount,
  onSignInWithApple,
  onSignInWithEmail,
  onSignInWithGoogle,
  onSendPasswordReset,
  onSignOut,
  signInError,
  user,
}: SignInScreenProps) {
  const isAvailable = onSignInWithGoogle != null;
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);
  const [isUsingEmail, setIsUsingEmail] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordInputRef = useRef<TextInputInstance>(null);

  const submitEmail = () => {
    Keyboard.dismiss();
    if (isCreatingAccount) {
      onCreateAccountWithEmail?.(email, password);
    } else {
      onSignInWithEmail?.(email, password);
    }
  };

  return (
    <Container>
      {/* Android targets an SDK where the window is edge to edge, so the
          manifest's adjustResize no longer shrinks it and the keyboard is
          drawn over the form. Padding is what lifts the fields on both
          platforms; height only ever worked while the window resized. */}
      <KeyboardLayer behavior="padding">
        <SignInSafeArea edges={['top']}>
          <Header>
            <BackButton
              accessibilityLabel={copy.tabs.camera}
              accessibilityRole="button"
              onPress={onClose}
              testID="sign-in-close"
            >
              <BackChevron>‹</BackChevron>
            </BackButton>
          </Header>

          <Content
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
          >
            <TouchableWithoutFeedback
              accessible={false}
              onPress={Keyboard.dismiss}
            >
              <ScreenBody>
                <Stage>
                  <Mark>
                    <AppMark height={72} width={72} />
                  </Mark>
                  <Title accessibilityRole="header">{copy.account.title}</Title>
                  {user == null ? (
                    <>
                      <Subtitle>{copy.account.subtitle}</Subtitle>
                      <Benefit>{copy.account.benefit}</Benefit>
                    </>
                  ) : (
                    <>
                      <Subtitle testID="sign-in-user">
                        {user.name ?? user.email ?? ''}
                      </Subtitle>
                      <Benefit>
                        {user.email ?? copy.account.signedInNote}
                      </Benefit>
                    </>
                  )}
                  {signInError != null ? (
                    <Problem>{signInError}</Problem>
                  ) : null}
                  {accountMessage != null ? (
                    <Success>{accountMessage}</Success>
                  ) : null}
                </Stage>

                {/* Someone already signed in has nothing to sign in to: the actions
            become the way out of the account and the way back. */}
                <Actions>
                  {user == null ? (
                    isUsingEmail ? (
                      <EmailForm>
                        <EmailInput
                          autoCapitalize="none"
                          autoComplete="email"
                          autoCorrect={false}
                          keyboardType="email-address"
                          onChangeText={setEmail}
                          onSubmitEditing={() =>
                            passwordInputRef.current?.focus()
                          }
                          placeholder={copy.account.email}
                          placeholderTextColor="#7e8290"
                          returnKeyType="next"
                          testID="sign-in-email-input"
                          value={email}
                        />
                        <EmailInput
                          ref={passwordInputRef}
                          autoCapitalize="none"
                          autoComplete={
                            isCreatingAccount
                              ? 'new-password'
                              : 'current-password'
                          }
                          onChangeText={setPassword}
                          onSubmitEditing={submitEmail}
                          placeholder={copy.account.password}
                          placeholderTextColor="#7e8290"
                          returnKeyType="done"
                          secureTextEntry
                          testID="sign-in-password-input"
                          value={password}
                        />
                        <EmailSubmit
                          accessibilityRole="button"
                          onPress={submitEmail}
                          testID="sign-in-email-submit"
                        >
                          <EmailSubmitText>
                            {isCreatingAccount
                              ? copy.account.createWithEmail
                              : copy.account.signInWithEmail}
                          </EmailSubmitText>
                        </EmailSubmit>
                        <EmailLinks>
                          <EmailLink
                            accessibilityRole="button"
                            onPress={() =>
                              setIsCreatingAccount(current => !current)
                            }
                            testID="sign-in-email-mode"
                          >
                            <EmailLinkText>
                              {isCreatingAccount
                                ? copy.account.alreadyHaveAccount
                                : copy.account.createAccount}
                            </EmailLinkText>
                          </EmailLink>
                          {!isCreatingAccount ? (
                            <EmailLink
                              accessibilityRole="button"
                              onPress={() => onSendPasswordReset?.(email)}
                              testID="sign-in-password-reset"
                            >
                              <EmailLinkText>
                                {copy.account.forgotPassword}
                              </EmailLinkText>
                            </EmailLink>
                          ) : null}
                        </EmailLinks>
                        <EmailBack
                          accessibilityRole="button"
                          onPress={() => {
                            Keyboard.dismiss();
                            setIsUsingEmail(false);
                          }}
                          testID="sign-in-email-back"
                        >
                          <EmailBackText>{copy.account.back}</EmailBackText>
                        </EmailBack>
                      </EmailForm>
                    ) : (
                      <>
                        {Platform.OS === 'ios' && onSignInWithApple != null ? (
                          <AppleButton
                            buttonStyle={AppleButton.Style.BLACK}
                            buttonText={copy.account.apple}
                            buttonType={AppleButton.Type.CONTINUE}
                            cornerRadius={16}
                            onPress={onSignInWithApple}
                            style={appleButtonStyles.button}
                            testID="sign-in-apple"
                          />
                        ) : null}
                        <GoogleButton
                          accessibilityLabel={copy.account.google}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !isAvailable }}
                          onPress={onSignInWithGoogle}
                          testID="sign-in-google"
                          $available={isAvailable}
                        >
                          <GoogleMark />
                          <GoogleText>{copy.account.google}</GoogleText>
                        </GoogleButton>
                        <EmailProviderButton
                          accessibilityRole="button"
                          onPress={() => setIsUsingEmail(true)}
                          testID="sign-in-email"
                        >
                          <EmailProviderText>
                            {copy.account.continueWithEmail}
                          </EmailProviderText>
                        </EmailProviderButton>

                        {isAvailable ? null : <Soon>{copy.account.soon}</Soon>}
                      </>
                    )
                  ) : (
                    <>
                      {isConfirmingDeletion ? (
                        <DeleteConfirmation testID="delete-account-confirmation">
                          <DeleteTitle>
                            {copy.account.deleteQuestion}
                          </DeleteTitle>
                          <DeleteNote>{copy.account.deleteWarning}</DeleteNote>
                          <DeleteActions>
                            <DeleteCancel
                              accessibilityRole="button"
                              onPress={() => setIsConfirmingDeletion(false)}
                              testID="delete-account-cancel"
                            >
                              <DeleteCancelText>
                                {copy.account.cancel}
                              </DeleteCancelText>
                            </DeleteCancel>
                            <DeleteConfirm
                              accessibilityRole="button"
                              onPress={onDeleteAccount}
                              testID="delete-account-confirm"
                            >
                              <DeleteConfirmText>
                                {copy.account.deleteConfirm}
                              </DeleteConfirmText>
                            </DeleteConfirm>
                          </DeleteActions>
                        </DeleteConfirmation>
                      ) : (
                        <>
                          <SignOutButton
                            accessibilityRole="button"
                            onPress={onSignOut}
                            testID="sign-in-sign-out"
                          >
                            <SignOutText>{copy.account.signOut}</SignOutText>
                          </SignOutButton>
                          <DeleteAccountButton
                            accessibilityRole="button"
                            onPress={() => setIsConfirmingDeletion(true)}
                            testID="delete-account"
                          >
                            <DeleteAccountText>
                              {copy.account.deleteAccount}
                            </DeleteAccountText>
                          </DeleteAccountButton>
                        </>
                      )}
                    </>
                  )}

                  <Later
                    accessibilityRole="button"
                    onPress={onClose}
                    testID="sign-in-later"
                  >
                    <LaterText>
                      {user == null ? copy.account.later : copy.account.back}
                    </LaterText>
                  </Later>
                </Actions>
              </ScreenBody>
            </TouchableWithoutFeedback>
          </Content>
        </SignInSafeArea>
      </KeyboardLayer>
    </Container>
  );
}

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const KeyboardLayer = styled.KeyboardAvoidingView`
  flex: 1;
`;

const SignInSafeArea = styled(SafeAreaView)`
  flex: 1;
  padding: 0px 20px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 2px 0px 0px;
`;

const Content = styled.ScrollView.attrs({
  contentContainerStyle: { flexGrow: 1 },
  showsVerticalScrollIndicator: false,
})``;

const ScreenBody = styled.View`
  flex: 1;
`;

const BackButton = styled.Pressable`
  width: 34px;
  height: 34px;
  margin-left: -6px;
  align-items: center;
  justify-content: center;
`;

const BackChevron = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 30px;
  line-height: 34px;
`;

const Stage = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const Mark = styled.View`
  width: 72px;
  height: 72px;
  margin-bottom: 14px;
  overflow: hidden;
  border-radius: 18px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 31px;
  line-height: 36px;
  font-weight: 800;
  letter-spacing: -0.6px;
`;

const Subtitle = styled.Text`
  max-width: 300px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 15px;
  line-height: 21px;
  text-align: center;
`;

const Benefit = styled.Text`
  max-width: 290px;
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.mutedStrong};
  font-size: 13px;
  line-height: 19px;
  text-align: center;
`;

const Problem = styled.Text`
  max-width: 300px;
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.danger};
  font-size: 13px;
  line-height: 19px;
  text-align: center;
`;

const Success = styled.Text`
  max-width: 300px;
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.success};
  font-size: 13px;
  line-height: 19px;
  text-align: center;
`;

const Actions = styled.View`
  gap: 10px;
  padding-bottom: 26px;
`;

/** White with the Google mark, which is what their brand guidance asks of a
 * sign-in button. */
const GoogleButton = styled.Pressable<{ $available: boolean }>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px 18px;
  border-radius: 16px;
  opacity: ${({ $available }) => ($available ? 1 : 0.55)};
  background-color: #ffffff;
`;

const GoogleText = styled.Text`
  color: #1f1f1f;
  font-size: 15px;
  font-weight: 700;
`;

const EmailProviderButton = styled.Pressable`
  align-items: center;
  justify-content: center;
  padding: 14px 18px;
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.card};
`;

const EmailProviderText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
  font-weight: 700;
`;

const EmailForm = styled.View`
  gap: 10px;
`;

const EmailInput = styled.TextInput`
  min-height: 50px;
  padding: 0px 15px;
  border-radius: 14px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  background-color: ${({ theme }) => theme.colors.card};
  font-size: 15px;
`;

const EmailSubmit = styled.Pressable`
  align-items: center;
  justify-content: center;
  padding: 14px 18px;
  border-radius: 14px;
  background-color: ${({ theme }) => theme.colors.accent};
`;

const EmailSubmitText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`;

const EmailLinks = styled.View`
  flex-direction: row;
  justify-content: space-between;
  gap: 12px;
`;

const EmailLink = styled.Pressable`
  flex: 1;
  padding: 5px 0px;
`;

const EmailLinkText = styled.Text`
  color: ${({ theme }) => theme.colors.accentText};
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  font-weight: 600;
`;

const EmailBack = styled.Pressable`
  align-items: center;
  padding: 5px;
`;

const EmailBackText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  font-weight: 600;
`;

const Soon = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  line-height: 17px;
  text-align: center;
`;

const SignOutButton = styled.Pressable`
  align-items: center;
  justify-content: center;
  padding: 15px 18px;
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.card};
`;

const SignOutText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
  font-weight: 700;
`;

const DeleteAccountButton = styled.Pressable`
  align-items: center;
  padding: 10px;
`;

const DeleteAccountText = styled.Text`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 13px;
  font-weight: 600;
`;

const DeleteConfirmation = styled.View`
  gap: 8px;
  padding: 16px;
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.card};
`;

const DeleteTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 700;
`;

const DeleteNote = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  line-height: 17px;
`;

const DeleteActions = styled.View`
  flex-direction: row;
  gap: 8px;
  margin-top: 4px;
`;

const DeleteCancel = styled.Pressable`
  flex: 1;
  align-items: center;
  padding: 11px 8px;
`;

const DeleteCancelText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  font-weight: 600;
`;

const DeleteConfirm = styled.Pressable`
  flex: 1.4;
  align-items: center;
  padding: 11px 8px;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.colors.danger};
`;

const DeleteConfirmText = styled.Text`
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
`;

const Later = styled.Pressable`
  padding: 12px;
  align-items: center;
`;

const LaterText = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
  font-weight: 600;
`;

const appleButtonStyles = StyleSheet.create({
  button: { width: '100%', height: 50 },
});
