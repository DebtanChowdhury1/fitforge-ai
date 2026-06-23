import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedRing } from './AnimatedRing';

const { width: W, height: H } = Dimensions.get('window');

/**
 * A fully code-driven, auto-playing, seamlessly-looping "video" of the FitForge
 * transformation story. No MP4 / asset required — it renders live.
 *
 * Used as the background of LandingVideoScreen whenever no real video file is
 * wired in. Carries the story text beats itself (like the baked-in captions a
 * rendered video would have), so the screen above only needs logo + CTA.
 */

// Four beats that walk through the FitForge pipeline — before vs after.
const BEATS = [
  {
    eyebrow: 'BEFORE FITFORGE',
    headline: 'Random sessions.\nZero results.',
    weight: 89,
    fill: [0.08, 0.05, 0.03] as [number, number, number],
    warmth: 0.0,
  },
  {
    eyebrow: 'THE DISCOVERY',
    headline: 'AI maps your\nperfect plan.',
    weight: 84,
    fill: [0.42, 0.33, 0.24] as [number, number, number],
    warmth: 0.38,
  },
  {
    eyebrow: 'COACH-LED EXECUTION',
    headline: 'Every rep.\nEvery cue.',
    weight: 77,
    fill: [0.78, 0.65, 0.52] as [number, number, number],
    warmth: 0.74,
  },
  {
    eyebrow: 'THE TRANSFORMATION',
    headline: 'Goal hit.\nData-proven.',
    weight: 72,
    fill: [1.0, 0.92, 0.84] as [number, number, number],
    warmth: 1.0,
  },
];

const BEAT_MS = 2900;

export function TransformationReel() {
  const [beat, setBeat] = useState(0);
  const [weight, setWeight] = useState(BEATS[0].weight);

  // Animated values
  const captionFade = useRef(new Animated.Value(0)).current;
  const warmth      = useRef(new Animated.Value(0)).current;   // 0 cold → 1 warm
  const weightAnim  = useRef(new Animated.Value(BEATS[0].weight)).current;
  const ringSpin    = useRef(new Animated.Value(0)).current;

  // Continuous slow ring rotation (gives the "alive" feel)
  useEffect(() => {
    Animated.loop(
      Animated.timing(ringSpin, { toValue: 1, duration: 32000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    const id = weightAnim.addListener(({ value }) => setWeight(Math.round(value)));
    return () => weightAnim.removeListener(id);
  }, []);

  // Advance beats on a loop
  useEffect(() => {
    const t = setInterval(() => setBeat((b) => (b + 1) % BEATS.length), BEAT_MS);
    return () => clearInterval(t);
  }, []);

  // React to each beat change: fade caption out→in, ramp warmth, tick weight
  useEffect(() => {
    const b = BEATS[beat];

    // Caption crossfade
    captionFade.setValue(0);
    Animated.timing(captionFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Warmth & weight ease toward target
    Animated.timing(warmth, {
      toValue: b.warmth, duration: BEAT_MS * 0.8, easing: Easing.inOut(Easing.ease), useNativeDriver: false,
    }).start();
    Animated.timing(weightAnim, {
      toValue: b.weight, duration: BEAT_MS * 0.85, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [beat]);

  const b = BEATS[beat];

  const spin = ringSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const warmGlow = warmth.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.26] });
  const coldGrade = warmth.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0] });

  return (
    <View style={styles.root}>
      {/* Base */}
      <LinearGradient colors={['#0a0a14', '#07070f']} style={StyleSheet.absoluteFill} />

      {/* Warm radial glow grows as the story warms up */}
      <Animated.View style={[styles.warmCenter, { opacity: warmGlow }]} pointerEvents="none">
        <LinearGradient
          colors={['#FF6B35', 'transparent']}
          style={{ flex: 1, borderRadius: W }}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Concentric activity rings — re-fill each beat */}
      <View style={styles.ringWrap}>
        {/* Explicit size so rotation is around the true center of the 196×196 group */}
        <Animated.View style={{ width: 196, height: 196, transform: [{ rotate: spin }] }}>
          <View style={{ position: 'absolute', top: 0, left: 0 }}>
            <AnimatedRing size={196} strokeWidth={11} progress={b.fill[0]} color="#FF6B35" color2="#ff2d55" gradientId="reel_o" />
          </View>
          <View style={{ position: 'absolute', top: 26, left: 26 }}>
            <AnimatedRing size={144} strokeWidth={11} progress={b.fill[1]} color="#bf5af2" color2="#d97aff" gradientId="reel_m" />
          </View>
          <View style={{ position: 'absolute', top: 52, left: 52 }}>
            <AnimatedRing size={92} strokeWidth={11} progress={b.fill[2]} color="#00d4ff" color2="#007aff" gradientId="reel_i" />
          </View>
        </Animated.View>

        {/* Weight readout in the core */}
        <View style={styles.weightCore} pointerEvents="none">
          <Text style={styles.weightNum}>{weight}</Text>
          <Text style={styles.weightUnit}>KG</Text>
        </View>
      </View>

      {/* Beat progress dots */}
      <View style={styles.beatDots} pointerEvents="none">
        {BEATS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.beatDot,
              i === beat ? styles.beatDotActive : styles.beatDotInactive,
            ]}
          />
        ))}
      </View>

      {/* Cold-grade desaturating veil that lifts as warmth rises */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#0a1428', opacity: coldGrade }]}
        pointerEvents="none"
      />

      {/* Story caption (top third) — these are the "baked" video beats */}
      <Animated.View style={[styles.caption, { opacity: captionFade }]} pointerEvents="none">
        <Text style={styles.eyebrow}>{b.eyebrow}</Text>
        <Text style={styles.headline}>{b.headline}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: '#07070f' },

  warmCenter: {
    position: 'absolute',
    width: W * 1.6, height: W * 1.6,
    top: H / 2 - W * 0.8, left: W / 2 - W * 0.8,
  },

  ringWrap: {
    position: 'absolute',
    top: H * 0.42, left: W / 2 - 98,
    width: 196, height: 196,
    alignItems: 'center', justifyContent: 'center',
  },
  weightCore: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  weightNum: { color: '#fff', fontSize: 44, fontWeight: '900', letterSpacing: -1.5, lineHeight: 46 },
  weightUnit: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginTop: 2 },

  caption: {
    position: 'absolute',
    top: H * 0.17, left: 28, right: 28,
  },
  eyebrow: {
    color: '#FF6B35', fontSize: 11, fontWeight: '800', letterSpacing: 3.5, marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8,
  },
  headline: {
    color: '#fff', fontSize: 38, fontWeight: '900', lineHeight: 42, letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 16,
  },
  beatDots: {
    position: 'absolute',
    top: H * 0.42 + 210,
    left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7,
  },
  beatDot: { width: 6, height: 6, borderRadius: 3 },
  beatDotActive: { backgroundColor: '#FF6B35', width: 18 },
  beatDotInactive: { backgroundColor: 'rgba(255,255,255,0.22)' },
});
