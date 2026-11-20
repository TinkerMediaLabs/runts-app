import React from 'react';
import { View, Modal, TouchableOpacity, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fontSizes, radius, iconSize } from '@/theme/tokens';
import Icon from '@/components/common/Icon';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  titleSize?: number;   // a larger heading for a sheet that asks a question
  children: React.ReactNode;
};

// The app's one bottom sheet: dim backdrop (tap to close), grab handle, title with a close button, content. Used by
// Account and by the player's speed and sleep timer sheets so every sheet looks and behaves the same.
export default function BottomSheet({ visible, onClose, title, titleSize, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.wrapper}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.title, titleSize ? { fontSize: titleSize } : null]} accessibilityRole="header">{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              accessibilityRole="button"
              accessibilityLabel={`Close ${title}`}
            >
              <Icon name="close" size={iconSize.sm} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  wrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.fillStrong,
    alignSelf: 'center', marginBottom: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { flex: 1, marginRight: 12, fontSize: fontSizes.subtitle, fontWeight: '700', color: colors.textPrimary },
});
