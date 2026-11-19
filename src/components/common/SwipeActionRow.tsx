import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Text } from '@/components/common/AppText';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import Icon, { type IconName } from '@/components/common/Icon';

// A list row that swipes left to show action buttons (Delete, Edit...). A grabber with a chevron sits on the far
// right of the row so people can see it swipes, and tapping the grabber opens the actions too. Only one row is
// open at a time.
export type SwipeAction = {
  key: string;
  label: string;
  icon: IconName;
  color: string;
  onPress: () => void;
};

const ACTION_WIDTH = 76;
let openRow: SwipeableMethods | null = null;

const SwipeActionRow = ({ children, actions, gap = 0 }: { children: React.ReactNode; actions: SwipeAction[]; gap?: number }) => {
  const ref = useRef<SwipeableMethods>(null);

  const renderActions = () => (
    <View style={styles.actions}>
      {actions.map(a => (
        <TouchableOpacity
          key={a.key}
          activeOpacity={0.8}
          style={[styles.action, { backgroundColor: a.color }]}
          onPress={() => { ref.current?.close(); a.onPress(); }}
          accessibilityRole="button"
          accessibilityLabel={a.label}
        >
          <Icon name={a.icon} size={22} color="#fff" />
          <Text style={styles.actionLabel}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      overshootRight={false}
      rightThreshold={40}
      renderRightActions={renderActions}
      onSwipeableWillOpen={() => {
        if (openRow && openRow !== ref.current) openRow.close();
        openRow = ref.current;
      }}
      onSwipeableClose={() => { if (openRow === ref.current) openRow = null; }}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>{children}</View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => ref.current?.openRight()}
          style={styles.grabber}
          accessible={false}
          importantForAccessibility="no"
        >
          <Icon name="chevron-left" size={14} color={colors.textSecondary} weight="bold" />
        </TouchableOpacity>
      </View>
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: colors.surface0 },
  grabber: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface3,
    borderTopLeftRadius: 0,
  },
  actions: { flexDirection: 'row' },
  action: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionLabel: { color: '#fff', fontSize: fontSizes.caption, fontWeight: '600' },
});

export default SwipeActionRow;
