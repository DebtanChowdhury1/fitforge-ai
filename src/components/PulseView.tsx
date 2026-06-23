import React, { useRef, useEffect } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  duration?: number;
  style?: ViewStyle | ViewStyle[];
  pulseOpacity?: boolean;
}

/** Continuously pulses scale (and optionally opacity) — for CTAs, badges, icons. */
export function PulseView({
  children,
  minScale = 0.96,
  maxScale = 1.04,
  duration = 1200,
  style,
  pulseOpacity = false,
}: Props) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: maxScale, duration, useNativeDriver: true }),
        Animated.timing(scale, { toValue: minScale, duration, useNativeDriver: true }),
      ])
    );
    scaleLoop.start();

    let opacityLoop: Animated.CompositeAnimation | null = null;
    if (pulseOpacity) {
      opacityLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.55, duration, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }),
        ])
      );
      opacityLoop.start();
    }

    return () => {
      scaleLoop.stop();
      opacityLoop?.stop();
    };
  }, []);

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
      {children}
    </Animated.View>
  );
}
