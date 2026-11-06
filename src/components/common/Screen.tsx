import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';

export default function Screen({ children, style } : any) {
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
      {children}
    </View>
  );
}