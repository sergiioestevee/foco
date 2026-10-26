import { useEffect, useMemo, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';

/** Time per word or space, close to how ChatGPT or Claude stream: a 120-word reply takes about six seconds. */
const STEP_MS = 26;

type TypewriterTextProps = {
  text: string;
  /** Show everything at once (the student tapped the bubble). */
  skip: boolean;
  onDone: () => void;
  style?: StyleProp<TextStyle>;
};

/** Reveals a reply word by word with a cursor dot at the end. Screen readers and "Reduce motion" get the full text straight away. */
export function TypewriterText({ text, skip, onDone, style }: TypewriterTextProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  // Words and the spaces between them, so line breaks and spacing are kept.
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const [shown, setShown] = useState(0);
  const finished = reduceMotion || skip || shown >= tokens.length;

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => setShown((count) => count + 1), STEP_MS);
    return () => clearInterval(timer);
  }, [finished]);

  useEffect(() => {
    if (finished) onDone();
  }, [finished, onDone]);

  return (
    <Typography accessibilityLabel={text} style={style}>
      {finished ? text : tokens.slice(0, shown).join('')}
      {finished ? null : <Typography style={[style, { color: theme.accent }]}> ●</Typography>}
    </Typography>
  );
}
