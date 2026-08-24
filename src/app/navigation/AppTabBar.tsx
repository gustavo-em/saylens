import { SafeAreaView } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import styled from 'styled-components/native';

import type { AppTab } from './AppTab';

interface AppTabBarProps {
  activeTab: AppTab;
  labels: { camera: string; settings: string };
  onSelect: (tab: AppTab) => void;
}

export function AppTabBar({ activeTab, labels, onSelect }: AppTabBarProps) {
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const tabs: ReadonlyArray<{ label: string; value: AppTab }> = [
    { label: labels.camera, value: 'camera' },
    { label: labels.settings, value: 'settings' },
  ];
  return (
    <NavigationSafeArea
      edges={isLandscape ? ['right'] : ['bottom']}
      pointerEvents="box-none"
      $landscape={isLandscape}
    >
      <TabsContainer $landscape={isLandscape}>
        <GlassSheen pointerEvents="none" />
        <GlassTint pointerEvents="none" />
        {tabs.map(tab => {
          const isSelected = activeTab === tab.value;

          return (
            <TabButton
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              android_ripple={{ color: 'rgba(26, 111, 236, 0.18)' }}
              key={tab.value}
              onPress={() => onSelect(tab.value)}
              testID={`tab-${tab.value}`}
              $landscape={isLandscape}
              $selected={isSelected}
            >
              <TabIcon selected={isSelected} tab={tab.value} />
              <TabLabel $selected={isSelected}>{tab.label}</TabLabel>
            </TabButton>
          );
        })}
      </TabsContainer>
    </NavigationSafeArea>
  );
}

function TabIcon({ selected, tab }: { selected: boolean; tab: AppTab }) {
  if (tab === 'camera') {
    return (
      <CameraIcon $selected={selected}>
        <CameraLens $selected={selected} />
      </CameraIcon>
    );
  }

  return (
    <SettingsIcon>
      <SliderLine $selected={selected} />
      <TopSliderKnob $selected={selected} />
      <SliderLine $selected={selected} />
      <BottomSliderKnob $selected={selected} />
    </SettingsIcon>
  );
}

const NavigationSafeArea = styled(SafeAreaView)<{ $landscape: boolean }>`
  position: absolute;
  ${({ $landscape }) =>
    $landscape
      ? `
        top: 0px;
        right: 0px;
        bottom: 0px;
        width: 154px;
        justify-content: center;
        padding: 12px;
      `
      : `
        right: 0px;
        bottom: 0px;
        left: 0px;
        padding: 0px 20px;
      `}
`;

const TabsContainer = styled.View<{ $landscape: boolean }>`
  position: relative;
  overflow: hidden;
  flex-direction: ${({ $landscape }) => ($landscape ? 'column' : 'row')};
  gap: 8px;
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 26px;
  background-color: ${({ theme }) => theme.colors.glassStrong};
  elevation: 16;
`;

const GlassSheen = styled.View`
  position: absolute;
  top: 0px;
  right: 18px;
  left: 18px;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.glassHighlight};
`;

const GlassTint = styled.View`
  position: absolute;
  top: -38px;
  left: 14%;
  width: 58%;
  height: 60px;
  border-radius: 30px;
  background-color: rgba(78, 151, 255, 0.12);
`;

const TabButton = styled.Pressable<{
  $landscape: boolean;
  $selected: boolean;
}>`
  min-height: 54px;
  ${({ $landscape }) => ($landscape ? 'width: 100%;' : 'flex: 1;')}
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid
    ${({ $selected }) =>
      $selected ? 'rgba(196, 224, 255, 0.30)' : 'transparent'};
  border-radius: 20px;
  background-color: ${({ $selected }) =>
    $selected ? 'rgba(26, 111, 236, 0.68)' : 'transparent'};
  overflow: hidden;
`;

const TabLabel = styled.Text<{ $selected: boolean }>`
  color: ${({ $selected, theme }) =>
    $selected ? '#FFFFFF' : theme.colors.muted};
  font-size: 12px;
  font-weight: 800;
`;

const CameraIcon = styled.View<{ $selected: boolean }>`
  width: 20px;
  height: 15px;
  align-items: center;
  justify-content: center;
  border: 1.5px solid
    ${({ $selected, theme }) => ($selected ? '#FFFFFF' : theme.colors.muted)};
  border-radius: 5px;
`;

const CameraLens = styled.View<{ $selected: boolean }>`
  width: 6px;
  height: 6px;
  border: 1.5px solid
    ${({ $selected, theme }) => ($selected ? '#FFFFFF' : theme.colors.muted)};
  border-radius: 3px;
`;

const SettingsIcon = styled.View`
  position: relative;
  width: 20px;
  height: 18px;
  justify-content: center;
  gap: 6px;
`;

const SliderLine = styled.View<{ $selected: boolean }>`
  width: 20px;
  height: 1.5px;
  border-radius: 1px;
  background-color: ${({ $selected, theme }) =>
    $selected ? '#FFFFFF' : theme.colors.muted};
`;

const SliderKnob = styled.View<{ $selected: boolean }>`
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: ${({ $selected, theme }) =>
    $selected ? '#FFFFFF' : theme.colors.muted};
`;

const TopSliderKnob = styled(SliderKnob)`
  top: 2px;
  right: 3px;
`;

const BottomSliderKnob = styled(SliderKnob)`
  bottom: 2px;
  left: 3px;
`;
