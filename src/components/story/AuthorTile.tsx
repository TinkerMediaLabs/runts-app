import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { useNavigation } from '@react-navigation/native';

import { useUnfollowAuthor } from '../../hooks/queries/useAuthorFollowing';

interface AuthorTileProps {
  author: any;
  followRecordId: string;
  tagMap: Record<string, string>;
  storyCount?: number;
  totalListens?: number;
}
export default function AuthorTile({
  author,
  followRecordId,
  tagMap,
  storyCount = 0,
  totalListens = 0,
}: AuthorTileProps) {

 const navigation = useNavigation<any>();
  const { mutate: unfollow, isPending } = useUnfollowAuthor();

  const primaryGenreNames = (author?.primaryGenres ?? [])
    .map((tagId: string) => tagMap[tagId])
    .filter(Boolean);

  const handleUnfollow = () => {
    unfollow({ recordId: followRecordId, authorId: author.id });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigation.navigate('AuthorDetails', { id: author.id })}
      style={styles.tile}
    >
      {/* Avatar */}
      <Image
        source={
          author?.profilePicUri
            ? { uri: author.profilePicUri }
            : require('../../../assets/images/blankprofile.png')
        }
        style={styles.avatar}
      />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{author?.name ?? ''}</Text>
          <TouchableOpacity
            onPress={handleUnfollow}
            disabled={isPending}
            activeOpacity={0.7}
            style={styles.unfollowBtn}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="cyan" />
            ) : (
              <Text style={styles.unfollowText}>Following</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Primary genres */}
        {primaryGenreNames.length > 0 && (
          <View style={styles.genreRow}>
            {primaryGenreNames.slice(0, 3).map((name: string) => (
              <View key={name} style={styles.genreChip}>
                <Text style={styles.genreChipText}>{name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bio */}
        {author?.bio ? (
          <Text style={styles.bio} numberOfLines={2}>{author.bio}</Text>
        ) : null}

        {/* Stats */}
        <View style={styles.statsRow}>
          <FontAwesome5 name="book-open" size={10} color="rgba(255,255,255,0.4)" iconStyle="solid" />
          <Text style={styles.statText}>{storyCount} {storyCount === 1 ? 'story' : 'stories'}</Text>
          <Text style={styles.statDot}>·</Text>
          <FontAwesome5 name="headphones" size={10} color="rgba(255,255,255,0.4)" iconStyle="solid" />
          <Text style={styles.statText}>{totalListens.toLocaleString()} listens</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a2a',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.15)',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  unfollowBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.4)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  unfollowText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'cyan',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  genreChip: {
    backgroundColor: 'rgba(0,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,255,255,0.2)',
  },
  genreChipText: {
    fontSize: 11,
    color: 'rgba(0,255,255,0.8)',
    fontWeight: '500',
  },
  bio: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
  },
  statDot: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
  },
});