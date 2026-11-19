import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Text } from '@/components/common/AppText';
import { colors } from '@/theme/colors';
import { fontSizes, radius } from '@/theme/tokens';
import Icon, { type IconName } from '@/components/common/Icon';

// A list row that swipes left to show action buttons (Delete, Edit...). A grabber with a chevron sits on the far
// right of the row so people can see it swipes, and tapping the grabber opens the actions too. Only one row is
// open at a time.
export type SwipeAction = {
  key: string;
  label: string;
  icon: IconName;
  color?: string;       // fill for a plain action
  danger?: boolean;     // the soft red style of the spoiler warning: tinted fill, red border, light red text
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
          style={[styles.action, a.danger ? styles.actionDanger : { backgroundColor: a.color }]}
          onPress={() => { ref.current?.close(); a.onPress(); }}
          accessibilityRole="button"
          accessibilityLabel={a.label}
        >
          <Icon name={a.icon} size={22} color={a.danger ? '#ff8888' : '#fff'} />
          <Text style={[styles.actionLabel, a.danger && { color: '#ff8888' }]}>{a.label}</Text>
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
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  actions: { flexDirection: 'row' },
  actionDanger: { backgroundColor: 'rgba(255,100,100,0.06)' },
  action: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionLabel: { color: '#fff', fontSize: fontSizes.caption, fontWeight: '600' },
});

export default SwipeActionRow;
