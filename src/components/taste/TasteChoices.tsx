import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '@/components/common/AppText';
import { colors } from '@/theme/colors';
import { fontSizes, radius } from '@/theme/tokens';

// A wrapped set of selectable choices: moods ("Dark and scary") or lengths ("Short and sweet", "Under 15 minutes").
// `max` caps how many can be on at once (moods 3); lengths pass none. Used by sign-up and the Your taste screen.

export type TasteChoice = { id: string; title: string; subtitle?: string | null; color?: string | null };

type Props = {
  choices: TasteChoice[];
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
  loading?: boolean;
  emptyText?: string;
};

const TasteChoices = ({ choices, selected, onChange, max, loading, emptyText }: Props) => {
  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!choices.length) return <Text style={styles.empty}>{emptyText ?? 'Nothing to choose yet.'}</Text>;

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(i => i !== id));
    else if (!max || selected.length < max) onChange([...selected, id]);
  };

  return (
    <View style={styles.wrap}>
      {choices.map(c => {
        const on = selected.includes(c.id);
        const base = c.color ?? colors.accent;
        return (
          <TouchableOpacity
            key={c.id}
            activeOpacity={0.85}
            onPress={() => toggle(c.id)}
            accessibilityRole="checkbox"
            accessibilityLabel={c.subtitle ? `${c.title}, ${c.subtitle}` : c.title}
            accessibilityState={{ checked: on }}
            style={[styles.chip, { backgroundColor: on ? base : 'rgba(255,255,255,0.05)', borderColor: on ? base : 'rgba(255,255,255,0.1)' }]}
          >
            <Text style={[styles.title, { color: on ? '#000' : '#ffffffd0' }]}>{c.title}</Text>
            {!!c.subtitle && <Text style={[styles.sub, { color: on ? '#000000a0' : colors.textSecondary }]}>{c.subtitle}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { width: '47%', borderWidth: 1, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 16, minHeight: 48, justifyContent: 'center' },
  title: { fontSize: fontSizes.body, fontWeight: '600' },
  sub: { fontSize: fontSizes.small, marginTop: 2 },
  center: { paddingVertical: 24, alignItems: 'center' },
  empty: { color: colors.textSecondary, fontSize: fontSizes.body },
});

export default TasteChoices;
