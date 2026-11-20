import { useEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';

const CLOSE_DISTANCE = 100;   // drag this far down to close
const CLOSE_VELOCITY = 800;   // or flick down faster than this
const OFF_SCREEN = 900;

// Swipe-down-to-close for every bottom sheet. Put `gesture` on a GestureDetector around the grab handle and header,
// and apply `sheetStyle` to the Animated.View that is the sheet. Inside a native Modal the sheet must also sit within
// a GestureHandlerRootView (Android renders Modals in a separate window).
export function useSheetDrag(onClose: () => void, visible: boolean) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) translateY.value = 0;
  }, [visible, translateY]);

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = e.translationY > 0 ? e.translationY : 0;
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) {
        translateY.value = withTiming(OFF_SCREEN, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 26, stiffness: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  return { gesture, sheetStyle };
}
