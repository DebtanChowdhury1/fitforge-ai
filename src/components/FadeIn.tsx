import React, { useRef, useEffect } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  fromY?: number;
  fromX?: number;
  fromScale?: number;
  style?: ViewStyle | ViewStyle[];
}

export function FadeIn({
  children,
  delay = 0,
  duration = 500,
  fromY = 28,
  fromX = 0,
  fromScale = 1,
  style,
}: Props) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(fromY)).current;
  const translateX = useRef(new Animated.Value(fromX)).current;
  const scale     = useRef(new Animated.Value(fromScale)).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 10, delay, useNativeDriver: true } as any),
    ];
    if (fromX !== 0) animations.push(
      Animated.spring(translateX, { toValue: 0, tension: 80, friction: 10, delay, useNativeDriver: true } as any)
    );
    if (fromScale !== 1) animations.push(
      Animated.spring(scale, { toValue: 1, tension: 100, friction: 8, delay, useNativeDriver: true } as any)
    );
    Animated.parallel(animations as any).start();
  }, []);

  const transform: any[] = [{ translateY }, { translateX }];
  if (fromScale !== 1) transform.push({ scale });

  return (
    <Animated.View style={[{ opacity, transform }, style]}>
      {children}
    </Animated.View>
  );
}
