//this is the primary search screen that users can use to search for stories, authors, and tags

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';

import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
  InteractionManager,
} from 'react-native';

import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import { LinearGradient } from 'expo-linear-gradient';
import { getStatusBarHeight } from 'react-native-status-bar-height';

import StoryTile from '../../components/story/StoryTile';
import SearchInput from '../../components/common/SearchInput';
import Screen from '@/components/common/Screen';

import useStyles from '@/theme/styles';
import { spacing } from '@/theme/spacing';

import { useApp } from '@/context/AppContext';

const { width } = Dimensions.get('window');

const SearchScreen = ({ navigation }: any) => {
  const { userId } = useApp();

  const styles = useStyles();

  // -----------------------------
  // SEARCH STATE
  // -----------------------------

  const [searchQuery, setSearchQuery] = useState('');

  // -----------------------------
  // RESULTS
  // -----------------------------

  const [searchedStories, setSearchedStories] = useState<any[]>([]);
  const [tagsArray, setTagsArray] = useState<any[]>([]);
  const [authorArray, setAuthorArray] = useState<any[]>([]);

  // -----------------------------
  // INPUT FOCUS
  // -----------------------------

  const focus = useRef<any>(null);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      focus.current?.focus();
    });
  }, []);

  // -----------------------------
  // MOCK SEARCH DATA
  // Replace with Amplify GraphQL
  // -----------------------------

  const STORIES = useMemo(
    () => [
      {
        id: '1',
        title: 'The Last Ember',
        author: 'Sarah Vale',
        primaryTag: 'Fantasy',
        summary: 'A girl discovers fire magic in a frozen kingdom.',
        imageUri: '',
        narrator: 'Emma Stone',
        audioUri: '',
        time: '14 min',
        numListens: 1203,
      },
      {
        id: '2',
        title: 'Neon Nights',
        author: 'Marcus Reed',
        primaryTag: 'Cyberpunk',
        summary: 'A hacker uncovers a city-wide conspiracy.',
        imageUri: '',
        narrator: 'James Hall',
        audioUri: '',
        time: '21 min',
        numListens: 844,
      },
      {
        id: '3',
        title: 'Whispers Below',
        author: 'Emily Frost',
        primaryTag: 'Horror',
        summary: 'Something is living beneath the lake.',
        imageUri: '',
        narrator: 'Anna Brooks',
        audioUri: '',
        time: '18 min',
        numListens: 511,
      },
    ],
    []
  );

  const AUTHORS = useMemo(
    () => [
      {
        id: '1',
        penName: 'Sarah Vale',
        bio: 'Fantasy and mythology author.',
        numAuthored: 24,
        imageUri: '',
        type: 'Author',
      },
      {
        id: '2',
        penName: 'Marcus Reed',
        bio: 'Cyberpunk and sci-fi storyteller.',
        numAuthored: 16,
        imageUri: '',
        type: 'Author',
      },
    ],
    []
  );

  const TAGS = useMemo(
    () => [
      {
        id: '1',
        tagName: 'Fantasy',
        nsfw: false,
      },
      {
        id: '2',
        tagName: 'Cyberpunk',
        nsfw: false,
      },
      {
        id: '3',
        tagName: 'Horror',
        nsfw: false,
      },
      {
        id: '4',
        tagName: 'Romance',
        nsfw: false,
      },
    ],
    []
  );

  // -----------------------------
  // SEARCH LOGIC
  // -----------------------------

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    if (query.length < 1) {
      setSearchedStories([]);
      setAuthorArray([]);
      setTagsArray([]);
      return;
    }

    // stories
    const filteredStories = STORIES.filter(
      (story) =>
        story.title.toLowerCase().includes(query) ||
        story.author.toLowerCase().includes(query) ||
        story.primaryTag.toLowerCase().includes(query)
    );

    // authors
    const filteredAuthors = AUTHORS.filter((author) =>
      author.penName.toLowerCase().includes(query)
    );

    // tags
    const filteredTags = TAGS.filter((tag) =>
      tag.tagName.toLowerCase().includes(query)
    );

    setSearchedStories(filteredStories);
    setAuthorArray(filteredAuthors);
    setTagsArray(filteredTags);
  }, [searchQuery]);

  // -----------------------------
  // STORY TILE
  // -----------------------------

  const renderStory = ({ item }: any) => {
    return (
      <View style={{ marginBottom: spacing.margin }}>
        <StoryTile
          title={item.title}
          imageUri={item.imageUri}
          primaryTag={item.primaryTag}
          audioUri={item.audioUri}
          description={item.description}
          summary={item.summary}
          author={item.author}
          narrator={item.narrator}
          time={item.time}
          id={item.id}
          numListens={item.numListens}
        />
      </View>
    );
  };

  // -----------------------------
  // SCREEN
  // -----------------------------

  return (
    <Screen>
      <LinearGradient
        colors={['#13192C', '#161616', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View
          style={{
            marginTop: getStatusBarHeight() + spacing.margin,
            marginBottom: spacing.margin/2,
            //marginHorizontal: spacing.margin,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {/* BACK BUTTON */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              style={{
                padding: spacing.margin,
              }}
            >
              <FontAwesome5
                name="chevron-left"
                color="#fff"
                size={20}
                iconStyle="solid"
              />
            </TouchableOpacity>

            {/* SEARCH INPUT */}
            <View style={{ flex: 1, marginRight: spacing.margin }}>
              <SearchInput
                ref={focus}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmit={() => {}}
                placeholder="Stories, authors, tags"
                maxLength={40}
                iconColor="#000000a5"
                showClear={true}
              />
            </View>
          </View>
        </View>

        {/* RESULTS */}
        <FlatList
          data={searchedStories}
          renderItem={renderStory}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: 160,
          }}
          ListHeaderComponent={
            <View>
              {/* TAGS */}
              {tagsArray.length > 0 && (
                <View style={{ marginBottom: spacing.margin * 3 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: '#fff',
                      marginHorizontal: spacing.margin * 2,
                      marginBottom: spacing.margin,
                    }}
                  >
                    Tags
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      paddingHorizontal: spacing.margin * 2,
                    }}
                  >
                    {tagsArray.map((tag) => (
                      <TouchableOpacity
                        key={tag.id}
                        activeOpacity={0.7}
                        onPress={() =>
                          navigation.navigate('TagHomeScreen', {
                            id: tag.id,
                            name: tag.tagName,
                          })
                        }
                        style={{
                          marginRight: spacing.margin,
                        }}
                      >
                        <Text
                          style={{
                            color: tag.nsfw ? 'red' : 'cyan',
                            fontSize: 14,
                            backgroundColor: tag.nsfw
                              ? '#371111a5'
                              : '#1A4851a5',
                            borderColor: tag.nsfw
                              ? '#ff0000a5'
                              : '#00ffffa5',
                            borderWidth: 1,
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            overflow: 'hidden',
                          }}
                        >
                          #{tag.tagName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* AUTHORS */}
              {authorArray.length > 0 && (
                <View style={{ marginBottom: spacing.margin * 3 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: '#fff',
                      marginHorizontal: spacing.margin * 2,
                      marginBottom: spacing.margin * 2,
                    }}
                  >
                    Authors
                  </Text>

                  {authorArray.map((author) => (
                    <TouchableOpacity
                      key={author.id}
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('CreatorScreen', {
                          userID: author.id,
                          creatorType: author.type,
                        })
                      }
                      style={{
                        marginHorizontal: spacing.margin * 2,
                        marginBottom: spacing.margin * 2,
                      }}
                    >
                      <View style={{ flexDirection: 'row' }}>
                        <Image
                          source={
                            author.imageUri
                              ? { uri: author.imageUri }
                              : require('../../../assets/images/blankprofile.png')
                          }
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 10,
                            backgroundColor: '#363636',
                          }}
                        />

                        <View
                          style={{
                            flex: 1,
                            marginLeft: spacing.margin,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Text
                              numberOfLines={1}
                              style={{
                                color: '#fff',
                                fontSize: 16,
                                fontWeight: '700',
                                flex: 1,
                              }}
                            >
                              {author.penName}
                            </Text>

                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginLeft: spacing.margin,
                              }}
                            >
                              <FontAwesome5
                                name="book-open"
                                size={12}
                                color="#ffffffa5"
                                iconStyle="solid"
                              />

                              <Text
                                style={{
                                  marginLeft: 6,
                                  color: '#ffffffa5',
                                  fontSize: 12,
                                }}
                              >
                                {author.numAuthored}
                              </Text>
                            </View>
                          </View>

                          <Text
                            numberOfLines={3}
                            style={{
                              marginTop: 4,
                              color: '#ffffffa5',
                              fontSize: 12,
                              lineHeight: 18,
                            }}
                          >
                            {author.bio}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* STORIES HEADER */}
              {searchedStories.length > 0 && (
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: '#fff',
                    marginHorizontal: spacing.margin * 2,
                    marginBottom: spacing.margin * 2,
                  }}
                >
                  Stories
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            searchQuery.length > 0 ? (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 100,
                  paddingHorizontal: spacing.margin * 2,
                }}
              >
                <FontAwesome5
                  name="search"
                  size={40}
                  color="#ffffff40"
                  iconStyle="solid"
                />

                <Text
                  style={{
                    color: '#ffffffa5',
                    fontSize: 16,
                    marginTop: spacing.margin * 2,
                    textAlign: 'center',
                  }}
                >
                  No stories, authors, or tags found.
                </Text>
              </View>
            ) : (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 100,
                  paddingHorizontal: spacing.margin * 2,
                }}
              >
                <FontAwesome5
                  name="headphones"
                  size={40}
                  color="#ffffff40"
                  iconStyle="solid"
                />

                <Text
                  style={{
                    color: '#ffffffa5',
                    fontSize: 16,
                    marginTop: spacing.margin * 2,
                    textAlign: 'center',
                  }}
                >
                  Search for stories, authors, or tags.
                </Text>
              </View>
            )
          }
        />
      </LinearGradient>
    </Screen>
  );
};

export default SearchScreen;