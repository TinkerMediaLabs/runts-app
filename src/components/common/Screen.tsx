import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { gradients } from '@/theme/tokens';

// gradient: paints the shared screen gradient behind the content (children must not paint an opaque background).
export default function Screen({ children, style, gradient = false } : any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          flex: 1,
          paddingBottom: insets.bottom,
          backgroundColor: colors.surface0,
        },
        style,
      ]}
    >
      {gradient ? (
        <LinearGradient
          colors={gradients.screen.colors}
          start={gradients.screen.start}
          end={gradients.screen.end}
          style={{ flex: 1 }}
        >
          {children}
        </LinearGradient>
      ) : children}
    </View>
  );
}
