import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, {
  Path, Circle, Defs, LinearGradient as SvgGradient,
  Stop, G, Line,
} from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  size?: number;
  variant?: 'full' | 'icon' | 'mono';
  animate?: boolean;
}

// Total path lengths (pre-measured for the SVG paths below)
const BOLT_LENGTH = 120;
const ARC_LENGTH  = 80;

export function ForgeLogo({ size = 80, variant = 'icon', animate = true }: Props) {
  const drawBolt   = useRef(new Animated.Value(animate ? BOLT_LENGTH : 0)).current;
  const drawArc    = useRef(new Animated.Value(animate ? ARC_LENGTH  : 0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale  = useRef(new Animated.Value(0.8)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) { logoOpacity.setValue(1); return; }
    // 1. Fade in container
    Animated.timing(logoOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    // 2. Draw bolt stroke (dashoffset → 0)
    Animated.timing(drawBolt, {
      toValue: 0, duration: 600, delay: 100,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      useNativeDriver: false,
    }).start();
    // 3. Draw arc stroke
    Animated.timing(drawArc, {
      toValue: 0, duration: 400, delay: 500,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      useNativeDriver: false,
    }).start();
    // 4. Ignite glow — must use JS driver because glowOpacity feeds SVG animated props
    Animated.parallel([
      Animated.spring(glowOpacity, { toValue: 1, tension: 80, friction: 6, delay: 700, useNativeDriver: false } as any),
      Animated.spring(glowScale,   { toValue: 1, tension: 80, friction: 6, delay: 700, useNativeDriver: false } as any),
    ] as any).start(() => {
      // 5. Settle into idle pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(pulseOpacity, { toValue: 0.4, duration: 1200, useNativeDriver: false }),
        ])
      ).start();
    });
  }, [animate]);

  const s = size;
  const accent = '#FF6B35';
  const mono = variant === 'mono';

  return (
    <Animated.View style={{ width: s, height: s, opacity: logoOpacity }}>
      {/* Idle glow halo */}
      <Animated.View style={{
        position: 'absolute', width: s, height: s, borderRadius: s / 2,
        backgroundColor: mono ? 'transparent' : accent,
        opacity: Animated.multiply(glowOpacity, pulseOpacity),
        transform: [{ scale: Animated.add(glowScale, new Animated.Value(0.15)) }],
        alignSelf: 'center', top: 0,
      }} />

      <Svg width={s} height={s} viewBox="0 0 80 80">
        <Defs>
          <SvgGradient id="fg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={mono ? '#fff' : '#FF6B35'} />
            <Stop offset="100%" stopColor={mono ? '#aaa' : '#FF2D55'} />
          </SvgGradient>
          <SvgGradient id="bg_g" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1a0800" />
            <Stop offset="100%" stopColor="#0a0a0f" />
          </SvgGradient>
        </Defs>

        {/* Background pill */}
        {variant !== 'mono' && (
          <Path d="M8 8 Q8 4 12 4 L68 4 Q72 4 72 8 L72 72 Q72 76 68 76 L12 76 Q8 76 8 72 Z"
            fill="url(#bg_g)" />
        )}

        {/* Outer arc/circuit — draw-in */}
        <AnimatedPath
          d="M20 58 Q12 40 20 22 Q28 8 40 6 Q52 8 60 22 Q68 36 64 52"
          stroke={mono ? '#fff' : 'url(#fg)'}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={drawArc}
        />

        {/* Lightning bolt — main mark, draw-in */}
        <AnimatedPath
          d="M46 10 L30 42 L42 42 L34 70 L56 34 L44 34 Z"
          stroke={mono ? '#aaa' : accent}
          strokeWidth="2"
          fill={mono ? 'rgba(255,255,255,0.15)' : 'rgba(255,107,53,0.15)'}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={BOLT_LENGTH}
          strokeDashoffset={drawBolt}
        />

        {/* Core dot */}
        <AnimatedCircle
          cx="40" cy="42" r="3"
          fill={mono ? '#fff' : accent}
          opacity={glowOpacity}
        />

        {/* Energy sparks */}
        {!mono && ([
          { x1: 58, y1: 28, x2: 64, y2: 22 },
          { x1: 62, y1: 40, x2: 70, y2: 38 },
          { x1: 20, y1: 30, x2: 14, y2: 24 },
        ].map((spark, i) => (
          <Line
            key={i}
            x1={spark.x1} y1={spark.y1} x2={spark.x2} y2={spark.y2}
            stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity={0.6}
          />
        )))}
      </Svg>
    </Animated.View>
  );
}
