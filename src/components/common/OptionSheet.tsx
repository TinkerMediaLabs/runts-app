import React from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import BottomSheet from '@/components/common/BottomSheet';
import Icon from '@/components/common/Icon';
import { colors } from '@/theme/colors';
import { fontSizes, iconSize } from '@/theme/tokens';

type Option = { value: string; label: string };

type Props = {
  visible: boolean;
  title: string;
  options: Option[];
  current: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

// A bottom sheet with one choice per row and a check on the current one (the shared BottomSheet shell).
export default function OptionSheet({ visible, title, options, current, onSelect, onClose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {options.map(opt => {
          const on = opt.value === current;
          return (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.7}
              onPress={() => { onSelect(opt.value); onClose(); }}
              style={styles.row}
              accessibilityRole="radio"
              accessibilityLabel={opt.label}
              accessibilityState={{ checked: on }}
            >
              <Text style={[styles.label, on && styles.labelOn]}>{opt.label}</Text>
              {on ? <Icon name="check" size={iconSize.sm} color={colors.accent} /> : <View />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 360 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle,
  },
  label: { fontSize: fontSizes.body, color: colors.textSecondary, fontWeight: '500' },
  labelOn: { color: colors.accent, fontWeight: '700' },
});
