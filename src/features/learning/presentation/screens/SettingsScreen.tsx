import { SafeAreaView } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';

interface SettingsScreenProps {
  onShowGuidanceChange: (value: boolean) => void;
  showGuidance: boolean;
}

export function SettingsScreen({
  onShowGuidanceChange,
  showGuidance,
}: SettingsScreenProps) {
  const theme = useTheme();

  return (
    <Container>
      <SettingsSafeArea edges={['top']}>
        <Content showsVerticalScrollIndicator={false}>
          <Header>
            <Eyebrow>SPELLFORME</Eyebrow>
            <Title accessibilityRole="header">Configurações</Title>
            <Subtitle>
              Ajuste a experiência sem sair do modo de aprendizagem.
            </Subtitle>
          </Header>

          <Section>
            <SectionTitle>EXPERIÊNCIA DA CÂMERA</SectionTitle>
            <SettingCard>
              <SettingCopy>
                <SettingTitle>Guia de enquadramento</SettingTitle>
                <SettingDescription>
                  Mostra a área visual para apontar aos objetos.
                </SettingDescription>
              </SettingCopy>
              <GuidanceSwitch
                accessibilityLabel="Mostrar guia de enquadramento"
                onValueChange={onShowGuidanceChange}
                thumbColor={showGuidance ? theme.colors.background : '#D8E5DF'}
                trackColor={{
                  false: '#345046',
                  true: theme.colors.accent,
                }}
                value={showGuidance}
              />
            </SettingCard>
          </Section>

          <Section>
            <SectionTitle>BASE TÉCNICA</SectionTitle>
            <InfoCard>
              <InfoRow label="Câmera" value="Traseira · pronta" />
              <Separator />
              <InfoRow label="Processamento" value="No dispositivo" />
              <Separator />
              <InfoRow label="Reconhecimento" value="Próxima etapa" />
            </InfoCard>
          </Section>

          <AboutCard>
            <AboutEyebrow>MILESTONE 2</AboutEyebrow>
            <AboutTitle>Camera-first foundation</AboutTitle>
            <AboutBody>
              Preview nativo com VisionCamera 5. O reconhecimento de objetos
              será conectado sem levar pixels para a thread JavaScript.
            </AboutBody>
          </AboutCard>
        </Content>
      </SettingsSafeArea>
    </Container>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <InfoRowContainer>
      <InfoLabel>{label}</InfoLabel>
      <InfoValue>{value}</InfoValue>
    </InfoRowContainer>
  );
}

const Container = styled.View`
  position: absolute;
  inset: 0px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const SettingsSafeArea = styled(SafeAreaView)`
  flex: 1;
`;

const Content = styled.ScrollView.attrs({
  contentContainerStyle: {
    gap: 30,
    paddingBottom: 132,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
})``;

const Header = styled.View``;

const Eyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.8px;
`;

const Title = styled.Text`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -1px;
`;

const Subtitle = styled.Text`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 15px;
  line-height: 22px;
`;

const Section = styled.View`
  gap: 10px;
`;

const SectionTitle = styled.Text`
  padding-left: 4px;
  color: #6f8f81;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
`;

const SettingCard = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.large}px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const SettingCopy = styled.View`
  flex: 1;
`;

const SettingTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 700;
`;

const SettingDescription = styled.Text`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 13px;
  line-height: 19px;
`;

const GuidanceSwitch = styled.Switch``;

const InfoCard = styled.View`
  padding: 0px 18px;
  border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  border-radius: ${({ theme }) => theme.radii.large}px;
  background-color: ${({ theme }) => theme.colors.card};
`;

const InfoRowContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 17px 0px;
`;

const InfoLabel = styled.Text`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 14px;
`;

const InfoValue = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  font-weight: 700;
`;

const Separator = styled.View`
  height: 1px;
  background-color: ${({ theme }) => theme.colors.borderSubtle};
`;

const AboutCard = styled.View`
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  background-color: ${({ theme }) => theme.colors.cardElevated};
`;

const AboutEyebrow = styled.Text`
  color: ${({ theme }) => theme.colors.accent};
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.4px;
`;

const AboutTitle = styled.Text`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 20px;
  font-weight: 800;
`;

const AboutBody = styled.Text`
  margin-top: 8px;
  color: #a8c2b6;
  font-size: 14px;
  line-height: 21px;
`;
