import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';

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
} from 'react-native-reanimated';

import { useProgress } from '@rntp/player';

import { usePlayerUI } from '@/context/PlayerUIContext';
import { navigate } from '@/navigation/RootNavigator';
import { registerPlayerControls } from '@/features/audio/Playerref';

import { ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { getStatusBarHeight } from 'react-native-status-bar-height';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Feather from '@expo/vector-icons/Feather';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

import { usePlayer } from '@/context/PlayerContext';
import { audioEngine } from '@/features/audio/audioEngine';

import ProgressBar from './ProgressBar';
import PlayerControls from './PlayerControls';
import OptionsModal from './OptionsModal';
import BasicTagsList from '@/components/story/BasicTagsList'

import ImageColors from 'react-native-image-colors';

import dummytags from '../../../dummydata/dummytags'

const MINI_PLAYER_HEIGHT = 70;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const AnimatedImageBackground = createAnimatedComponent(ImageBackground);

export default function TrackPlayerWidget({ expanded }: any) {

  const [gradientColors, setGradientColors] = useState<[string, string, ...string[]]>([
    'transparent',
    '#000000',
    '#000000',
  ]);

  const { expand, collapse } = usePlayerUI();
  const { state, pause, resume, setPlaybackRate } = usePlayer();
  const progress = useProgress(1);

  const track = state.currentTrack;
  const [showOptions, setShowOptions] = useState(false);

  const insets = useSafeAreaInsets();
  const { tabBarHeight } = usePlayerUI();

  const containerHeight = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startY = useSharedValue(0);
  const scrollY = useSharedValue(0);

  // scrollRef is used by simultaneousWithExternalGesture so RNGH knows
  // which native scroll gesture to share touches with.
  const scrollRef = useRef<ScrollView>(null);

  // -------------------------
  // EXPAND / COLLAPSE (called from JS touch handlers — no isAnimating guard
  // needed because TouchableOpacity debounces naturally)
  // -------------------------
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

  // Register with module-level ref so any component can collapse/expand
  // the player without needing context or navigation prop.
  // NOTE: Registration is triggered from onLayout (not a useEffect dependency
  // on containerHeight.value) to avoid reading a shared value during render.
  const controlsRegistered = useRef(false);
  useEffect(() => {
    registerPlayerControls(collapsePlayer, expandPlayer);
    controlsRegistered.current = true;
  }, []);

  // -------------------------
  // GESTURE
  //
  // The pan gesture lives only on the heroHeader area — a strip at the top
  // of the image. Because it has zero overlap with the ScrollView, there is
  // no gesture conflict at all. Scroll works freely everywhere else.
  //
  // activeOffsetY([5, 9999]): only activates on a clear downward swipe so
  // tapping the chevron / options buttons still fires normally.
  // -------------------------
  const didMovePlayer = useSharedValue(false);

  const panGesture = Gesture.Pan()
    // No simultaneousWithExternalGesture needed — this gesture only lives on
    // the heroHeader which doesn't overlap the ScrollView at all.
    .activeOffsetY([5, 9999])
    .onStart((e) => {
      'worklet';
      // Compensate for translation already accumulated at activation time
      // so the first onUpdate frame has no positional jump.
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

  // -------------------------
  // ANIMATION STYLES
  // -------------------------
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

  // -------------------------
  // CONTROLS
  // -------------------------
  const [onToggle, setOnToggle] = useState(false)

  const toggle = async () => {
    if (state.isPlaying) {
      setOnToggle(!onToggle)
      await audioEngine.pause();
      pause();
    } else {
      setOnToggle(!onToggle)
      await audioEngine.resume();
      resume();
    }
  };

 

  const heroControlsOpacity = useSharedValue(1);

  useEffect(() => {
    if (!track) return;

    if (state.isPlaying) {
      heroControlsOpacity.value = 1;
      setTimeout(() => {
        heroControlsOpacity.value = withTiming(0, { duration: 400 });
      }, 1200);
    } else {
      heroControlsOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [state.isPlaying, track]);

  const heroControlsStyle = useAnimatedStyle(() => ({
    opacity: heroControlsOpacity.value,
  }));

  // -------------------------
  // SCROLL PARALLAX
  // -------------------------
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

  // -------------------------
  // ARTWORK COLORS
  // -------------------------
  useEffect(() => {
    if (!track?.artwork) return;
    let isMounted = true;

    ImageColors.getColors(track.artwork, {
      fallback: '#000',
      cache: true,
      key: track.id,
    })
      .then((colors) => {
        if (!isMounted) return;
        let primary = '#000';
        switch (colors.platform) {
          case 'android': primary = colors.dominant || '#000'; break;
          case 'ios': primary = colors.background || colors.primary || '#000'; break;
          case 'web': primary = colors.dominant || '#000'; break;
        }
        setGradientColors(['transparent', 'transparent', '#000']);
      })
      .catch(() => setGradientColors(['transparent', '#000', '#000']));

    return () => { isMounted = false; };
  }, [track]);

  const hasTrack = !!track;

  // Mini player sits flush on top of the tab bar.
  // tabBarHeight from context is already the full tab bar height (it does NOT
  // include insets.bottom — the tab bar itself sits above the system nav area).
  // If there is no tab bar, fall back to insets.bottom so we clear the
  // Android gesture navigation bar.
  const miniPlayerBottom = tabBarHeight > 0 ? tabBarHeight - 10 : insets.bottom

  return (
    <View style={styles.root}>

      <Animated.View
        style={styles.container}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (containerHeight.value === 0) {
            containerHeight.value = h;
            translateY.value = h - MINI_PLAYER_HEIGHT;
            // Re-register now that containerHeight is set so collapsePlayer
            // uses the real height. Safe here — layout callback is not render.
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

                {/* Hero image stretches to the very top of the screen */}
                <View style={styles.heroContainer}>

                  <AnimatedImageBackground
                    source={{ uri: track.artwork }}
                    style={[styles.heroImage, heroImageStyle]}
                    resizeMode="cover"
                    fadeDuration={0}
                  >
                    {/* DARK OVERLAY */}
                    <View style={styles.overlay} />

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={toggle}
                      style={styles.heroTouch}
                    >
                      <Animated.View style={[heroControlsStyle]}>
                        <FontAwesome5
                          name={state.isPlaying ? 'pause' : 'play'}
                          size={72}
                          color="#fff"
                          opacity={0.5}
                        />
                      </Animated.View>
                    </TouchableOpacity>

                    {/* HEADER — the more-vertical button is now owned by OptionsModal
                        (it renders the button itself so it can animate the icon into X).
                        Only the chevron and pan zone remain here. */}
                    <View style={[styles.heroHeader, { paddingTop: insets.top + 12 }]}>
                      <TouchableOpacity onPress={collapsePlayer} style={styles.headerbutton}>
                        <Feather name="chevron-down" size={28} color="#fff" />
                      </TouchableOpacity>
                      <GestureDetector gesture={panGesture}>
                        <View style={styles.heroPanZone} />
                      </GestureDetector>
                    </View>

                    {/* GRADIENT FADE */}
                    <LinearGradient
                      colors={gradientColors}
                      locations={[0, 0.6, 1]}
                      style={styles.gradient}
                    />

                  </AnimatedImageBackground>

                </View>

                {/* INFO — wrapped in a gradient that fades from the image bottom
                    colour into #000 so there's no hard edge when scrolling up */}
                <LinearGradient
                  colors={['rgba(0,0,0,0)', '#000', '#000']}
                  locations={[0, 0.4, 1]}
                  style={styles.contentGradient}
                >
                <View style={styles.content}>
                  <View style={styles.info}>
                    <View style={styles.titlecontainer}>
                      <Text style={styles.bigTitle}>{track.title}</Text>

                     
                        <TouchableWithoutFeedback onPress={
                          () => {navigate('AuthorDetails', {id: "1"}); collapsePlayer();}
                        }>
                          <Text style={styles.artist}>by {track.artist}</Text>
                        </TouchableWithoutFeedback>
                 
                      
                      
                    </View>

                    {/* ACTIONS */}
                    <View style={styles.actioncontainer}>

                      <TouchableWithoutFeedback onPress={
                        () => {navigate('TagHomeScreen', {id: "1"}); collapsePlayer();}
                      }>
                        <Text style={styles.tag}>
                          Fan Fiction
                        </Text>
                      </TouchableWithoutFeedback>
                        
                    

                      <View style={styles.actions}>
                        <View style={styles.actionbutton}>
                          <TouchableWithoutFeedback>
                            <AntDesign name="pushpin" size={22} color="#fff" />
                          </TouchableWithoutFeedback>
                        </View>
                        
                        <View style={styles.actionbutton}>
                          <TouchableWithoutFeedback>
                            <FontAwesome5 name="share" size={22} color="#fff" />
                          </TouchableWithoutFeedback>
                        </View>

                      </View>

                    </View>

                  </View>

                  {/* PROGRESS */}
                  <ProgressBar progress={progress} />

                </View>
                </LinearGradient>

                <View style={styles.additionalcontent}>

                  <View style={styles.controlbox}>
                    <PlayerControls isPlaying={state.isPlaying} pause={pause} resume={resume} />
                  </View>

                  <View style={{ height: 80 }}/>
                  
                  <View style={styles.tagsbox}>
                    <BasicTagsList tags={dummytags} />
                  </View>
                  
                   

                  <View style={styles.transcriptbox}>
                    <Text style={styles.transcriptheader}>
                      Transcript
                    </Text>
                    <Text style={styles.transcript}>
                      this is some very long tst. gonna see how this looks and test the scroll stuff. 
                      this is some very long tst. gonna see how this looks and test the scroll stuff. 
                      this is some very long tst. gonna see how this looks and test the scroll stuff. 
                      this is some very long tst. gonna see how this looks and test the scroll stuff. 
                      this is some very long tst. gonna see how this looks and test the scroll stuff. 
                      this is some very long tst. gonna see how this looks and test the scroll stuff. 

                      this is some very long tst. gonna see how this looks and test the scroll stuff. 
                      this is some very long tst. gonna see how this looks and test the scroll stuff. 
                      this is some very long tst. gonna see how this looks and test the scroll stuff. 
                      this is some very long tst. gonna see how this looks and test the scroll stuff. 
                    </Text>
                  </View>
                  
                </View>

                <View style={{height: 100}}/>

              </AnimatedScrollView>

              <OptionsModal visible={showOptions} onOpen={() => setShowOptions(true)} onClose={() => setShowOptions(false)} insetsTop={insets.top} playbackRate={state.playbackRate} onRateChange={(rate: number) => { setPlaybackRate(rate); setShowOptions(false); }} />

            </Animated.View>

        )}

      </Animated.View>

      {/* MINI PLAYER (fixed position) */}
      {hasTrack && (
        <Animated.View
          style={[
            styles.mini,
            miniStyle,
            { bottom: miniPlayerBottom },
          ]}
        >
          <TouchableWithoutFeedback onPress={expandPlayer}>
            <View style={styles.miniInner} >
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
                  name={state.isPlaying ? 'pause' : 'play'}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
              </View>
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

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
    height: 70,
    left: 0,
    right: 0,
    backgroundColor: '#003f3f',
    justifyContent: 'center',
    pointerEvents: 'auto',
  },

  miniInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  miniImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },

  expanded: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: getStatusBarHeight(),
  },

  artwork: {
    width: '100%',
    height: 320,
    borderRadius: 20,
    marginTop: 20,
  },

  info: {
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

  tags: {
    marginTop: 10,
  },

  tag: {
    color: 'cyan',
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  heroContainer: {
    width: '100%',
    height: 460,
    overflow: 'hidden',
  },

  heroImage: {
    flex: 1,
    justifyContent: 'flex-end', // gradient sits at bottom; header is absolute
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  // Invisible strip between the two header buttons that catches pan gestures.
  // Sits in the flex row so it stretches to fill all space between them.
  heroPanZone: {
    flex: 1,
    height: 60,
  },
  contentGradient: {
    // Overlap the image by 80px so the gradient starts inside it,
    // completely hiding the seam. paddingTop compensates so content
    // position is unchanged.
    marginTop: -80,
    paddingTop: 80,
  },
  content: {
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    height: Dimensions.get('window').height * 0.34,
  },
  headerbutton: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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

  heroButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  titlecontainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  actionbutton: {
    paddingHorizontal: 16,
  },
  actioncontainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', 
    marginTop: 20,
  },
  additionalcontent: {
    marginTop: 40,
    padding: 20,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },

  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#888',
  },
  controlbox: {
    padding: 20,
    marginTop: 0,
  },
  transcriptbox: {
    backgroundColor: '#b3ac45a5',
    marginVertical: 20,
    padding: 20,
    marginHorizontal: 10,
    borderRadius: 20
  },
  transcriptheader: {
    marginTop: 20,
    paddingBottom: 20,
    color: '#000',
    fontSize: 24,
    fontWeight: 'bold',
    borderBottomWidth: 0.5,
    borderColor: '#000'
  },
  transcript: {
    color: '#000',
    marginTop: 20,
    fontSize: 24
  },
  tagsbox: {
    backgroundColor: '#282828a5',
    marginVertical: 0,
    padding: 20,
    marginHorizontal: 10,
    borderRadius: 20
  },
  tagsheader: {
    marginTop: 20,
    paddingBottom: 20,
    color: '#000',
    fontSize: 24,
    fontWeight: 'bold',
    borderBottomWidth: 0.5,
    borderColor: '#000'
  },
});