import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

type SymbolIconProps = {
  ios: SFSymbol;
  other: AndroidSymbol;
  color: string;
  size?: number;
};

export function SymbolIcon({ ios, other, color, size = 20 }: SymbolIconProps) {
  return <SymbolView name={{ ios, android: other, web: other }} tintColor={color} size={size} />;
}
