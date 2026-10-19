import { useId } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/use-theme';
import { dotGradient } from '@/theme/tokens';

/** The open ring with the indigo dot, cropped to its bounds (same crop as the splash image). */
export function FocoLogo({ size = 56 }: { size?: number }) {
  const theme = useTheme();
  const gradientId = `logo-dot-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [dotFrom, dotTo] = dotGradient[theme.colorScheme];

  return (
    <Svg width={size} height={size} viewBox="222 222 580 580" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={dotFrom} />
          <Stop offset="1" stopColor={dotTo} />
        </LinearGradient>
      </Defs>
      <Path d="M 746.9 426.5 A 250 250 0 1 1 555.4 265.8" fill="none" stroke={theme.ring} strokeWidth={58} strokeLinecap="round" />
      <Circle cx={512} cy={512} r={84} fill={`url(#${gradientId})`} />
    </Svg>
  );
}
