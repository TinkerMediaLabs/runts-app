import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@/components/common/AppText';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

import { useApp } from '@/context/AppContext';
import { usePrimaryTags } from '../../hooks/queries/useTags';
import { findNewGenres, markGenresSeen } from '../../lib/genreNudge';
import { spacing } from '../../theme/spacing';

// "New genre" note at the top of Home. It checks once per visit; if a genre was added since the listener
// last looked, it says so and offers the edit-genres screen. It only decides while the sections below are
// still waiting (see `onDecided`), so it never pushes already-visible lists down.
export function useNewGenreNudge() {
  const { userId } = useApp();
  const { data: tags, isError } = usePrimaryTags();
  const [state, setState] = useState<{ decided: boolean; names: string[]; ids: string[] }>({ decided: false, names: [], ids: [] });

  useEffect(() => {
    if (state.decided) return;
    if (!userId) { setState(s => ({ ...s, decided: true })); return; }
    let cancelled = false;
    const timeout = setTimeout(() => { if (!cancelled) setState(s => (s.decided ? s : { ...s, decided: true })); }, 1500);
    if (tags || isError) {
      const genres = (tags ?? []).filter((t: any) => !t.isErotic);
      findNewGenres(userId, genres.map((g: any) => g.id)).then(ids => {
        if (cancelled) return;
        setState({ decided: true, ids, names: ids.map(id => genres.find((g: any) => g.id === id)?.name).filter(Boolean) as string[] });
      });
    }
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [tags, isError, userId, state.decided]);

  return { ...state, userId };
}

const NewGenreNudge = ({ names, ids, userId, onDismiss }: { names: string[]; ids: string[]; userId: string | null; onDismiss: () => void }) => {
  const navigation = useNavigation<any>();
  if (!names.length) return null;
  const label = names.length === 1 ? `New genre: ${names[0]}` : `${names.length} new genres: ${names.join(', ')}`;
  const dismiss = () => { if (userId) markGenresSeen(userId, ids); onDismiss(); };
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.body}>Want it in your For You list?</Text>
      </View>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => { dismiss(); navigation.navigate('EditGenresScreen'); }}
        accessibilityRole="button"
        accessibilityLabel="Choose your genres"
      >
        <Text style={styles.btnText}>Choose</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.close}
        onPress={dismiss}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <FontAwesome5 name="times" size={16} color="rgba(255,255,255,0.65)" iconStyle="solid" />
      </TouchableOpacity>
    </View>
  );
};

export default NewGenreNudge;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: spacing.margin, marginBottom: 14, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(0,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,255,255,0.3)',
  },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  body: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  btn: { backgroundColor: 'cyan', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  btnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  close: { padding: 4 },
});
