import type { SvgProps } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

import DarkMark from '../../assets/spellforme-mark-dark.svg';
import LightMark from '../../assets/spellforme-mark.svg';

export function AppMark(props: SvgProps) {
  const theme = useTheme();
  const Mark = theme.mode === 'dark' ? DarkMark : LightMark;

  return <Mark {...props} />;
}
