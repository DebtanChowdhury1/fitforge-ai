import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useReduceMotion } from '../hooks/useReduceMotion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps { style?: ViewStyle; }

export function Skeleton({ style }: SkeletonProps) {
  const reduceMotion = useReduceMotion();
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1, duration: 1200,
        useNativeDriver: false,
      })
    ).start();
  }, [reduceMotion]);

  const translateX = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8 }, style]}>
      {!reduceMotion && (
        <Animated.View style={{
          ...StyleSheet.absoluteFillObject,
          transform: [{ translateX }],
        }}>
          <Svg width={SCREEN_WIDTH} height={200}>
            <Defs>
              <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <Stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
                <Stop offset="60%" stopColor="rgba(255,255,255,0.08)" />
                <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={SCREEN_WIDTH} height={200} fill="url(#shimmer)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

export function HomeSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Skeleton style={{ height: 14, width: '40%', marginBottom: 8 }} />
          <Skeleton style={{ height: 28, width: '60%' }} />
        </View>
        <Skeleton style={{ width: 44, height: 44, borderRadius: 14 }} />
      </View>
      <Skeleton style={{ height: 140, borderRadius: 20 }} />
      <Skeleton style={{ height: 200, borderRadius: 24 }} />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} style={{ height: 60, borderRadius: 16 }} />
      ))}
    </View>
  );
}

// Missing import fix
import { StyleSheet } from 'react-native';
