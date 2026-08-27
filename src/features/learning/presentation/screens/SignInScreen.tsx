import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import styled from 'styled-components/native';

import { AppMark } from '../../../../app/components/AppMark';
import type { LearningCopy } from '../localization/learningCopy';

interface SignInScreenProps {
  copy: LearningCopy;
  /** Called when the learner asks to sign in. Until an identity provider is
   * configured this is absent, and the button says so rather than failing. */
  onSignInWithGoogle?: () => void;
  onClose: () => void;
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
  copy,
  onClose,
  onSignInWithGoogle,
}: SignInScreenProps) {
  const isAvailable = onSignInWithGoogle != null;

  return (
    <Container>
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

        <Stage>
          <Mark>
            <AppMark height={72} width={72} />
          </Mark>
          <Title accessibilityRole="header">{copy.account.title}</Title>
          <Subtitle>{copy.account.subtitle}</Subtitle>
          <Benefit>{copy.account.benefit}</Benefit>
        </Stage>

        <Actions>
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

          {isAvailable ? null : <Soon>{copy.account.soon}</Soon>}

          <Later
            accessibilityRole="button"
            onPress={onClose}
            testID="sign-in-later"
          >
            <LaterText>{copy.account.later}</LaterText>
          </Later>
        </Actions>
      </SignInSafeArea>
    </Container>
  );
}

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
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

const Soon = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 12px;
  line-height: 17px;
  text-align: center;
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
