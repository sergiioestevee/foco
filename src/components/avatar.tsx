import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PickerPopup } from '@/components/picker-popup';
import { avatars, getAvatar, type AvatarId } from '@/features/profile/avatars';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';

/** The student's animal on its soft colour circle. */
export function Avatar({ id, size = 56 }: { id: AvatarId | null | undefined; size?: number }) {
  const avatar = getAvatar(id);
  return (
    <View
      accessible
      accessibilityLabel={`Avatar: ${avatar.name}`}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${avatar.color}40` }]}>
      {/* Emoji keep their own colours; allowFontScaling off so the face always fits its circle. */}
      <Text allowFontScaling={false} style={{ fontSize: size * 0.52, lineHeight: size * 0.66 }}>{avatar.emoji}</Text>
    </View>
  );
}

type AvatarPickerProps = {
  visible: boolean;
  value: AvatarId | null;
  onChange: (id: AvatarId) => void;
  onClose: () => void;
};

/** Centred grid of avatars; picking one marks it, «Listo» closes. */
export function AvatarPicker({ visible, value, onChange, onClose }: AvatarPickerProps) {
  const theme = useTheme();
  const selectedId = getAvatar(value).id;

  return (
    <PickerPopup visible={visible} title="Elige tu avatar" onClose={onClose}>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {avatars.map((avatar) => {
          const selected = avatar.id === selectedId;
          return (
            <Pressable
              key={avatar.id}
              accessibilityRole="radio"
              accessibilityLabel={avatar.name}
              accessibilityState={{ selected }}
              onPress={() => onChange(avatar.id)}
              style={[styles.option, { borderColor: selected ? theme.accent : 'transparent' }]}>
              <Avatar id={avatar.id} size={52} />
            </Pressable>
          );
        })}
      </View>
    </PickerPopup>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  option: { padding: 3, borderRadius: 32, borderWidth: 2.5 },
});
