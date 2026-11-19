import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

import SearchInput from '@/components/common/SearchInput';
import FilterChip from '@/components/common/FilterChip';
import OptionSheet from '@/components/common/OptionSheet';
import { DURATION_OPTIONS } from '@/hooks/queries/useSearch';
import { pinnedFilterActive, NO_PINNED_FILTER, type PinnedFilter } from '@/lib/pinnedFilter';
import { spacing } from '@/theme/spacing';

type Props = {
  filter: PinnedFilter;
  onChange: (next: PinnedFilter) => void;
  genres: { id: string; name: string }[];   // the genres of the pinned stories, so every choice returns something
};

// The row under the Pinned tab: a search field, then the same filter pills as Discover search (length, genre).
export default function PinnedFilterBar({ filter, onChange, genres }: Props) {
  const [sheet, setSheet] = useState<null | 'length' | 'genre'>(null);
  const genreName = filter.tagId ? genres.find(g => g.id === filter.tagId)?.name ?? 'Genre' : 'All Genres';

  return (
    <View style={styles.wrap}>
      <View style={styles.search}>
        <SearchInput
          value={filter.query}
          onChangeText={query => onChange({ ...filter, query })}
          placeholder="Search your pinned stories"
          maxLength={50}
          showClear
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        <FilterChip
          label={`${DURATION_OPTIONS.find(o => o.value === filter.duration)?.label ?? 'Any Length'} ▾`}
          active={filter.duration !== 'any'}
          onPress={() => setSheet('length')}
        />
        <View style={styles.divider} />
        <FilterChip label={`${genreName} ▾`} active={filter.tagId !== null} onPress={() => setSheet('genre')} />
        {pinnedFilterActive(filter) ? (
          <>
            <View style={styles.divider} />
            <FilterChip label="Clear" active={false} onPress={() => onChange(NO_PINNED_FILTER)} />
          </>
        ) : null}
      </ScrollView>

      <OptionSheet
        visible={sheet === 'length'}
        title="Story Length"
        options={DURATION_OPTIONS}
        current={filter.duration}
        onSelect={v => onChange({ ...filter, duration: v as PinnedFilter['duration'] })}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'genre'}
        title="Genre"
        options={[{ value: '', label: 'All Genres' }, ...genres.map(g => ({ value: g.id, label: g.name }))]}
        current={filter.tagId ?? ''}
        onSelect={v => onChange({ ...filter, tagId: v || null })}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 12, paddingBottom: 4, gap: 10 },
  search: { paddingHorizontal: spacing.margin },
  chips: { paddingHorizontal: spacing.margin, gap: 4, flexDirection: 'row', alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: '#333', marginHorizontal: 4 },
});
