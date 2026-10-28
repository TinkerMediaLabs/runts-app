import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { colors } from '../../theme/colors';
import { fontSizes } from '@/theme/tokens';

// Small all-caps label above a settings-style group of rows (Profile, Premium).
const SectionLabel = ({ text }: { text: string }) => (
  <Text style={styles.label} accessibilityRole="header">{text}</Text>
);

const styles = StyleSheet.create({
  label: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
  },
});

export default SectionLabel;
