import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/common/AppText';
import useTypography from '../../theme/typography';
import { layout, fontSizes } from '../../theme/tokens';
import { colors } from '../../theme/colors';

// The one heading for a content row (a list of tiles under a title): gutter on both sides. An optional action
// ("See all") sits on the right and opens the full list.
const SectionTitle = ({ text, numberOfLines, actionLabel, onAction }: { text: string; numberOfLines?: number; actionLabel?: string; onAction?: () => void }) => {
  const typo = useTypography();
  return (
    <View style={styles.wrap}>
      <Text style={[typo.title, styles.text]} accessibilityRole="header" numberOfLines={numberOfLines}>{text}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 12, bottom: 12, left: 12, right: 0 }} accessibilityRole="button" accessibilityLabel={`${actionLabel}, ${text}`}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: layout.gutter, paddingTop: layout.titlePadTop, paddingBottom: layout.titlePadBottom },
  text: { flexShrink: 1 },
  action: { color: colors.textSecondary, fontSize: fontSizes.small, fontWeight: '600' },
});

export default SectionTitle;
