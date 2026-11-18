import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '@/components/common/AppText';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

import Screen from '@/components/common/Screen';
import Button from '@/components/common/Button';
import TasteChoices from '@/components/taste/TasteChoices';
import { usePickerMoods, usePickerLengths } from '../../hooks/queries/usePickerOptions';
import { useApp } from '../../context/AppContext';
import { unwrap } from '@/lib/amplifyResult';
import { Analytics } from '@/lib/analytics';
import { markPromptedToday } from '@/lib/todayChoice';
import { colors } from '@/theme/colors';
import { fontSizes, iconSize } from '@/theme/tokens';
import Icon from '@/components/common/Icon';

// Sign-up steps 2 and 3, after the genres: "What do you reach for?" (up to 3 moods) and "How long is your usual
// listen?" (any lengths). Both are optional; the friendly skip buttons save an empty answer so we know they were asked.
// The account is saved once, at the end, together with the genres and birthdate passed from the earlier screens.
export const TASTE_VERSION = 1;

const WelcomeTaste = ({ route }: any) => {
  const insets = useSafeAreaInsets();
  const { refreshAuth } = useApp();
  const birthdate: string | null = route?.params?.birthdate ?? null;
  const genres: string[] = route?.params?.genres ?? [];

  const [step, setStep] = useState<'moods' | 'lengths'>('moods');
  const [moods, setMoods] = useState<string[]>([]);
  const [lengths, setLengths] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const moodQ = usePickerMoods();
  const lengthQ = usePickerLengths();

  const save = async (finalMoods: string[], finalLengths: string[]) => {
    setSaving(true); setFailed(false);
    try {
      const client = generateClient<Schema>();
      const { userId } = await getCurrentUser();
      unwrap(await client.models.User.update({
        id: userId,
        birthdate,
        onboardingComplete: true,
        preferredTagIds: genres,
        preferredMoodTagIds: finalMoods,
        preferredLengths: finalLengths,
        tasteVersion: TASTE_VERSION,
      }), 'Save your preferences');
      await markPromptedToday();   // they just answered these questions; the daily sheet starts tomorrow
      Analytics.onboardingCompleted();
      await refreshAuth();
    } catch (e: any) {
      console.error('WelcomeTaste error:', e?.message ?? e);
      setFailed(true);
      setSaving(false);
    }
  };

  // If the CMS has no moods (or no lengths) switched on, skip that step instead of showing an empty screen.
  const noMoods = !moodQ.isLoading && !(moodQ.data?.length);
  const noLengths = !lengthQ.isLoading && !(lengthQ.data?.length);

  const onMoodsDone = (picked: string[]) => {
    setMoods(picked);
    if (noLengths) save(picked, []); else setStep('lengths');
  };

  // Nothing to ask when the CMS has no moods switched on: go straight to the next step.
  useEffect(() => {
    if (step === 'moods' && noMoods) onMoodsDone([]);
  }, [noMoods]);

  const isMoods = step === 'moods';

  return (
    <Screen>
      <LinearGradient colors={['#0a0a14', '#000', '#000']} style={{ flex: 1 }}>
        <Animated.View entering={FadeInUp.duration(600)} style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.title}>{isMoods ? 'What do you reach for?' : 'How long is your usual listen?'}</Text>
          <Text style={styles.subtitle}>
            {isMoods ? 'Pick up to 3 moods. You can change this any time.' : 'Pick as many as you like. A commute or a lunch break, we will find the right fit.'}
          </Text>
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {isMoods ? (
            <TasteChoices
              choices={(moodQ.data ?? []).map((t: any) => ({ id: t.id, title: t.name, color: t.color }))}
              selected={moods}
              onChange={setMoods}
              max={3}
              loading={moodQ.isLoading}
            />
          ) : (
            <TasteChoices
              choices={(lengthQ.data ?? []).map((o: any) => ({ id: o.key, title: o.label, subtitle: o.subtitle }))}
              selected={lengths}
              onChange={setLengths}
              loading={lengthQ.isLoading}
            />
          )}
          {failed && <Text style={styles.error}>Could not save. Check your connection and try again.</Text>}
        </ScrollView>

        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          {isMoods ? (
            <>
              <Text style={styles.count}>{moods.length}/3 selected</Text>
              <Button
                label="Continue"
                disabled={!moods.length}
                onPress={() => onMoodsDone(moods)}
                icon={<Icon name="arrow-right" size={iconSize.sm} color={colors.textOnAccent} />}
              />
              <Button label="Surprise me" variant="text" onPress={() => onMoodsDone([])} />
            </>
          ) : (
            <>
              <Button label="Finish" loading={saving} disabled={!lengths.length} onPress={() => save(moods, lengths)} />
              <Button label="Any length works" variant="text" disabled={saving} onPress={() => save(moods, [])} />
            </>
          )}
        </Animated.View>
      </LinearGradient>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 28, paddingBottom: 20 },
  title: { fontSize: fontSizes.display, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.2, marginBottom: 8 },
  subtitle: { fontSize: fontSizes.body, color: colors.textSecondary, lineHeight: 22 },
  body: { paddingHorizontal: 24, paddingBottom: 20 },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 8 },
  count: { textAlign: 'center', fontSize: fontSizes.small, color: colors.textSecondary, fontWeight: '500' },
  error: { color: colors.textSecondary, fontSize: fontSizes.small, marginTop: 16 },
});

export default WelcomeTaste;
