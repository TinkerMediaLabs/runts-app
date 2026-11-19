import React, { useEffect, useState } from 'react';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';
import { StyleSheet } from 'react-native';

import Sheet from '@/components/common/BottomSheet';
import Button from '@/components/common/Button';
import { useUpdateBookmark } from '../../hooks/queries/useBookmarks';
import { fields } from '@/theme/fields';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';

// The "Rename bookmark" drawer. Same look as the other drawers (see EditNameSheet).
export default function EditBookmarkSheet({ bookmark, onClose }: { bookmark: any | null; onClose: () => void }) {
  const { mutate: rename, isPending } = useUpdateBookmark();
  const [name, setName] = useState('');

  useEffect(() => { if (bookmark) setName(bookmark.name ?? ''); }, [bookmark]);

  const save = () => {
    if (!bookmark || !name.trim()) return;
    rename({ bookmarkId: bookmark.id, name }, { onSuccess: onClose });
  };

  return (
    <Sheet visible={!!bookmark} onClose={onClose} title="Rename Bookmark">
      <Text style={styles.label}>Bookmark name</Text>
      <TextInput
        style={[fields.box, fields.text, { marginBottom: 24, color: colors.textPrimary }]}
        value={name}
        onChangeText={setName}
        placeholder="My Bookmark"
        accessibilityLabel="Bookmark name"
        placeholderTextColor={colors.textSecondary}
        maxLength={40}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
      />
      <Button label="Save" onPress={save} loading={isPending} disabled={name.trim().length === 0} variant="primary" style={{ marginTop: 4 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSizes.caption, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 8 },
});
