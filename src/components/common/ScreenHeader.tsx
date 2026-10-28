import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import { Text } from '@/components/common/AppText';
import { colors } from '../../theme/colors';
import { fontSizes, iconSize, layout } from '../../theme/tokens';

type Props = {
  title?: string;
  /** Replaces the title, e.g. a search field. */
  children?: React.ReactNode;
  /** Optional element on the right edge (button, menu). */
  right?: React.ReactNode;
  onBack?: () => void;
  /** Capitalize each word of the title (for tag names stored lowercase). */
  capitalize?: boolean;
};

// The one header for pushed screens: back chevron, title, optional right slot.
// Top padding follows the device safe area so it sits the same on every phone.
const ScreenHeader = ({ title, children, right, onBack, capitalize }: Props) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={onBack ?? (() => navigation.goBack())}
        style={styles.back}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <FontAwesome5 name="chevron-left" size={iconSize.md} color={colors.textPrimary} iconStyle="solid" />
      </TouchableOpacity>
      {children ?? (
        <Text style={[styles.title, capitalize && { textTransform: 'capitalize' }]} numberOfLines={1} accessibilityRole="header">{title}</Text>
      )}
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.gutter,
    paddingBottom: 12,
    gap: 12,
  },
  back: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-start' },
  title: { flex: 1, color: colors.textPrimary, fontSize: fontSizes.title, fontWeight: 'bold' },
  right: { marginLeft: 'auto' },
});

export default ScreenHeader;
