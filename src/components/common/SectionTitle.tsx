import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import useTypography from '../../theme/typography';
import { layout } from '../../theme/tokens';

// The one heading for a content row (a list of tiles under a title): gutter on the left, 20 above and below.
const SectionTitle = ({ text, numberOfLines }: { text: string; numberOfLines?: number }) => {
  const typo = useTypography();
  return (
    <View style={styles.wrap}>
      <Text style={typo.title} accessibilityRole="header" numberOfLines={numberOfLines}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginLeft: layout.gutter, paddingVertical: layout.gutter },
});

export default SectionTitle;
