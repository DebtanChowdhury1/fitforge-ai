import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedRing } from './AnimatedRing';

// ── Config ────────────────────────────────────────────────────────────────────

const BEAT_MS = 2800;

// Cycling phase labels + intensity per cue position
const PHASES = ['SETUP', 'EXECUTE', 'PEAK', 'CONTROL', 'BREATHE', 'RESET'];
// How "fired up" each phase feels — outer ring fill factor
const INTENSITIES = [0.18, 0.62, 1.0, 0.72, 0.42, 0.22];

const CATEGORY_COLORS: Record<string, [string, string]> = {
  chest:     ['#FF6B35', '#ff2d55'],
  back:      ['#00d4ff', '#0084ff'],
  legs:      ['#34d399', '#059669'],
  shoulders: ['#bf5af2', '#5e5ce6'],
  arms:      ['#ff8c00', '#FF6B35'],
  core:      ['#00bcd4', '#34d399'],
  glutes:    ['#ff2d55', '#bf5af2'],
  cardio:    ['#ff8c00', '#ff2d55'],
};

const CATEGORY_EMOJI: Record<string, string> = {
  chest:     '🏋️',
  back:      '🎯',
  legs:      '⚡',
  shoulders: '💪',
  arms:      '🔥',
  core:      '🎯',
  glutes:    '🔥',
  cardio:    '💨',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  exerciseName: string;
  category: string;
  primaryMuscles: string[];
  cues: string[];
  tip?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExerciseAnimationView({ exerciseName, category, primaryMuscles, cues, tip }: Props) {
  const [beat, setBeat] = useState(0);
  const totalBeats = cues.length;

  const captionFade = useRef(new Animated.Value(0)).current;
  const warmth      = useRef(new Animated.Value(0)).current;
  const phasePulse  = useRef(new Animated.Value(1)).current;
  const ringSpin    = useRef(new Animated.Value(0)).current;
  const glowPulse   = useRef(new Animated.Value(0)).current;

  const [colors1, colors2] = CATEGORY_COLORS[category] ?? ['#FF6B35', '#ff2d55'];
  const emoji = CATEGORY_EMOJI[category] ?? '💪';

  const phaseIndex  = beat % PHASES.length;
  const intensity   = INTENSITIES[phaseIndex];

  // Outer ring fill = intensity (primary muscle activation)
  // Mid ring fill = 75% of intensity (secondary)
  // Inner ring fill = 40% of intensity (core engagement)
  const outerFill = intensity;
  const midFill   = intensity * 0.75;
  const innerFill = intensity * 0.42;

  // ── Continuous rotation + glow pulse ──────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.timing(ringSpin, { toValue: 1, duration: 28000, easing: Easing.linear, useNativeDriver: true }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glowPulse, { toValue: 0.3, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    ).start();
  }, []);

  // ── Beat clock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setBeat((b) => (b + 1) % totalBeats), BEAT_MS);
    return () => clearInterval(t);
  }, [totalBeats]);

  // ── React to each beat ─────────────────────────────────────────────────────
  useEffect(() => {
    // Caption crossfade
    captionFade.setValue(0);
    Animated.timing(captionFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Warmth ramps toward intensity
    Animated.timing(warmth, {
      toValue: intensity,
      duration: BEAT_MS * 0.75,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Phase badge pop
    phasePulse.setValue(0.8);
    Animated.spring(phasePulse, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();
  }, [beat]);

  const spin        = ringSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const warmGlow    = warmth.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.28] });
  const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.22] });

  // Gradient IDs per ring (must be unique per instance to avoid SVG collision)
  const gid = category.slice(0, 3);

  return (
    <View style={ss.root}>
      {/* Base background */}
      <LinearGradient colors={['#090912', '#06060e']} style={StyleSheet.absoluteFill} />

      {/* Radial warm glow — grows with intensity */}
      <Animated.View style={[ss.warmCenter, { opacity: warmGlow }]} pointerEvents="none">
        <LinearGradient
          colors={[colors1, 'transparent']}
          style={{ flex: 1, borderRadius: 300 }}
          start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Secondary glow (pulsing) */}
      <Animated.View style={[ss.glowPulse, { opacity: glowOpacity }]} pointerEvents="none">
        <LinearGradient
          colors={[colors2, 'transparent']}
          style={{ flex: 1, borderRadius: 300 }}
          start={{ x: 0.5, y: 0.5 }} end={{ x: 0.8, y: 0.8 }}
        />
      </Animated.View>

      {/* ── Rings (spinning slowly) ── */}
      <View style={ss.ringWrap}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          {/* Outer ring — primary muscle */}
          <View style={ss.outerRingPos}>
            <AnimatedRing
              size={192} strokeWidth={10}
              progress={outerFill}
              color={colors1} color2={colors2}
              gradientId={`${gid}_o`}
            />
          </View>
          {/* Mid ring — secondary muscle */}
          <View style={ss.midRingPos}>
            <AnimatedRing
              size={144} strokeWidth={10}
              progress={midFill}
              color={colors2} color2={colors1}
              gradientId={`${gid}_m`}
            />
          </View>
          {/* Inner ring — core */}
          <View style={ss.innerRingPos}>
            <AnimatedRing
              size={94} strokeWidth={10}
              progress={innerFill}
              color={colors1} color2={colors2}
              gradientId={`${gid}_i`}
            />
          </View>
        </Animated.View>

        {/* Ring center */}
        <View style={ss.ringCenter} pointerEvents="none">
          <Text style={ss.centerEmoji}>{emoji}</Text>
          <Text style={[ss.centerMuscle, { color: colors1 }]}>
            {primaryMuscles[0]?.toUpperCase() ?? 'MUSCLE'}
          </Text>
        </View>
      </View>

      {/* ── Beat caption ── */}
      <Animated.View style={[ss.caption, { opacity: captionFade }]} pointerEvents="none">
        {/* Phase badge */}
        <Animated.View
          style={[ss.phaseBadge, { borderColor: colors1 + '55', transform: [{ scale: phasePulse }] }]}
        >
          <LinearGradient
            colors={[colors1 + '30', colors1 + '10']}
            style={ss.phaseBadgeGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <View style={[ss.phaseDot, { backgroundColor: colors1 }]} />
            <Text style={[ss.phaseText, { color: colors1 }]}>
              {PHASES[phaseIndex]} · cue {beat + 1}/{totalBeats}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Cue text */}
        <Text style={ss.cueText}>{cues[beat]}</Text>
      </Animated.View>

      {/* ── Exercise name badge ── */}
      <View style={ss.nameBadge}>
        <Text style={ss.nameText} numberOfLines={1}>{exerciseName}</Text>
        <View style={[ss.livePip, { backgroundColor: colors1 }]} />
      </View>

      {/* ── Beat progress bar ── */}
      <View style={ss.progressTrack}>
        {Array.from({ length: totalBeats }).map((_, i) => (
          <View
            key={i}
            style={[
              ss.progressDot,
              { backgroundColor: i === beat ? colors1 : 'rgba(255,255,255,0.15)' },
              i === beat && { transform: [{ scaleX: 2 }] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const RING_SIZE = 192;
const RING_CENTER = RING_SIZE / 2;

const ss = StyleSheet.create({
  root: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#07070e',
  },

  warmCenter: {
    position: 'absolute',
    width: 340, height: 340,
    top: '50%', left: '50%',
    marginTop: -170, marginLeft: -170,
  },
  glowPulse: {
    position: 'absolute',
    width: 260, height: 260,
    top: '50%', left: '50%',
    marginTop: -130, marginLeft: -130,
  },

  ringWrap: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE,
    top: '50%', left: '50%',
    marginTop: -RING_CENTER - 20,
    marginLeft: -RING_CENTER,
    alignItems: 'center', justifyContent: 'center',
  },
  outerRingPos: { position: 'absolute' },
  midRingPos:   { position: 'absolute', top: 24, left: 24 },
  innerRingPos: { position: 'absolute', top: 49, left: 49 },

  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  centerEmoji:  { fontSize: 26, marginBottom: 4 },
  centerMuscle: { fontSize: 8, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' },

  caption: {
    position: 'absolute',
    bottom: 60, left: 20, right: 20,
    alignItems: 'center', gap: 10,
  },
  phaseBadge: {
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
  },
  phaseBadgeGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  phaseDot: { width: 5, height: 5, borderRadius: 3 },
  phaseText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  cueText: {
    color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700',
    textAlign: 'center', lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  nameBadge: {
    position: 'absolute', top: 16, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  nameText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700' },
  livePip: { width: 6, height: 6, borderRadius: 3 },

  progressTrack: {
    position: 'absolute', bottom: 16,
    left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  progressDot: {
    width: 6, height: 6, borderRadius: 3,
  },
});
