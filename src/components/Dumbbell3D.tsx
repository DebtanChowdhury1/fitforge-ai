import React, { useEffect, useRef } from 'react';
import { Animated, View, PanResponder } from 'react-native';
import Svg, { Rect, Ellipse, Defs, LinearGradient as SvgGradient, Stop, G } from 'react-native-svg';
import { useReduceMotion } from '../hooks/useReduceMotion';

interface Props { size?: number; autoSpin?: boolean; }

export function Dumbbell3D({ size = 200, autoSpin = true }: Props) {
  const rotateY  = useRef(new Animated.Value(0)).current;
  const scaleX   = useRef(new Animated.Value(1)).current;
  const shadowOp = useRef(new Animated.Value(0.3)).current;
  const reduceMotion = useReduceMotion();
  const spinRef  = useRef<Animated.CompositeAnimation | null>(null);
  const angleRef = useRef(0);

  useEffect(() => {
    if (reduceMotion || !autoSpin) return;
    spinRef.current = Animated.loop(
      Animated.timing(rotateY, {
        toValue: 1, duration: 5000, useNativeDriver: false,
      })
    );
    spinRef.current.start();
    rotateY.addListener(({ value }) => { angleRef.current = value * 360; });
    return () => { rotateY.removeAllListeners(); spinRef.current?.stop(); };
  }, [reduceMotion]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        spinRef.current?.stop();
        rotateY.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        const delta = gs.dx / 120; // map drag to 0-1 range
        rotateY.setValue((angleRef.current / 360 + delta) % 1);
      },
      onPanResponderRelease: () => {
        if (autoSpin) {
          spinRef.current = Animated.loop(
            Animated.timing(rotateY, { toValue: 1, duration: 5000, useNativeDriver: false })
          );
          spinRef.current.start();
        }
      },
    })
  ).current;

  // Derive perspective-correct scaleX from rotation angle
  // cos(angle * 2π) maps rotation to horizontal squeeze
  const derivedScaleX = rotateY.interpolate({
    inputRange:  [0, 0.25, 0.5,  0.75, 1],
    outputRange: [1,  0.3, -1,  -0.3,  1],
  });

  const derivedShadow = rotateY.interpolate({
    inputRange:  [0,   0.25, 0.5,  0.75, 1],
    outputRange: [0.3, 0.1,  0.3,  0.1,  0.3],
  });

  const absScaleX = rotateY.interpolate({
    inputRange:  [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.3,  1,   0.3,  1],
  });

  const w = size;
  const h = size * 0.45;

  return (
    <View {...panResponder.panHandlers} style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
      {/* Ground shadow */}
      <Animated.View style={{
        position: 'absolute', bottom: -4,
        width: w * 0.6, height: 10, borderRadius: 10,
        backgroundColor: '#FF6B35',
        opacity: derivedShadow,
        transform: [{ scaleX: absScaleX }],
        alignSelf: 'center',
        shadowColor: '#FF6B35', shadowRadius: 12, shadowOpacity: 0.6,
      }} />

      {/* 3D dumbbell via perspective scaleX */}
      <Animated.View style={{ transform: [{ scaleX: absScaleX }] }}>
        <Svg width={w} height={h} viewBox="0 0 200 80">
          <Defs>
            <SvgGradient id="plate" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FF6B35" />
              <Stop offset="50%" stopColor="#c94d20" />
              <Stop offset="100%" stopColor="#7a2e0f" />
            </SvgGradient>
            <SvgGradient id="bar" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#3a3a4a" />
              <Stop offset="50%" stopColor="#1a1a2a" />
              <Stop offset="100%" stopColor="#0a0a1a" />
            </SvgGradient>
          </Defs>

          {/* Left plate stack */}
          <Ellipse cx="34" cy="40" rx="12" ry="32" fill="url(#plate)" />
          <Ellipse cx="22" cy="40" rx="10" ry="28" fill="url(#plate)" />

          {/* Bar */}
          <Rect x="32" y="34" width="136" height="12" rx="6" fill="url(#bar)" />

          {/* Right plate stack */}
          <Ellipse cx="166" cy="40" rx="12" ry="32" fill="url(#plate)" />
          <Ellipse cx="178" cy="40" rx="10" ry="28" fill="url(#plate)" />

          {/* Knurling highlight */}
          {[70, 90, 110, 130].map((x) => (
            <Rect key={x} x={x} y="34" width="3" height="12" fill="rgba(255,255,255,0.12)" rx="1" />
          ))}

          {/* Collar collars */}
          <Rect x="44" y="32" width="10" height="16" rx="3" fill="#2a2a3a" />
          <Rect x="146" y="32" width="10" height="16" rx="3" fill="#2a2a3a" />
        </Svg>
      </Animated.View>
    </View>
  );
}
