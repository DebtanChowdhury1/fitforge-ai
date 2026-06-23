import React, { useEffect, useRef } from 'react';
import { View, Animated, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  progress: number; // 0–1
  size?: number;
  strokeWidth?: number;
  color?: string;
  color2?: string;
  label?: string;
  value?: string;
  gradientId?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function AnimatedRing({
  progress,
  size = 100,
  strokeWidth = 10,
  color = '#ff5500',
  color2 = '#ff8c00',
  label,
  value,
  gradientId = 'grad',
}: Props) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={color2} />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={cx} cy={cy} r={r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={cx} cy={cy} r={r}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      {value && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: size / 5, fontWeight: '800' }}>{value}</Text>
          {label && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: size / 8 }}>{label}</Text>}
        </View>
      )}
    </View>
  );
}
