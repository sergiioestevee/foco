import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/use-theme';
import { dotGradient } from '@/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Thinner than the logo's stroke (58 on a radius of 250); same dot (84 on 250).
const STROKE_RATIO = 0.14;
const DOT_RATIO = 0.34;
// Open like the logo: the arc runs clockwise from 20° above 3 o'clock round to 10° past 12, leaving a gap at the top right.
const ARC_START = -20;
const ARC_SWEEP = 300;

function pointAt(center: number, radius: number, degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  return `${center + radius * Math.cos(angle)} ${center + radius * Math.sin(angle)}`;
}

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
  const arcLength = (ARC_SWEEP / 360) * 2 * Math.PI * radius;
  const arc = `M ${pointAt(center, radius, ARC_START)} A ${radius} ${radius} 0 1 1 ${pointAt(center, radius, ARC_START + ARC_SWEEP)}`;
  const [dotFrom, dotTo] = dotGradient[theme.colorScheme];

  useEffect(() => {
    animated.value = withTiming(fraction, { duration: 600 });
  }, [animated, fraction]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLength * (1 - animated.value),
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
        <Path d={arc} fill="none" stroke={theme.track} strokeWidth={strokeWidth} strokeLinecap="round" />
        <AnimatedPath
          d={arc}
          fill="none"
          stroke={theme.ring}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={[arcLength, arcLength]}
          animatedProps={arcProps}
        />
        <Circle cx={center} cy={center} r={radius * DOT_RATIO} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}
