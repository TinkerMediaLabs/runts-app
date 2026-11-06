import React, { useState, useEffect, useRef } from 'react';
import { successHaptic } from '../../lib/haptics';
import { View, Alert, TouchableOpacity, Modal, TouchableWithoutFeedback, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@/components/common/AppText';
import { fields } from '../../theme/fields';
import Button from '@/components/common/Button';
import { TextInput } from '@/components/common/AppTextInput';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPosition(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookmarkModalProps {
  visible:         boolean;
  positionSeconds: number;
  onClose:         () => void;
  onConfirm:       (name: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookmarkModal({
  visible,
  positionSeconds,
  onClose,
  onConfirm,
}: BookmarkModalProps) {
  const [name,        setName]        = useState('My Bookmark');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Reset name when modal opens
  useEffect(() => {
    if (visible) {
      setName('My Bookmark');
      // Auto-select default text so user can type straight away
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setNativeProps({ selection: { start: 0, end: 12 } });
      }, 150);
    }
  }, [visible]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(name.trim() || 'My Bookmark');
      successHaptic();
      onClose();
    } catch (err) {
      console.warn('Bookmark save failed:', err);
      Alert.alert('Could not save bookmark', 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback
          accessibilityRole="none"
        onPress={onClose}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <View style={styles.card}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <FontAwesome5 name={'bookmark' as any} size={iconSize.sm} color={colors.accent} iconStyle="solid" />
            </View>
            <Text style={styles.title}>Create Bookmark</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <FontAwesome5 name={'times' as any} size={iconSize.sm} color={colors.textTertiary} iconStyle="solid" />
            </TouchableOpacity>
          </View>

          {/* Bookmark position */}
          <View style={styles.positionRow}>
            <FontAwesome5 name={'clock' as any} size={iconSize.xs} color={colors.textTertiary} iconStyle="solid" />
            <Text style={styles.positionText}>
              Bookmarked at <Text style={styles.positionHighlight}>{formatPosition(positionSeconds)}</Text>
            </Text>
          </View>

          {/* Name input */}
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="My Bookmark"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Bookmark name"
            maxLength={30}
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
          <Text style={styles.charCount}>{name.length} / 30</Text>

          {/* Confirm button */}
          <Button
            label="Create Bookmark"
            loading={isSubmitting}
            onPress={handleConfirm}
          />

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  } as any,
  card: {
    width: '85%',
    backgroundColor: colors.surface1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  positionText: {
    fontSize: fontSizes.small,
    color: colors.textSecondary,
  },
  positionHighlight: {
    color: colors.accent,
    fontWeight: '600',
  },

  input: {
    ...fields.box,
    ...fields.text,
    marginBottom: 6,
  },
  charCount: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 16,
  },

});