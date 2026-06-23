import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView, type VideoPlayerStatus } from 'expo-video';
import { useEvent } from 'expo';
import { ArrowRight } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ForgeLogo } from '../components/ForgeLogo';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FadeIn } from '../components/FadeIn';
import { TransformationReel } from '../components/TransformationReel';
import { LANDING_VIDEO } from '../../assets/landing/sources';
import { HomeStackParamList } from '../types';

const { width: W, height: H } = Dimensions.get('window');

// Usable both as a stack screen (defaults to dismiss) and standalone with an
// explicit onGetStarted (e.g. an onboarding flow that routes to auth).
type Props = Partial<NativeStackScreenProps<HomeStackParamList, 'LandingVideo'>> & {
  /** Called on "Get Started" / tap-to-continue. Defaults to navigation.goBack. */
  onGetStarted?: () => void;
};

export function LandingVideoScreen({ onGetStarted, navigation }: Props) {
  // ── Video player ────────────────────────────────────────────────────────────
  // useVideoPlayer accepts a null source; we simply render the fallback when so.
  const player = useVideoPlayer(LANDING_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    if (LANDING_VIDEO) p.play();
  });

  // Track player status so we can fall back on load/decoding errors.
  const { status } = useEvent(player, 'statusChange', { status: player.status }) as {
    status: VideoPlayerStatus;
  };

  // Show fallback when there is no video wired in, or playback errored out.
  const useFallback = !LANDING_VIDEO || status === 'error';
  const videoReady = !useFallback && status === 'readyToPlay';

  // ── Overlay entrance ──────────────────────────────────────────────────────────
  const overlayFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(overlayFade, {
      toValue: 1,
      duration: 700,
      delay: 250,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleGetStarted = () => (onGetStarted ?? navigation?.goBack)?.();

  return (
    <View style={styles.root}>
      {/* ── Background layer: video OR fallback still ── */}
      {useFallback ? (
        <FallbackHero />
      ) : (
        <>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
          {/* Hold the fallback still beneath the video until first frame is ready,
              so there's never a black flash on cold start. */}
          {!videoReady && <FallbackHero />}
        </>
      )}

      {/* ── Cinematic scrim: darken top + bottom so overlay text stays legible ── */}
      <LinearGradient
        colors={['rgba(7,7,15,0.55)', 'transparent', 'rgba(7,7,15,0.30)', 'rgba(7,7,15,0.92)']}
        locations={[0, 0.32, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── Tap-to-continue: full-screen gesture sitting BELOW the CTA controls ── */}
      <AnimatedPressable
        onPress={handleGetStarted}
        haptic={false}
        scaleDown={1}
        style={StyleSheet.absoluteFillObject as any}
      >
        <View style={StyleSheet.absoluteFill} />
      </AnimatedPressable>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents="box-none">
        {/* Skip affordance (top-right) */}
        <Animated.View style={[styles.skipWrap, { opacity: overlayFade }]} pointerEvents="box-none">
          <AnimatedPressable onPress={handleGetStarted} scaleDown={0.9}>
            <View style={styles.skipPill}>
              <Text style={styles.skipText}>SKIP</Text>
            </View>
          </AnimatedPressable>
        </Animated.View>

        <View style={{ flex: 1 }} pointerEvents="box-none" />

        {/* ── Bottom overlay: logo wordmark + CTA ── */}
        <Animated.View style={[styles.bottom, { opacity: overlayFade }]} pointerEvents="box-none">
          <View style={styles.brandRow}>
            <ForgeLogo size={40} variant="icon" animate />
            <View>
              <Text style={styles.brandName}>FitForge AI</Text>
              <Text style={styles.brandTag}>Your plan. Your pace. Your results.</Text>
            </View>
          </View>

          <FadeIn delay={650} fromY={20} duration={500}>
            <AnimatedPressable onPress={handleGetStarted} scaleDown={0.95}>
              <LinearGradient
                colors={['#FF6B35', '#ff2d55']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>Get Started</Text>
                <ArrowRight size={20} color="#fff" strokeWidth={2.6} />
              </LinearGradient>
            </AnimatedPressable>
          </FadeIn>

          <Text style={styles.tapHint}>Tap anywhere to continue</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── Fallback (no-video / error / low-end): the code-driven animated reel ──────
// Auto-plays and loops live — no MP4 needed. Carries its own story captions.
function FallbackHero() {
  return <TransformationReel />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07070f', width: W, height: H },
  safe: { flex: 1 },

  skipWrap: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  skipPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },

  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 8,
    gap: 22,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  brandTag: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginTop: 1 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 28,
    paddingVertical: 19,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },

  tapHint: {
    color: 'rgba(255,255,255,0.32)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
