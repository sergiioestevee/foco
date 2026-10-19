import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/use-theme';
import { dotGradient } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Same proportions as the logo: stroke 58 and dot 84 on a radius of 250.
const STROKE_RATIO = 0.23;
const DOT_RATIO = 0.34;

type ProgressRingProps = {
  /** From 0 to 1. */
  progress: number;
  size?: number;
  accessibilityLabel?: string;
};

export function ProgressRing({ progress, size = 112, accessibilityLabel }: ProgressRingProps) {
  const theme = useTheme();
  const gradientId = `ring-dot-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const fraction = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;
  const animated = useSharedValue(fraction);

  const center = size / 2;
  const radius = center / (1 + STROKE_RATIO / 2);
  const strokeWidth = radius * STROKE_RATIO;
  const circumference = 2 * Math.PI * radius;
  const [dotFrom, dotTo] = dotGradient[theme.colorScheme];

  useEffect(() => {
    animated.value = withTiming(fraction, { duration: 600 });
  }, [animated, fraction]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
    // A zero-length dash with round caps would still paint a dot.
    strokeOpacity: animated.value > 0.001 ? 1 : 0,
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={dotFrom} />
            <Stop offset="1" stopColor={dotTo} />
          </LinearGradient>
        </Defs>
        <Circle cx={center} cy={center} r={radius} fill="none" stroke={theme.track} strokeWidth={strokeWidth} />
        <G transform={`rotate(-90 ${center} ${center})`}>
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={theme.ring}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={[circumference, circumference]}
            animatedProps={arcProps}
          />
        </G>
        <Circle cx={center} cy={center} r={radius * DOT_RATIO} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}
