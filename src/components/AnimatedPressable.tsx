import React, { useRef, useCallback } from 'react';
import { Animated, TouchableWithoutFeedback, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  scaleDown?: number;     // how far to scale (default 0.93)
  tension?: number;       // spring tension
  haptic?: boolean;       // trigger light haptic on press
}

export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  scaleDown = 0.93,
  tension = 280,
  haptic = true,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(scale, { toValue: scaleDown, tension, friction: 8, useNativeDriver: true } as any),
      Animated.timing(opacity, { toValue: 0.82, duration: 80, useNativeDriver: true }),
    ] as any).start();
  }, [scaleDown, tension]);

  const pressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 160, friction: 5, useNativeDriver: true } as any),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ] as any).start();
  }, []);

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
    >
      <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
