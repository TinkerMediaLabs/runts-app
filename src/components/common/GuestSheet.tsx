import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import BottomSheet from '@/components/common/BottomSheet';
import Button from '@/components/common/Button';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { navigate } from '@/navigation/RootNavigator';
import { subscribeAccountPrompt } from '@/lib/requireAccount';
import { clearPendingAction } from '@/lib/pendingAction';

// The sheet a guest sees when they tap something that needs an account. Opened by askForAccount(reason).
const GuestSheet = () => {
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => subscribeAccountPrompt(r => setReason(r)), []);

  // Closing the sheet without going on forgets what they were trying to do.
  const dismiss = () => { clearPendingAction(); setReason(null); };

  const go = (screen: 'SignUp' | 'SignIn') => {
    setReason(null);
    navigate(screen);
  };

  return (
    <BottomSheet visible={reason !== null} onClose={dismiss} title="Create a free account">
      <Text style={styles.body}>
        {reason ? `Make a free account to ${reason}. ` : ''}It only takes a minute.
      </Text>
      <View style={styles.buttons}>
        <Button label="Create account" onPress={() => go('SignUp')} glow />
        <Button label="Sign in" variant="secondary" onPress={() => go('SignIn')} />
        <Button label="Not now" variant="text" onPress={dismiss} />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  body: { fontSize: fontSizes.body, color: colors.textSecondary, lineHeight: 22, marginBottom: 20 },
  buttons: { gap: 10 },
});

export default GuestSheet;
