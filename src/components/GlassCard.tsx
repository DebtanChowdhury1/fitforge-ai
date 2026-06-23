import React, { useRef, useEffect } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  glow?: string;
  delay?: number;      // entrance stagger delay (ms)
  fromY?: number;      // entrance slide offset
  noEntrance?: boolean;
}

export function GlassCard({ children, style, intensity = 20, glow, delay = 0, fromY = 24, noEntrance = false }: Props) {
  const opacity    = useRef(new Animated.Value(noEntrance ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(noEntrance ? 0 : fromY)).current;

  useEffect(() => {
    if (noEntrance) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 75, friction: 10, delay, useNativeDriver: true } as any),
    ] as any).start();
  }, [delay]);

  const shadowStyle = glow
    ? { shadowColor: glow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 10 }
    : {};

  return (
    <Animated.View
      style={[
        {
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          opacity,
          transform: [{ translateY }],
          ...shadowStyle,
        },
        style,
      ]}
    >
      <BlurView intensity={intensity} tint="dark" style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', padding: 16 }}>
          {children}
        </Animated.View>
      </BlurView>
    </Animated.View>
  );
}
