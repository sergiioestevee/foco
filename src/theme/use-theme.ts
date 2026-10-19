import { useColorScheme } from 'react-native';

import { useFocoStore } from '@/store/use-foco-store';

import { colors } from './tokens';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const themeMode = useFocoStore((state) => state.settings.themeMode);
  const colorScheme = themeMode === 'system'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : themeMode;
  const palette = colors[colorScheme];

  return { ...palette, colorScheme };
}
