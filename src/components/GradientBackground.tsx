import React, { useRef, useEffect, memo } from 'react';
import { StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

export type GradientVariant = 'default' | 'progress' | 'ai' | 'workout';

interface OrbConfig {
  color1: string; cx1: string; cy1: string; r1: string;
  color2: string; cx2: string; cy2: string; r2: string;
}

// Each variant positions orbs to complement the content on that screen
const CONFIGS: Record<GradientVariant, OrbConfig> = {
  // Home / generic: teal top-left, purple bottom-right
  default: {
    color1: '#00d4ff', cx1: '20%', cy1: '12%', r1: '52%',
    color2: '#bf5af2', cx2: '85%', cy2: '82%', r2: '45%',
  },
  // Progress: same palette as the stat counters — cyan matches volume, purple matches weekly
  progress: {
    color1: '#00d4ff', cx1: '15%', cy1: '10%', r1: '48%',
    color2: '#bf5af2', cx2: '88%', cy2: '85%', r2: '42%',
  },
  // ForgeAI: purple-dominant, blue accent
  ai: {
    color1: '#bf5af2', cx1: '78%', cy1: '18%', r1: '50%',
    color2: '#4488ff', cx2: '12%', cy2: '78%', r2: '44%',
  },
  // Workout: orange energy
  workout: {
    color1: '#FF6B35', cx1: '70%', cy1: '15%', r1: '50%',
    color2: '#ff2d55', cx2: '18%', cy2: '80%', r2: '42%',
  },
};

interface Props {
  variant?: GradientVariant;
  style?: any;
}

export const GradientBackground = memo(function GradientBackground({ variant = 'default', style }: Props) {
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slow breathing pulse — subtle enough to not distract from data
    const a1 = Animated.loop(
      Animated.sequence([
        Animated.timing(orb1, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(orb1, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ])
    );
    const a2 = Animated.loop(
      Animated.sequence([
        Animated.timing(orb2, { toValue: 1, duration: 11000, useNativeDriver: true }),
        Animated.timing(orb2, { toValue: 0, duration: 11000, useNativeDriver: true }),
      ])
    );
    a1.start();
    // Stagger orb2 so both don't pulse in sync
    const t = setTimeout(() => a2.start(), 3800);
    return () => { a1.stop(); a2.stop(); clearTimeout(t); };
  }, []);

  // Orb 1: 10% → 20% opacity pulse
  const op1 = orb1.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.20] });
  // Orb 2: 7% → 15% — slightly dimmer, more atmospheric
  const op2 = orb2.interpolate({ inputRange: [0, 1], outputRange: [0.07, 0.15] });

  const cfg = CONFIGS[variant];

  // Unique ID namespace per variant so multiple screens don't collide
  const ns = `gb_${variant}`;

  return (
    <>
      {/* Layer 1: Near-black base linear gradient */}
      <LinearGradient
        colors={['#09090e', '#0c0c18', '#09090e']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[StyleSheet.absoluteFillObject, style]}
      />

      {/* Layer 2: Radial glow orb 1 — top-left */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: op1 }]} pointerEvents="none">
        <Svg width={W} height={H} style={styles.fixed}>
          <Defs>
            <RadialGradient id={`${ns}_o1`} cx={cfg.cx1} cy={cfg.cy1} r={cfg.r1} gradientUnits="objectBoundingBox">
              <Stop offset="0%" stopColor={cfg.color1} stopOpacity="1" />
              <Stop offset="60%" stopColor={cfg.color1} stopOpacity="0.35" />
              <Stop offset="100%" stopColor={cfg.color1} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill={`url(#${ns}_o1)`} />
        </Svg>
      </Animated.View>

      {/* Layer 3: Radial glow orb 2 — bottom-right, offset timing */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: op2 }]} pointerEvents="none">
        <Svg width={W} height={H} style={styles.fixed}>
          <Defs>
            <RadialGradient id={`${ns}_o2`} cx={cfg.cx2} cy={cfg.cy2} r={cfg.r2} gradientUnits="objectBoundingBox">
              <Stop offset="0%" stopColor={cfg.color2} stopOpacity="1" />
              <Stop offset="55%" stopColor={cfg.color2} stopOpacity="0.28" />
              <Stop offset="100%" stopColor={cfg.color2} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill={`url(#${ns}_o2)`} />
        </Svg>
      </Animated.View>

    </>
  );
});

const styles = StyleSheet.create({
  fixed: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
