import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Text } from '@/components/common/AppText';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useDownloadState } from '../../hooks/useDownloadState';
import { retryDownload } from '../../hooks/queries/useDownloads';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/tokens';
import { iconSize } from '@/theme/tokens';

// Shows where a story's offline download stands: saved, saving with progress, or failed with a retry.
export default function DownloadBadge({ storyId }: { storyId: string }) {
  const { status, progress } = useDownloadState(storyId);
  if (status === 'none') return null;

  if (status === 'complete') {
    return (
      <View style={styles.row} accessible accessibilityLabel="Saved for offline listening">
        <FontAwesome5 name="download" size={iconSize.xs} color={colors.accent} iconStyle="solid" />
      </View>
    );
  }

  if (status === 'downloading') {
    const pct = Math.round(progress * 100);
    return (
      <View style={styles.row} accessible accessibilityLabel={`Saving for offline listening, ${pct} percent`}>
        <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
        <Text style={styles.text}>{pct}%</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => { retryDownload(storyId).catch(() => {}); }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel="Download failed. Retry"
    >
      <FontAwesome5 name="redo" size={iconSize.xs} color="#ff8a80" iconStyle="solid" />
      <Text style={[styles.text, { color: '#ff8a80' }]}>Retry download</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.fillStrong, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.accent },
  text: { color: colors.textStrong, fontSize: fontSizes.micro },
});
