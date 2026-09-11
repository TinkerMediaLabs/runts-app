import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Dimensions, ScrollView, TouchableWithoutFeedback, Share } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useStoryNarratorNames } from '@/hooks/queries/useStoryNarratorNames';
import { formatNarratorDisplay, fmtDuration } from '@/lib/storyDisplay';

import Animated, {
  useAnimatedStyle,
  interpolate,
  withSpring,
  useAnimatedScrollHandler,
  useSharedValue,
  createAnimatedComponent,
  withTiming,
  Extrapolate,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';

import { useProgress } from '@rntp/player';

import { usePlayerUI } from '@/context/PlayerUIContext';
import { navigate } from '@/navigation/RootNavigator';
import { registerPlayerControls } from '@/features/audio/Playerref';

import { ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

import { colors } from '@/theme/colors';

import { usePlayer } from '@/context/PlayerContext';
import { audioEngine } from '@/features/audio/audioEngine';

import ProgressBar from './ProgressBar';
import PlayerControls from './PlayerControls';
import OptionsModal, { OPTIONS_BUTTON_SIZE } from './OptionsModal';
import PinButton from '../../components/common/PinButton';

import ImageColors from 'react-native-image-colors';
import { useStory } from '@/hooks/queries/useStories';
import { useTags } from '@/hooks/queries/useTags';
import { useStoryImage } from '@/hooks/queries/useStoryImage';

import RatingModal from './RatingModal';
import BookmarkModal    from './BookmarkModal';
import { useCreateBookmark } from '../../hooks/queries/useBookmarks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MINI_PLAYER_HEIGHT = 70;
const HERO_HEIGHT_RATIO = 0.46; // hero image takes ~46% of screen height
const HERO_HEIGHT = SCREEN_HEIGHT * HERO_HEIGHT_RATIO;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const AnimatedImageBackground = createAnimatedComponent(ImageBackground);

export default function TrackPlayerWidget({ expanded }: any) {

  const [gradientColors, setGradientColors] = useState<[string, string, ...string[]]>([
    'transparent',
    '#000000',
    '#000000',
  ]);

  const { expand, collapse } = usePlayerUI();

  const {
    state,
    pause,
    resume,
    setPlaybackRate,
    clearPendingRating,
    clearTrack,
    sleepMinutesLeft,
    setSleepTimer,
    hasNextTrack,
    nextTrackInfo,
    playNext,
  } = usePlayer();

  // useProgress with interval 0 returns shared values that update on the
  // worklet thread — no JS re-renders, no duplicate key spam from the slider.
  const progress = useProgress(0);

  const track = state.currentTrack;
  const [showOptions, setShowOptions] = useState(false);

  const [showBookmarkModal,  setShowBookmarkModal]  = useState(false);
  const [bookmarkPosition,   setBookmarkPosition]   = useState(0);
  const { mutateAsync: createBookmark } = useCreateBookmark();

  const handleBookmarkPress = () => {
    const pos = audioEngine.getCurrentPosition();
    setBookmarkPosition(Math.max(0, pos - 8));
    setShowBookmarkModal(true);
  };

  const handleShare = async () => {
    if (!track) return;
    await Share.share({
        message: `Check out "${track.title}" on Runts: https://tinkermedia.net/runts/story/${track.id}`,
        url: `https://tinkermedia.net/runts/story/${track.id}`,
        title: track.title ?? 'Runts',
    });
  };

  const insets = useSafeAreaInsets();
  const { tabBarHeight } = usePlayerUI();

  const containerHeight = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startY = useSharedValue(0);
  const scrollY = useSharedValue(0);

  // Y-position (within scroll content) after which the floating play button
  // fades in — set to the bottom of the Up Next tile, or the bottom of the
  // primary controls section if there's no next track.
  const floatingThresholdY = useSharedValue(999999);

  const scrollRef = useRef<ScrollView>(null);

  const { data: currentStory } = useStory(track?.id ?? null);
  const { data: allTags } = useTags();

  const { data: narratorNames = [] } = useStoryNarratorNames(currentStory?.id);
  const narratorDisplay = formatNarratorDisplay(narratorNames);

  const { data: resolvedNextImageUri } = useStoryImage(
    nextTrackInfo?.imageUri?.startsWith('stories/') ? nextTrackInfo.imageUri : null
  );
  const nextImageDisplayUri = resolvedNextImageUri ?? nextTrackInfo?.imageUri ?? '';

  const storyTags = React.useMemo(() => {
    if (!currentStory || !allTags) return [];
    const tagIds = new Set([
      currentStory.primaryTagId,
      currentStory.secondaryTagId,
    ].filter(Boolean));
    return allTags.filter(t => tagIds.has(t.id));
  }, [currentStory, allTags]);

  // ── Expand / Collapse ─────────────────────────────────────────────────────
  const expandPlayer = () => {
    translateY.value = withSpring(0, { damping: 28, stiffness: 200, overshootClamping: true });
  };

  const collapsePlayer = () => {
    translateY.value = withSpring(
      containerHeight.value - MINI_PLAYER_HEIGHT,
      { damping: 28, stiffness: 200, overshootClamping: true }
    );
    collapse();
  };

  const controlsRegistered = useRef(false);
  useEffect(() => {
    registerPlayerControls(collapsePlayer, expandPlayer);
    controlsRegistered.current = true;
  }, []);

  // ── Gesture ───────────────────────────────────────────────────────────────
  const didMovePlayer = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .activeOffsetY([5, 9999])
    .onStart((e) => {
      'worklet';
      startY.value = translateY.value - e.translationY;
      didMovePlayer.value = false;
    })
    .onUpdate((e) => {
      'worklet';
      const next = startY.value + e.translationY;
      translateY.value = Math.min(
        containerHeight.value - MINI_PLAYER_HEIGHT,
        Math.max(0, next)
      );
      didMovePlayer.value = true;
    })
    .onEnd((e) => {
      'worklet';
      if (!didMovePlayer.value) return;
      const shouldExpand =
        e.velocityY < -500 || translateY.value < containerHeight.value * 0.4;
      translateY.value = withSpring(
        shouldExpand ? 0 : containerHeight.value - MINI_PLAYER_HEIGHT,
        { damping: 28, stiffness: 200, overshootClamping: true }
      );
    });

  // ── Animation styles ──────────────────────────────────────────────────────
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const miniStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, containerHeight.value - MINI_PLAYER_HEIGHT],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  const expandedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, containerHeight.value - MINI_PLAYER_HEIGHT],
      [1, 0],
      Extrapolate.CLAMP
    ),
  }));

  // ── Controls — optimistic toggle for instant visual feedback ──────────────
  // The context's pause()/resume() await the underlying audio engine before
  // updating state, which introduces a real perceptible delay. We track our
  // own local "what the user just tapped" state so the icon flips instantly,
  // while the actual engine call happens in the background — same pattern
  // PinButton uses for its optimistic update.
  const [optimisticPlaying, setOptimisticPlaying] = useState(state.isPlaying);

  useEffect(() => {
    setOptimisticPlaying(state.isPlaying);
  }, [state.isPlaying]);

  const toggle = () => {
    const next = !optimisticPlaying;
    setOptimisticPlaying(next);
    if (next) {
      resume();
    } else {
      pause();
    }
  };

  // Pause icon stays visible for at least 5s so the user has time to notice
  // there are controls here, whether the player just opened or playback
  // just started.
  const heroControlsOpacity = useSharedValue(1);

  useEffect(() => {
    if (!track) return;
    if (optimisticPlaying) {
      heroControlsOpacity.value = 1;
      const timer = setTimeout(() => {
        heroControlsOpacity.value = withTiming(0, { duration: 400 });
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      heroControlsOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [optimisticPlaying, track]);

  const heroControlsStyle = useAnimatedStyle(() => ({
    opacity: heroControlsOpacity.value,
  }));

  // ── Scroll parallax ───────────────────────────────────────────────────────
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = Math.max(0, event.contentOffset.y);
    },
  });

  const heroImageStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-100, 0, 300],
          [-40, 0, 80],
          Extrapolate.CLAMP
        ),
      },
      {
        scale: interpolate(
          scrollY.value,
          [-100, 0],
          [1.2, 1],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  // Floating play button — fades in once the user has scrolled past the
  // Up Next tile (or past the primary controls, if there's no next track).
    const floatingButtonStyle = useAnimatedStyle(() => {
      const expandedAmount = interpolate(
        translateY.value,
        [0, containerHeight.value - MINI_PLAYER_HEIGHT],
        [1, 0],
        Extrapolate.CLAMP
      );
      const scrolledPast = interpolate(
        scrollY.value,
        [floatingThresholdY.value - 40, floatingThresholdY.value],
        [0, 1],
        Extrapolate.CLAMP
      );
      const combined = expandedAmount * scrolledPast;
      return {
        opacity: combined,
        transform: [{ scale: interpolate(combined, [0, 1], [0.8, 1]) }],
      };
    });

  // ── Artwork colors ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!track?.artwork) return;
    let isMounted = true;
    ImageColors.getColors(track.artwork, {
      fallback: '#000',
      cache: true,
      key: track.id,
    })
      .then(() => {
        if (!isMounted) return;
        setGradientColors(['transparent', 'transparent', '#000']);
      })
      .catch(() => setGradientColors(['transparent', '#000', '#000']));
    return () => { isMounted = false; };
  }, [track]);

  const hasTrack = !!track;
  const miniPlayerBottom = tabBarHeight > 0 ? tabBarHeight - 10 : insets.bottom;

  // Minimum height for the info/controls section so hero + this section
  // always fill at least the full screen, regardless of device size —
  // any additional content (like a long transcript) simply extends below.
  const infoSectionMinHeight = Math.max(0, SCREEN_HEIGHT - HERO_HEIGHT - insets.bottom);

  return (
    <View style={styles.root}>

      <Animated.View
        style={styles.container}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (containerHeight.value === 0) {
            containerHeight.value = h;
            translateY.value = h - MINI_PLAYER_HEIGHT;
            registerPlayerControls(collapsePlayer, expandPlayer);
          }
        }}
      >

        {/* EXPANDED PLAYER */}
        {hasTrack && (
          <Animated.View
            style={[styles.expanded, expandedStyle, containerStyle]}
            pointerEvents="auto"
          >

            <AnimatedScrollView
              ref={scrollRef}
              onScroll={onScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              scrollEnabled={true}
              bounces={true}
            >

              {/* Hero image */}

              <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
                  <AnimatedImageBackground
                      source={{ uri: track.artwork }}
                      style={[styles.heroImage, heroImageStyle]}
                      resizeMode="cover"
                      fadeDuration={0}
                  >
                      <View style={styles.overlay} />

                      {/* Pan-to-collapse zone + sleep timer pill — scrolls
                          away with the hero image, distinct from the sticky
                          chevron/options buttons below */}
                      <View style={[styles.heroHeader, { paddingTop: insets.top + 12 }]}>
                          <GestureDetector gesture={panGesture}>
                              <View style={styles.heroPanZone} />
                          </GestureDetector>

                          {sleepMinutesLeft !== null && (
                              <View style={styles.sleepPill}>
                                  <Text style={styles.sleepPillText}>💤 {sleepMinutesLeft}m</Text>
                              </View>
                          )}
                      </View>

                      <LinearGradient
                          colors={gradientColors}
                          locations={[0, 0.6, 1]}
                          style={styles.gradient}
                      />

                  </AnimatedImageBackground>

                  {/* Entire image is tappable to play/pause — kept OUTSIDE the
                      Reanimated-transformed AnimatedImageBackground, since Android has
                      known touch hit-testing issues for absolutely-positioned children
                      nested inside a transformed parent (same issue we hit with the
                      floating play button). */}
                  <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={toggle}
                      style={styles.heroTouch}
                  >
                      <Animated.View style={[heroControlsStyle]}>
                          <FontAwesome5
                              name={optimisticPlaying ? 'pause' : 'play'}
                              size={72}
                              color="#fff"
                              opacity={0.5}
                          />
                      </Animated.View>
                  </TouchableOpacity>
              </View>

              {/* INFO */}
              <LinearGradient
                colors={['rgba(0,0,0,0)', '#000', '#000']}
                locations={[0, 0.4, 1]}
                style={styles.contentGradient}
              >
                <View style={[styles.content, { minHeight: infoSectionMinHeight }]}>
                  <View>
                    <View style={styles.titlecontainer}>
                        <Text style={styles.bigTitle}>{track.title}</Text>
                      <TouchableWithoutFeedback onPress={() => {
                        if (currentStory?.authorId) {
                          navigate('AuthorDetails', { id: currentStory.authorId });
                          collapsePlayer();
                        }
                      }}>
                        <Text style={styles.artist}>by {track.artist}</Text>
                      </TouchableWithoutFeedback>
                      {narratorDisplay ? (
                        <Text style={styles.narrator}>Narrated by {narratorDisplay}</Text>
                      ) : null}
                      </View>

                    <View style={styles.actioncontainer}>
                     <TouchableWithoutFeedback onPress={() => {
                      if (currentStory?.primaryTagId) {
                        navigate('TagHomeScreen', {
                          id: currentStory.primaryTagId,
                          name: storyTags[0]?.name ?? '',
                        });
                        collapsePlayer();
                      }
                    }}>
                      {storyTags[0]?.name ? (
                        <View style={[styles.genrePill, storyTags[0]?.isErotic && styles.genrePillErotic]}>
                          <Text style={[styles.genrePillText, storyTags[0]?.isErotic && styles.genrePillTextErotic]}>
                            {storyTags[0].name}
                          </Text>
                        </View>
                      ) : <View />}
                    </TouchableWithoutFeedback>

                      <View style={styles.actions}>
                        <View style={styles.actionbutton}>
                          <PinButton storyId={track.id} size={20} />
                        </View>
                        <View style={styles.actionbutton}>
                          <TouchableWithoutFeedback onPress={handleShare}>
                              <FontAwesome5 name="share" size={20} color="#fff" />
                          </TouchableWithoutFeedback>
                      </View>
                        <View style={styles.actionbutton}>
                          <TouchableOpacity onPress={handleBookmarkPress} activeOpacity={0.7}>
                            <FontAwesome5 name={'bookmark' as any} size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>

                   <PlayerControls
                        isPlaying={optimisticPlaying}
                        pause={pause}
                        resume={resume}
                        hasNext={false}
                        onNext={undefined}
                      />

                  {/* PROGRESS + PRIMARY PLAY BUTTON + UP NEXT */}
                  <View>
                    <ProgressBar progress={progress} isErotic={currentStory?.isErotic === 'true'}/>

                    <View
                      style={styles.controlbox}
                      onLayout={(e) => {
                        // Only used as the floating-button threshold when
                        // there's no Up Next tile below it.
                        if (!nextTrackInfo) {
                          floatingThresholdY.value = HERO_HEIGHT + e.nativeEvent.layout.y + e.nativeEvent.layout.height;
                        }
                      }}
                    >
                      {/* <PlayerControls
                        isPlaying={optimisticPlaying}
                        pause={pause}
                        resume={resume}
                        hasNext={false}
                        onNext={undefined}
                      /> */}
                    </View>

                    {nextTrackInfo ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={playNext}
                        style={styles.upNextCard}
                        onLayout={(e) => {
                          floatingThresholdY.value = HERO_HEIGHT + e.nativeEvent.layout.y + e.nativeEvent.layout.height;
                        }}
                      >
                        <Text style={styles.upNextLabel}>Up Next</Text>
                        <View style={styles.upNextRow}>
                          <Image source={{ uri: nextImageDisplayUri }} style={styles.upNextThumb} />
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={styles.upNextTitle}>
                              {nextTrackInfo.title}
                            </Text>
                            <Text numberOfLines={1} style={styles.upNextMeta}>
                              {nextTrackInfo.authorName ?? ''}{nextTrackInfo.duration ? ` · ${fmtDuration(nextTrackInfo.duration)}` : ''}
                            </Text>
                          </View>
                          <Feather name="skip-forward" size={20} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                </View>
              </LinearGradient>

              <View style={{ height: 40 }} />

            {currentStory?.transcript ? (
              <View style={styles.transcriptbox}>
                <Text style={styles.transcriptheader}>Transcript</Text>
                <Text style={styles.transcript}>{currentStory.transcript}</Text>
              </View>
            ) : null}

              <View style={{ height: 100 }} />

            </AnimatedScrollView>

            {/* Sticky chevron — collapses player, always visible regardless
                of scroll position. Matches OptionsModal's button exactly
                (same size/background) for visual consistency, since both
                are now genuinely persistent overlays. */}
            <TouchableOpacity
              onPress={collapsePlayer}
              style={[styles.stickyButton, { top: insets.top + 12, left: 20 }]}
              activeOpacity={0.7}
            >
              <Feather name="chevron-down" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Options modal — rendered outside scroll so it overlays
                everything; its own trigger button is already persistent */}
            <OptionsModal
              visible={showOptions}
              onOpen={() => setShowOptions(true)}
              onClose={() => setShowOptions(false)}
              insetsTop={insets.top}
              playbackRate={state.playbackRate}
              onRateChange={(rate: number) => {
                setPlaybackRate(rate);
                setShowOptions(false);
              }}
              onDismiss={() => {
                setShowOptions(false);
                clearTrack();
              }}
              sleepMinutesLeft={sleepMinutesLeft}
              onSleepTimer={(minutes) => setSleepTimer(minutes)}
            />



            <BookmarkModal
              visible={showBookmarkModal}
              positionSeconds={bookmarkPosition}
              onClose={() => setShowBookmarkModal(false)}
              onConfirm={async (name) => {
                if (!track) return;
                await createBookmark({
                  storyId:         track.id,
                  positionSeconds: bookmarkPosition,
                  name,
                });
              }}
            />

          </Animated.View>
        )}

      </Animated.View>
      {/* Floating play/pause — rendered outside the transformed container
          entirely, since Android has known touch hit-testing issues for
          absolutely-positioned children nested inside a Reanimated-driven
          transform. Fades in once Up Next (or the primary controls, if no
          next track) scrolls out of view, and only while expanded. */}
      {hasTrack && (
        <Animated.View
          style={[styles.floatingButtonWrapper, floatingButtonStyle, { bottom: insets.bottom + 24 }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={styles.floatingPlayButton}>
            <FontAwesome5
                name={optimisticPlaying ? 'pause' : 'play'}
                size={16}
                color="#171717"
                style={!optimisticPlaying ? { marginLeft: 2 } : undefined}
                iconStyle="solid"
            />
        </TouchableOpacity>
        </Animated.View>
      )}

      {/* MINI PLAYER */}
      {hasTrack && (
        <Animated.View
            style={[
                styles.mini,
                miniStyle,
                { bottom: miniPlayerBottom },
            ]}
        >
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.miniTint} pointerEvents="none" />            
              <TouchableWithoutFeedback onPress={expandPlayer}>
                    <View style={styles.miniInner}>
              <Image source={{ uri: track.artwork }} style={styles.miniImage} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.title}>
                  {track.title}
                </Text>
                <Text numberOfLines={1} style={styles.artist}>
                  {track.artist}
                </Text>
              </View>
              <TouchableOpacity onPress={toggle}>
                <Feather
                  name={optimisticPlaying ? 'pause' : 'play'}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      {/* Rating modal — rendered independently of player/track state so it
          keeps working correctly even after the player fully closes on
          one-off story completion */}
      <RatingModal
        visible={!!state.pendingRatingStoryId}
        storyId={state.pendingRatingStoryId ?? ''}
        storyTitle={state.pendingRatingTitle ?? ''}
        artwork={state.pendingRatingArtwork ?? undefined}
        onClose={clearPendingRating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  title: {
    color: '#fff',
    fontSize: 16,
  },
mini: {
    position: 'absolute',
    height: 64,
    left: 16,
    right: 16,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'cyan',
    justifyContent: 'center',
    overflow: 'hidden',
    pointerEvents: 'auto',
},
  miniInner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 10,
      paddingRight:20,
      gap: 10,
  },
  miniImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
  },
  miniTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
},
  expanded: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  artwork: {
    width: '100%',
    height: 320,
    borderRadius: 20,
    marginTop: 20,
  },
  bigTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  artist: {
    color: '#aaa',
    marginTop: 4,
  },
  narrator: {
    color: '#888',
    marginTop: 2,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  heroContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  heroPanZone: {
    flex: 1,
    height: 60,
  },
  contentGradient: {
    marginTop: -80,
    paddingTop: 80,
  },
  content: {
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  headerbutton: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Sticky chevron — matches OptionsModal's own button exactly, so both
  // persistent header controls look and feel consistent.
  stickyButton: {
    position: 'absolute',
    width: OPTIONS_BUTTON_SIZE,
    height: OPTIONS_BUTTON_SIZE,
    borderRadius: OPTIONS_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  gradient: {
    height: 180,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  heroTouch: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titlecontainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  actionbutton: {},
  actioncontainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  // Genre pill — replaces the old plain cyan text tag
  genrePill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  genrePillErotic: {
    backgroundColor: 'rgba(255,124,42,0.12)',
  },
  genrePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'capitalize',
  },
  genrePillTextErotic: {
    color: '#ff7c2a',
  },
  controlbox: {
    marginTop: 8,
  },
  // Up Next — replaces the old "second player controls" skip-next button
  upNextCard: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  upNextLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upNextThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  upNextTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  upNextMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  // Floating play/pause — appears once Up Next / controls scroll away
  floatingButtonWrapper: {
    position: 'absolute',
    right: 20,
    zIndex: 15,
  },
  floatingPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
},
  transcriptbox: {
    marginVertical: 20,
    padding: 20,
    marginHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  transcriptheader: {
    paddingBottom: 16,
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a2a2a',
    marginBottom: 16,
  },
  transcript: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 24,
    lineHeight: 40,
  },
  sleepPill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sleepPillText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});