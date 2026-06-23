import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { ForgeLogo } from './ForgeLogo';
import { useReduceMotion } from '../hooks/useReduceMotion';

const { width, height } = Dimensions.get('window');
const ACCENT = '#FF6B35';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine   = Animated.createAnimatedComponent(Line);

const WORDMARK = 'FITFORGE AI';

interface Props { onFinish: () => void; }

export function SplashSequence({ onFinish }: Props) {
  const reduceMotion = useReduceMotion();

  // Stage refs
  const pointOpacity = useRef(new Animated.Value(0)).current;
  const conduitScale  = useRef(new Animated.Value(0)).current;
  const conduitOpacity = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkY   = useRef(new Animated.Value(16)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale   = useRef(new Animated.Value(1)).current;

  const [letterAnims] = useState(() =>
    WORDMARK.split('').map(() => ({
      opacity: new Animated.Value(0),
      y: new Animated.Value(8),
    }))
  );

  useEffect(() => {
    if (reduceMotion) {
      // Instant skip for accessibility
      setTimeout(onFinish, 400);
      return;
    }

    Animated.sequence([
      // Stage 1: single point of light appears
      Animated.timing(pointOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),

      // Stage 2: conduit extends
      Animated.parallel([
        Animated.timing(conduitOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.spring(conduitScale, { toValue: 1, tension: 40, friction: 8, useNativeDriver: false } as any),
      ] as any),

      Animated.delay(300),

      // Stage 3: logo ignites
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: false } as any),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(pointOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(conduitOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ] as any),

      Animated.delay(200),

      // Stage 4: wordmark types in, staggered per letter
      Animated.parallel(
        letterAnims.map((a, i) =>
          Animated.parallel([
            Animated.timing(a.opacity, { toValue: 1, duration: 120, delay: i * 55, useNativeDriver: false }),
            Animated.spring(a.y, { toValue: 0, tension: 200, friction: 10, delay: i * 55, useNativeDriver: false } as any),
          ] as any)
        ) as any
      ),

      Animated.delay(700),

      // Stage 5: exit — scale up + fade
      Animated.parallel([
        Animated.timing(exitOpacity, { toValue: 0, duration: 400, useNativeDriver: false }),
        Animated.spring(exitScale, { toValue: 1.08, tension: 80, friction: 8, useNativeDriver: false } as any),
      ] as any),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', inset: 0, width, height,
      backgroundColor: '#0a0a0f',
      alignItems: 'center', justifyContent: 'center', zIndex: 999,
      opacity: exitOpacity,
      transform: [{ scale: exitScale }],
    }}>
      {/* Conduit SVG — the energy pipeline */}
      <Animated.View style={{
        position: 'absolute',
        opacity: conduitOpacity,
        transform: [{ scaleX: conduitScale }, { scaleY: conduitScale }],
      }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Central glowing conduit arc */}
          <Path
            d={`M ${width * 0.15} ${height * 0.5} Q ${width * 0.35} ${height * 0.25} ${width * 0.5} ${height * 0.42} Q ${width * 0.65} ${height * 0.6} ${width * 0.85} ${height * 0.5}`}
            stroke={ACCENT} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity={0.3}
          />
          <Path
            d={`M ${width * 0.2} ${height * 0.5} Q ${width * 0.4} ${height * 0.3} ${width * 0.5} ${height * 0.43} Q ${width * 0.6} ${height * 0.56} ${width * 0.8} ${height * 0.5}`}
            stroke={ACCENT} strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.6}
          />
          {/* Trailing particles along the conduit */}
          {[0.25, 0.4, 0.6, 0.75].map((t, i) => (
            <Circle
              key={i}
              cx={width * (0.2 + t * 0.6)}
              cy={height * 0.47}
              r={2}
              fill={ACCENT}
              opacity={0.5 - i * 0.1}
            />
          ))}
        </Svg>
      </Animated.View>

      {/* Central light point */}
      <Animated.View style={{
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: ACCENT,
        opacity: pointOpacity,
        shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 16,
      }} />

      {/* Logo */}
      <Animated.View style={{
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
        marginBottom: 24,
      }}>
        <ForgeLogo size={96} variant="icon" animate />
      </Animated.View>

      {/* Wordmark — staggered per letter */}
      <View style={{ flexDirection: 'row', gap: 0 }}>
        {WORDMARK.split('').map((char, i) => (
          <Animated.Text
            key={i}
            style={{
              color: char === ' ' ? 'transparent' : '#fff',
              fontSize: char === ' ' ? 10 : 26,
              fontWeight: '900',
              letterSpacing: 3,
              width: char === ' ' ? 10 : undefined,
              opacity: letterAnims[i].opacity,
              transform: [{ translateY: letterAnims[i].y }],
            }}
          >
            {char}
          </Animated.Text>
        ))}
      </View>

      {/* Tagline */}
      <Animated.Text style={{
        color: 'rgba(255,107,53,0.7)', fontSize: 12, letterSpacing: 4,
        textTransform: 'uppercase', marginTop: 8, fontWeight: '600',
        opacity: wordmarkOpacity,
      }}>
        Forge your limits
      </Animated.Text>
    </Animated.View>
  );
}
