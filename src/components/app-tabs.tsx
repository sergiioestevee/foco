import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useMemo } from 'react';

import { fonts } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';

const tabItems = [
  <NativeTabs.Trigger key="index" name="index">
    <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
    <NativeTabs.Trigger.Icon sf={{ default: 'smallcircle.filled.circle', selected: 'smallcircle.filled.circle.fill' }} md={{ default: 'radio_button_checked', selected: 'radio_button_checked' }} />
  </NativeTabs.Trigger>,
  <NativeTabs.Trigger key="calendar" name="calendar">
    <NativeTabs.Trigger.Label>Calendario</NativeTabs.Trigger.Label>
    <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md={{ default: 'calendar_month', selected: 'calendar_month' }} />
  </NativeTabs.Trigger>,
  <NativeTabs.Trigger key="tasks" name="tasks">
    <NativeTabs.Trigger.Label>Tareas</NativeTabs.Trigger.Label>
    <NativeTabs.Trigger.Icon sf={{ default: 'checklist', selected: 'checklist' }} md={{ default: 'checklist', selected: 'checklist' }} />
  </NativeTabs.Trigger>,
  <NativeTabs.Trigger key="assistant" name="assistant">
    <NativeTabs.Trigger.Label>IA</NativeTabs.Trigger.Label>
    <NativeTabs.Trigger.Icon sf={{ default: 'sparkles', selected: 'sparkles' }} md={{ default: 'auto_awesome', selected: 'auto_awesome' }} />
  </NativeTabs.Trigger>,
  <NativeTabs.Trigger key="profile" name="profile">
    <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
    <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md={{ default: 'person', selected: 'person' }} />
  </NativeTabs.Trigger>,
];

export default function AppTabs() {
  const theme = useTheme();
  const iconColor = useMemo(() => ({ default: theme.muted, selected: theme.accent }), [theme.accent, theme.muted]);
  const labelStyle = useMemo(
    () => ({
      default: { color: theme.muted, fontFamily: fonts.semibold },
      selected: { color: theme.accent, fontFamily: fonts.semibold },
    }),
    [theme.accent, theme.muted],
  );

  return (
    <NativeTabs
      backgroundColor={theme.bg}
      indicatorColor={theme.track}
      iconColor={iconColor}
      labelStyle={labelStyle}
      labelVisibilityMode="labeled">
      {tabItems}
    </NativeTabs>
  );
}
