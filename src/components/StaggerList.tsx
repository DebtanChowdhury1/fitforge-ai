import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useReduceMotion } from '../hooks/useReduceMotion';

interface StaggerItemProps {
  children: React.ReactNode;
  index: number;
  delay?: number;
  from?: 'bottom' | 'right' | 'fade';
}

export function StaggerItem({ children, index, delay = 60, from = 'bottom' }: StaggerItemProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translate = useRef(new Animated.Value(reduceMotion ? 0 : from === 'bottom' ? 24 : from === 'right' ? 20 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const totalDelay = index * delay;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: totalDelay, useNativeDriver: false }),
      Animated.spring(translate, { toValue: 0, tension: 100, friction: 10, delay: totalDelay, useNativeDriver: false } as any),
    ] as any).start();
  }, [index, reduceMotion]);

  const transform = from === 'bottom'
    ? [{ translateY: translate }]
    : from === 'right'
    ? [{ translateX: translate }]
    : [];

  return (
    <Animated.View style={{ opacity, transform }}>
      {children}
    </Animated.View>
  );
}
