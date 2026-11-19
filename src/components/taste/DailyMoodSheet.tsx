import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import BottomSheet from '@/components/common/BottomSheet';
import Button from '@/components/common/Button';
import TasteChoices from '@/components/taste/TasteChoices';
import { useApp } from '@/context/AppContext';
import { usePlayer } from '@/context/PlayerContext';
import { usePickerMoods, usePickerLengths } from '@/hooks/queries/usePickerOptions';
import { usePrimaryTags } from '@/hooks/queries/useTags';
import { wasOpenedFromOutside } from '@/lib/launchContext';
import { shouldPromptMood, isEmptyChoice, type Choice } from '@/lib/moodPicks';
import {
  setTodayChoice, skipToday, getLastChoice, wasPromptedToday, markPromptedToday, subscribeMoodSheet,
} from '@/lib/todayChoice';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';

const SETTLE_MS = 2500;   // let the app finish starting, resume a story and handle a shared link before deciding

// "What are you in the mood for today?" Asked on its own the first time the app opens each local day (see shouldPromptMood
// for when it stays away), and again whenever the Today chip's Change is tapped. Everything is optional.
// `onOpenChange` lets the shell hold back first-use tips while it is open.
const DailyMoodSheet = ({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) => {
  const { isAuthenticated, isNewUser, isGuest, isLoading } = useApp();
  const { state, keepGoingStoryId } = usePlayer();
  const moodQ = usePickerMoods();
  const lengthQ = usePickerLengths();
  const genreQ = usePrimaryTags();

  const [visible, setVisible] = useState(false);
  const [moods, setMoods] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [lengths, setLengths] = useState<string[]>([]);
  const [last, setLast] = useState<Choice | null>(null);

  const open = () => { setMoods([]); setGenres([]); setLengths([]); getLastChoice().then(setLast); setVisible(true); };
  useEffect(() => { onOpenChange?.(visible); }, [visible]);

  const eligible = !isLoading && ((isAuthenticated && !isNewUser) || isGuest);
  const now = useRef({ story: false, popup: false });
  now.current = { story: !!state.currentTrack || !!state.isPlaying, popup: !!state.pendingRatingStoryId || !!keepGoingStoryId };

  // Decide once per app launch, a moment after the app is ready. If something is in the way, there is no sheet this launch.
  const decided = useRef(false);
  useEffect(() => {
    if (!eligible || decided.current) return;
    const t = setTimeout(async () => {
      if (decided.current) return;
      decided.current = true;
      const ok = shouldPromptMood({
        signedInOrGuest: true,
        promptedToday: await wasPromptedToday(),
        openedFromOutside: wasOpenedFromOutside(),
        storyLoaded: now.current.story,
        popupOpen: now.current.popup,
      });
      if (!ok) return;
      await markPromptedToday();
      open();
    }, SETTLE_MS);
    return () => clearTimeout(t);
  }, [eligible]);

  // The Today chip's Change.
  useEffect(() => subscribeMoodSheet(open), []);

  const close = () => setVisible(false);
  const show = async () => {
    const choice: Choice = { moodIds: moods, genreIds: genres, lengthKeys: lengths };
    close();
    await (isEmptyChoice(choice) ? skipToday() : setTodayChoice(choice));
  };
  const same = async () => { if (last) { close(); await setTodayChoice(last); } };
  const skip = async () => { close(); await skipToday(); };

  const genreChoices = (genreQ.data ?? []).filter((g: any) => !g.isErotic).map((g: any) => ({ id: g.id, title: g.name, color: g.color }));
  const any = moods.length + genres.length + lengths.length > 0;

  return (
    <BottomSheet visible={visible} onClose={close} title="What are you in the mood for today?">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {!isEmptyChoice(last) && (
          <View style={styles.sameRow}>
            <Button label="Same as last time" variant="outline" size="small" onPress={same} />
          </View>
        )}
        <Text style={styles.q}>What mood?</Text>
        <TasteChoices
          choices={(moodQ.data ?? []).map((t: any) => ({ id: t.id, title: t.name, color: t.color }))}
          selected={moods} onChange={setMoods} max={3} loading={moodQ.isLoading} emptyText="No moods yet."
        />
        <Text style={styles.q}>How long do you have?</Text>
        <TasteChoices
          choices={(lengthQ.data ?? []).map((o: any) => ({ id: o.key, title: o.label, subtitle: o.subtitle }))}
          selected={lengths} onChange={setLengths} loading={lengthQ.isLoading} emptyText="No lengths yet."
        />
        <Text style={styles.q}>Any specific genres?</Text>
        <TasteChoices choices={genreChoices} selected={genres} onChange={setGenres} max={3} loading={genreQ.isLoading} emptyText="No genres yet." />
      </ScrollView>
      <View style={styles.buttons}>
        <Button label="Show me stories" disabled={!any} onPress={show} glow />
        <Button label="Skip today" variant="text" onPress={skip} />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  sameRow: { alignItems: 'flex-start', marginBottom: 4 },
  q: { color: colors.textPrimary, fontSize: fontSizes.body, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  buttons: { gap: 8, marginTop: 16 },
});

export default DailyMoodSheet;
