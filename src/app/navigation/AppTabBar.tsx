import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import type { AppTab } from './AppTab';

interface AppTabBarProps {
  activeTab: AppTab;
  labels: { camera: string; settings: string };
  onSelect: (tab: AppTab) => void;
}

export function AppTabBar({ activeTab, labels, onSelect }: AppTabBarProps) {
  const tabs: ReadonlyArray<{ label: string; value: AppTab }> = [
    { label: labels.camera, value: 'camera' },
    { label: labels.settings, value: 'settings' },
  ];
  return (
    <BottomSafeArea edges={['bottom']} pointerEvents="box-none">
      <TabsContainer>
        {tabs.map(tab => {
          const isSelected = activeTab === tab.value;

          return (
            <TabButton
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              android_ripple={{ color: 'rgba(112, 241, 181, 0.12)' }}
              key={tab.value}
              onPress={() => onSelect(tab.value)}
              testID={`tab-${tab.value}`}
              $selected={isSelected}
            >
              <TabIcon selected={isSelected} tab={tab.value} />
              <TabLabel $selected={isSelected}>{tab.label}</TabLabel>
            </TabButton>
          );
        })}
      </TabsContainer>
    </BottomSafeArea>
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

const BottomSafeArea = styled(SafeAreaView)`
  position: absolute;
  right: 0px;
  bottom: 0px;
  left: 0px;
  padding: 0px 18px;
`;

const TabsContainer = styled.View`
  flex-direction: row;
  gap: 8px;
  padding: 7px;
  border: 1px solid #294b3e;
  border-radius: 24px;
  background-color: rgba(9, 24, 18, 0.96);
  elevation: 12;
`;

const TabButton = styled.Pressable<{ $selected: boolean }>`
  min-height: 52px;
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 18px;
  background-color: ${({ $selected }) =>
    $selected ? '#17382B' : 'transparent'};
  overflow: hidden;
`;

const TabLabel = styled.Text<{ $selected: boolean }>`
  color: ${({ $selected, theme }) =>
    $selected ? theme.colors.accent : '#819D90'};
  font-size: 12px;
  font-weight: 700;
`;

const CameraIcon = styled.View<{ $selected: boolean }>`
  width: 20px;
  height: 15px;
  align-items: center;
  justify-content: center;
  border: 1.5px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.accent : '#819D90')};
  border-radius: 5px;
`;

const CameraLens = styled.View<{ $selected: boolean }>`
  width: 6px;
  height: 6px;
  border: 1.5px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.accent : '#819D90')};
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
    $selected ? theme.colors.accent : '#819D90'};
`;

const SliderKnob = styled.View<{ $selected: boolean }>`
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: ${({ $selected, theme }) =>
    $selected ? theme.colors.accent : '#819D90'};
`;

const TopSliderKnob = styled(SliderKnob)`
  top: 2px;
  right: 3px;
`;

const BottomSliderKnob = styled(SliderKnob)`
  bottom: 2px;
  left: 3px;
`;
