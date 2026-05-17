import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { StyleSheet, StatusBar, Dimensions, View, Animated, Easing } from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import rgb2hex from 'rgb2hex';

// const {height, width} = Dimensions.get('window');

class ExpoLinearGradient extends Component {
  render() {
    const { color0, color1, children, points } = this.props;
    const gStart = points.start;
    const gEnd = points.end;
    return (
      <LinearGradient
        // colors={this.props.colors.map((c) => rgb2hex(c).hex)}
        colors={[color0, color1].map((c) => rgb2hex(c).hex)}
        start={gStart}
        end={gEnd}
        style={[styles.linearGradient]}>
        {children}
      </LinearGradient>
    )
  }
}
Animated.ExpoLinearGradient = Animated.createAnimatedComponent(ExpoLinearGradient)
// Animated.NativeLinearGradient = Animated.createAnimatedComponent(NativeLinearGradient)

export const presetColors = {
  loading: [
    '#363636',
    '#686868',
    '#a5a5a5'
  ],
};

class AnimatedGradient extends Component {

  static defaultProps = {
    customColors: presetColors.instagram,
    speed: 4000,
    points: {
      start: { x: 0, y: 0.4 },
      end: { x: 1, y: 0.6 }
    }
  }

  state = {
    color0: new Animated.Value(0),
    color1: new Animated.Value(0),
  }

  componentDidMount = () => {
    this.startAnimation();
  }

  startAnimation = () => {
    const { color0, color1 } = this.state;
    const { customColors, speed } = this.props;
    [color0, color1].forEach(color => color.setValue(0));

    Animated.parallel(
      [color0, color1].map(animatedColor => {
        return Animated.timing(animatedColor, {
          toValue: customColors.length,
          duration: customColors.length * speed,
          easing: Easing.linear,
          useNativeDriver: this.props.useNativeDriver || false,
        })
      })
    )
      .start(this.startAnimation);

  };

  render() {

    const { color0, color1 } = this.state;
    const { customColors, children, points, style } = this.props;
    const preferColors = [];
    // while (preferColors.length < customColors.length) {
    while (preferColors.length < 2) {
      preferColors.push(
        customColors
          .slice(preferColors.length)
          .concat(customColors.slice(0, preferColors.length + 1))
      )
    }
    const interpolatedColors = [color0, color1].map((animatedColor, index) => {
      return animatedColor.interpolate({
        inputRange: Array.from({ length: customColors.length + 1 }, (v, k) => k),
        outputRange: preferColors[index]
      })
    });

    return (
      <Animated.ExpoLinearGradient
        style={[styles.linearGradient, style]}
        points={points}
        color0={interpolatedColors[0]}
        color1={interpolatedColors[1]}>
        {children}
      </Animated.ExpoLinearGradient>
    )
  }
}


const styles = StyleSheet.create({
  linearGradient: {
    position: 'absolute',
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 15
  }
});


export default AnimatedGradient