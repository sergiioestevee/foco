import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { fonts } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

const tabs = [
  { name: 'home', href: '/', label: 'Inicio', ios: 'smallcircle.filled.circle', other: 'radio_button_checked' },
  { name: 'calendar', href: '/calendar', label: 'Calendario', ios: 'calendar', other: 'calendar_month' },
  { name: 'tasks', href: '/tasks', label: 'Tareas', ios: 'checklist', other: 'checklist' },
  { name: 'assistant', href: '/assistant', label: 'IA', ios: 'sparkles', other: 'auto_awesome' },
  { name: 'profile', href: '/profile', label: 'Perfil', ios: 'person', other: 'person' },
] as const;

type TabInfo = (typeof tabs)[number];

export default function AppTabs() {
  const theme = useTheme();

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList style={[styles.tabList, { backgroundColor: theme.surf, borderColor: theme.line }]}>
        {tabs.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
            <TabButton tab={tab} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

function TabButton({ tab, isFocused, ...props }: TabTriggerSlotProps & { tab: TabInfo }) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.muted;

  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityLabel={tab.label} style={styles.tabButton}>
      <SymbolView name={{ ios: tab.ios, android: tab.other, web: tab.other }} tintColor={color} size={19} />
      <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  tabList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 46 },
  tabLabel: { fontSize: 11, lineHeight: 14, fontFamily: fonts.semibold },
});
