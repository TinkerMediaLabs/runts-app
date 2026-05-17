import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Screen({ children, style } : any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          flex: 1,
          paddingBottom: insets.bottom,
          backgroundColor: '#000',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}