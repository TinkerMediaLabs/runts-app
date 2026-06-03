import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';

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
      onClose();
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
      <TouchableWithoutFeedback onPress={onClose}>
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
              <FontAwesome5 name={'bookmark' as any} size={16} color="cyan" iconStyle="solid" />
            </View>
            <Text style={styles.title}>Create Bookmark</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <FontAwesome5 name={'times' as any} size={15} color="rgba(255,255,255,0.4)" iconStyle="solid" />
            </TouchableOpacity>
          </View>

          {/* Bookmark position */}
          <View style={styles.positionRow}>
            <FontAwesome5 name={'clock' as any} size={12} color="rgba(255,255,255,0.4)" iconStyle="solid" />
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
            placeholderTextColor="rgba(255,255,255,0.25)"
            maxLength={30}
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
          <Text style={styles.charCount}>{name.length} / 30</Text>

          {/* Confirm button */}
          <TouchableOpacity
            style={[styles.confirmBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.confirmText}>Create Bookmark</Text>
            )}
          </TouchableOpacity>

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
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
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
    borderRadius: 10,
    backgroundColor: 'rgba(0,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  positionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  positionHighlight: {
    color: 'cyan',
    fontWeight: '600',
  },

  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    marginBottom: 6,
  },
  charCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'right',
    marginBottom: 16,
  },

  confirmBtn: {
    backgroundColor: 'cyan',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
});