import React from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function TiltCard({ children, style }: Props) {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const gesture = Gesture.Pan()
    .onBegin(() => { scale.value = withSpring(1.02); })
    .onUpdate((e) => {
      rotateY.value = interpolate(e.translationX, [-150, 150], [-12, 12]);
      rotateX.value = interpolate(e.translationY, [-150, 150], [8, -8]);
    })
    .onEnd(() => {
      rotateX.value = withSpring(0);
      rotateY.value = withSpring(0);
      scale.value = withSpring(1);
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animStyle, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}
