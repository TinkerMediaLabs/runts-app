import React, { useEffect, useState} from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { Slider, SliderThemeType } from 'react-native-awesome-slider';
import { useSharedValue, runOnJS, useDerivedValue } from 'react-native-reanimated';

import { audioEngine } from './audioEngine';

export default function ProgressBar({ progress }: any) {

  const progressValue = useSharedValue(0);
  const min = useSharedValue(0);
  const max = useSharedValue(1);

  const isSliding = useSharedValue(0);

  const [isSlidingState, setIsSlidingState] = useState(false);

  const COLORS = {
    backgroundColor: '#0A0A0A',
    inputBackgroundColor: '#1f1f1f',

    borderColor: '#474747',
    markColor: '#EAECEF',

    bubbleBackgroundColor: '#E0E2E5',
    bubbleTextColor: '#262C36',

    textColor: '#EAECEF',
    descriptionColor: '#E0E2E5',
    cardStyle: {
      borderRadius: 8,
      padding: 12,
      marginTop: 20,
      borderWidth: 1,
      borderColor: '#292929',
      gap: 8,
      backgroundColor: '#0a0a0a',
    } satisfies ViewStyle,

    optionStyle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 38,
    } satisfies ViewStyle,
    optionTextStyle: {
      fontSize: 14,
      fontWeight: '500',
      color: '#EAECEF',
    } satisfies TextStyle,
    sliderTheme: {
      maximumTrackTintColor: '#2a2a2a',
      minimumTrackTintColor: '#00ffff',
      bubbleBackgroundColor: '#000',
      bubbleTextColor: '#fff',
      cacheTrackTintColor: 'rgba(255,255,255,0.2)',
    } satisfies SliderThemeType,
  };


  useEffect(() => {
    progressValue.value = progress.position;
    max.value = progress.duration || 1;
  }, [progress]);

 const format = (s: number) => {
  'worklet'; // 🔥 THIS is the fix

  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};
  
  const [bubbleTime, setBubbleTime] = useState('0:00');

  useDerivedValue(() => {
  const time = format(progressValue.value);
  runOnJS(setBubbleTime)(time);
});
  

  const thumbWidth = 10;
  const bubbleWidth = 90;

  return (
    <View style={styles.container}>

      <Slider
        progress={progressValue}
        minimumValue={min}
        maximumValue={max}

        

        onSlidingStart={() => {
          isSliding.value = 1;
          setIsSlidingState(true); // ✅ direct
        }}

        onValueChange={(value) => {
          progressValue.value = value; // 🔥 live update
        }}

        onSlidingComplete={(value) => {
          isSliding.value = 0;
          setIsSlidingState(false); // ✅ direct
          audioEngine.seek?.(value);
        }}

        thumbWidth={thumbWidth}
        renderThumb={() => <View style={styles.customThumb} />}
        renderBubble={() => {
          return isSlidingState ? (
            <View style={styles.customBubble}>
              <Text>{bubbleTime}</Text>
            </View>
          ) : null;
        }}
        theme={COLORS.sliderTheme}
      />

      <View style={styles.row}>
        <Text style={styles.time}>{format(progress.position)}</Text>
        <Text style={styles.time}>{format(progress.duration)}</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 40,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  time: {
    color: '#aaa',
    fontSize: 24,
    fontWeight: 'bold'
  },
  slider: {
    marginBottom: 20,
    marginTop: 12,
  },
  customThumb: {
    width: 14,
    height: 14,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'cyan',
  },
  customBubble: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleImg: {
    width: 90,
    borderRadius: 4,
    height: 60,
  },
  bubbleText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},
});