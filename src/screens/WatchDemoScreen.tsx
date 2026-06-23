/**
 * WatchDemoScreen — 8-scene auto-playing product demo (~50s, single play).
 * Follows the cinematic brief: struggle → discovery → AI plan → first workout
 * → montage → progress → result → brand close.
 *
 * No MP4 required — every scene is code-animated using the app's own design
 * language (rings, plan cards, timers, stats). Drop a real MP4 into
 * LandingVideoScreen/sources.ts when one is available.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  X, ArrowRight, Zap, CheckCircle, Play,
  Dumbbell, Activity, Timer, Flame, TrendingUp,
} from 'lucide-react-native';
import { AnimatedRing } from '../components/AnimatedRing';
import { GlassCard } from '../components/GlassCard';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FadeIn } from '../components/FadeIn';
import { PulseView } from '../components/PulseView';
import { ForgeLogo } from '../components/ForgeLogo';
import { HomeStackParamList } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'WatchDemo'>;
const { width: W, height: H } = Dimensions.get('window');

// ─── Scene config (matches the 8-scene brief) ─────────────────────────────────
const SCENES = [
  { id: 'struggle',   dur: 5800,    accent: '#505878', eyebrow: 'THE STRUGGLE',       headline: 'Stuck.\nTired. No plan.',            tint: 'rgba(0,0,15,0.82)' },
  { id: 'discovery',  dur: 6200,    accent: '#00d4ff', eyebrow: 'THE DISCOVERY',      headline: 'One tap\nchanges everything.',        tint: 'rgba(0,4,14,0.72)' },
  { id: 'plan',       dur: 6800,    accent: '#bf5af2', eyebrow: 'THE PLAN',           headline: 'AI maps\nyour path. Instantly.',      tint: 'rgba(4,0,14,0.66)' },
  { id: 'begin',      dur: 6800,    accent: '#FF6B35', eyebrow: 'DAY ONE',            headline: 'First workout.\nFirst step.',         tint: 'rgba(10,3,0,0.62)' },
  { id: 'montage',    dur: 8000,    accent: '#FF6B35', eyebrow: null,                 headline: null,                                  tint: 'rgba(8,2,0,0.58)' },
  { id: 'progress',   dur: 7000,    accent: '#00d4ff', eyebrow: 'THE NUMBERS',        headline: 'Results you\ncan measure.',           tint: 'rgba(0,4,12,0.58)' },
  { id: 'result',     dur: 6200,    accent: '#FF6B35', eyebrow: 'THE TRANSFORMATION', headline: 'Full fit.\nFull FitForge.',           tint: 'rgba(14,4,0,0.48)' },
  { id: 'brand',      dur: Infinity, accent: '#FF6B35', eyebrow: null,                 headline: null,                                  tint: 'rgba(4,2,0,0.38)' },
] as const;

const BG: Record<string, readonly [string, string]> = {
  struggle:  ['#07071a', '#0d0d28'],
  discovery: ['#050f1a', '#070f22'],
  plan:      ['#08051a', '#100820'],
  begin:     ['#140800', '#1c0a00'],
  montage:   ['#100600', '#180800'],
  progress:  ['#040c18', '#060e20'],
  result:    ['#180800', '#200c00'],
  brand:     ['#0c0508', '#14080c'],
};

// ─── Scene 0: The Struggle — dim rings, cold grade ────────────────────────────
function StruggleVisual() {
  return (
    <FadeIn fromY={0} fromScale={0.9} duration={600}>
      <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
        {[
          { size: 160, p: 0.09, c: '#252840', c2: '#303058', id: 'st_o' },
          { size: 118, p: 0.06, c: '#1c1e36', c2: '#252744', id: 'st_m' },
          { size: 76,  p: 0.03, c: '#141628', c2: '#1c1e30', id: 'st_i' },
        ].map((r) => (
          <View key={r.id} style={{ position: 'absolute', opacity: 0.55 }}>
            <AnimatedRing size={r.size} strokeWidth={10} progress={r.p} color={r.c} color2={r.c2} gradientId={r.id} />
          </View>
        ))}
        <TrendingUp size={22} color="rgba(255,255,255,0.10)" />
      </View>
    </FadeIn>
  );
}

// ─── Scene 1: The Discovery — phone mockup with FitForge icon ─────────────────
function DiscoveryVisual() {
  const glow  = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    Animated.spring(scale, { toValue: 1, tension: 55, friction: 8, delay: 500, useNativeDriver: true } as any).start();
    setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(glow, { toValue: 0.6, duration: 1100, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1,   duration: 1100, useNativeDriver: true }),
      ])).start();
    }, 1100);
  }, []);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] });

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={[ss.phoneGlow, { opacity: glowOpacity }]} />
      <View style={ss.phoneFrame}>
        <LinearGradient colors={['#0c0c1a', '#060610']} style={{ flex: 1, borderRadius: 26, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}>
            <ForgeLogo size={68} variant="icon" animate />
            <Text style={ss.phoneName}>FitForge AI</Text>
            <View style={ss.getBtn}><Text style={ss.getBtnText}>GET</Text></View>
            <Text style={ss.phoneRating}>★★★★★  4.9 (2.1k)</Text>
          </Animated.View>
        </LinearGradient>
      </View>
    </View>
  );
}

// ─── Scene 2: AI Plan — typewriter ───────────────────────────────────────────
const PLAN = [
  { day: 'Mon', name: 'Push Day',        dur: '45 min' },
  { day: 'Tue', name: 'Rest & Mobility', dur: '20 min' },
  { day: 'Wed', name: 'Pull Day',        dur: '50 min' },
  { day: 'Thu', name: 'Legs & Core',     dur: '55 min' },
  { day: 'Fri', name: 'Cardio HIIT',     dur: '30 min' },
  { day: 'Sat', name: 'Full Body',       dur: '60 min' },
  { day: 'Sun', name: 'Rest',            dur: '—'      },
];

function AIPlanVisual() {
  const [vis, setVis] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setVis(i);
      if (i >= PLAN.length) { clearInterval(iv); setTimeout(() => setDone(true), 360); }
    }, 360);
    return () => clearInterval(iv);
  }, []);

  return (
    <GlassCard style={{ width: W - 56, maxWidth: 360 }} glow="#bf5af2" fromY={34}>
      <View style={ss.planHeader}>
        {done
          ? <CheckCircle size={13} color="#34d399" />
          : <PulseView minScale={0.8} maxScale={1.2} duration={750}><Zap size={13} color="#bf5af2" fill="#bf5af2" /></PulseView>
        }
        <Text style={[ss.planLabel, { color: done ? '#34d399' : '#bf5af2' }]}>
          {done ? 'Plan ready — 3.1 seconds' : 'AI Coach — Generating...'}
        </Text>
      </View>
      {PLAN.slice(0, vis).map((item, i) => (
        <FadeIn key={item.day} delay={0} duration={180} fromY={7}>
          <View style={[ss.planRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.05)' }]}>
            <Text style={ss.planDay}>{item.day}</Text>
            <Text style={ss.planName}>{item.name}</Text>
            <Text style={ss.planDur}>{item.dur}</Text>
          </View>
        </FadeIn>
      ))}
      {done && (
        <FadeIn delay={0} duration={250} fromY={5}>
          <View style={ss.planFooter}>
            <View style={ss.greenDot} />
            <Text style={{ color: '#34d399', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>Generated for your profile</Text>
          </View>
        </FadeIn>
      )}
    </GlassCard>
  );
}

// ─── Scene 3: First Workout — countdown timer ─────────────────────────────────
function WorkoutTimerVisual() {
  const [time, setTime] = useState(45);
  const [setNum, setSetNum] = useState(1);

  useEffect(() => {
    const iv = setInterval(() => {
      setTime((t) => {
        if (t <= 1) { setSetNum((s) => Math.min(s + 1, 4)); return 45; }
        return t - 1;
      });
    }, 420);
    return () => clearInterval(iv);
  }, []);

  const mm = String(Math.floor(time / 60)).padStart(2, '0');
  const ss2 = String(time % 60).padStart(2, '0');

  return (
    <FadeIn fromY={24} duration={420}>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Dumbbell size={14} color="#FF6B35" />
          <Text style={ss.timerLabel}>PUSH DAY — SET {setNum} / 4</Text>
        </View>
        <Text style={ss.timerNum}>{mm}:{ss2}</Text>
        <Text style={ss.timerExercise}>Squats  ×  12 reps</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={[ss.setDot, { backgroundColor: n <= setNum ? '#FF6B35' : 'rgba(255,255,255,0.10)' }]} />
          ))}
        </View>
      </View>
    </FadeIn>
  );
}

// ─── Scene 4: Montage — 4 sub-beats cycling every 2s ─────────────────────────
const MONTAGE = [
  { day: 'Day 12.',  label: 'Running',   Icon: Activity,  color: '#FF6B35' },
  { day: 'Day 40.',  label: 'Push-ups',  Icon: Dumbbell,  color: '#bf5af2' },
  { day: 'Day 70.',  label: 'Plank',     Icon: Timer,     color: '#00d4ff' },
  { day: 'Day 95.',  label: 'Full pace', Icon: Zap,       color: '#FF6B35' },
] as const;

function MontageVisual({ step }: { step: number }) {
  const beat = MONTAGE[step % 4];
  const { Icon, color, day, label } = beat;
  const entrance = useRef(new Animated.Value(0)).current;
  const sc       = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    entrance.setValue(0); sc.setValue(0.5);
    Animated.parallel([
      Animated.timing(entrance, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(sc, { toValue: 1, tension: 65, friction: 7, useNativeDriver: true } as any),
    ] as any).start();
  }, [step]);

  return (
    <Animated.View style={{ alignItems: 'center', gap: 20, opacity: entrance, transform: [{ scale: sc }] }}>
      <Text style={[ss.montageDay, { color }]}>{day}</Text>
      <View style={[ss.montageCircle, { borderColor: `${color}40`, backgroundColor: `${color}12`,
        shadowColor: color, shadowOpacity: 0.55, shadowRadius: 28 }]}>
        <Icon size={56} color={color} strokeWidth={1.4} />
      </View>
      <Text style={ss.montageLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Scene 5: Progress — counting stats ──────────────────────────────────────
function StatBox({ to, label, color, delay = 0, prefix = '' }: {
  to: number; label: string; color: string; delay?: number; prefix?: string;
}) {
  const [v, setV] = useState(0);

  useEffect(() => {
    const a = new Animated.Value(0);
    let ref: Animated.CompositeAnimation;
    const id = a.addListener(({ value }) => setV(Math.round(value)));
    const t = setTimeout(() => {
      ref = Animated.timing(a, { toValue: to, duration: 1900, useNativeDriver: false });
      ref.start();
    }, delay);
    return () => { clearTimeout(t); ref?.stop(); a.removeListener(id); };
  }, []);

  return (
    <FadeIn delay={delay} duration={300} fromY={20} fromScale={0.88}>
      <View style={ss.statBox}>
        <Text style={[ss.statNum, { color }]}>{prefix}{v}</Text>
        <Text style={ss.statLabel}>{label}</Text>
      </View>
    </FadeIn>
  );
}

function ProgressVisual() {
  return (
    <View style={{ width: W - 44 }}>
      <StatBox to={38} label="WORKOUTS DONE"  color="#FF6B35" delay={0}   />
      <View style={ss.statDivider} />
      <StatBox to={14} label="DAY STREAK"     color="#00d4ff" delay={200} />
      <View style={ss.statDivider} />
      <StatBox to={12} label="LBS LOST"       color="#34d399" delay={400} prefix="-" />
    </View>
  );
}

// ─── Scene 6: The Result — full glowing rings ─────────────────────────────────
function ResultVisual() {
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <FadeIn fromY={0} fromScale={0.84} duration={700}>
      <View style={{ alignItems: 'center', gap: 20 }}>
        <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
          <View style={ss.resultGlow} />
          <Animated.View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center', transform: [{ rotate }] }}>
            {[
              { size: 180, p: 1.00, c: '#FF6B35', c2: '#ff2d55', id: 'res_o' },
              { size: 134, p: 0.92, c: '#bf5af2', c2: '#d97aff', id: 'res_m' },
              { size: 88,  p: 0.82, c: '#00d4ff', c2: '#007aff', id: 'res_i' },
            ].map((r) => (
              <View key={r.id} style={{ position: 'absolute' }}>
                <AnimatedRing size={r.size} strokeWidth={11} progress={r.p} color={r.c} color2={r.c2} gradientId={r.id} />
              </View>
            ))}
          </Animated.View>
          <View style={{ position: 'absolute' }}>
            <CheckCircle size={26} color="#FF6B35" strokeWidth={2.5} />
          </View>
        </View>

        <FadeIn delay={700} fromY={10} duration={400}>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            {[['#FF6B35', 'Strength'], ['#bf5af2', 'Mobility'], ['#00d4ff', 'Cardio']].map(([c, l]) => (
              <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c }} />
                <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>{l}</Text>
              </View>
            ))}
          </View>
        </FadeIn>
      </View>
    </FadeIn>
  );
}

// ─── Scene 7: Brand Close — logo + tagline + CTA ─────────────────────────────
function BrandClose({ onDone }: { onDone: () => void }) {
  return (
    <FadeIn fromY={0} fromScale={0.88} duration={800}>
      <View style={{ alignItems: 'center', gap: 24 }}>
        <PulseView minScale={0.97} maxScale={1.04} duration={2200}>
          <ForgeLogo size={90} variant="icon" animate />
        </PulseView>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={ss.brandName}>FitForge AI</Text>
          <Text style={ss.brandTagline}>Your transformation,{'\n'}intelligently guided.</Text>
        </View>
        <FadeIn delay={1300} fromY={22} duration={500} fromScale={0.9}>
          <AnimatedPressable onPress={onDone} scaleDown={0.94}>
            <LinearGradient
              colors={['#FF6B35', '#ff2d55']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={ss.ctaBtn}
            >
              <Text style={ss.ctaText}>Get Started</Text>
              <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </AnimatedPressable>
        </FadeIn>
      </View>
    </FadeIn>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function SceneBar({ current }: { current: number }) {
  return (
    <View style={ss.barRow}>
      {SCENES.map((s, i) => (
        <View key={s.id} style={[ss.barItem, {
          flex: i === current ? 2.2 : 1,
          backgroundColor: i < current ? SCENES[i].accent : i === current ? s.accent : 'rgba(255,255,255,0.10)',
          opacity: i <= current ? 1 : 0.35,
        }]} />
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export function WatchDemoScreen({ navigation }: Props) {
  const [scene, setScene]         = useState(0);
  const [montageStep, setMontage] = useState(0);
  const captionFade = useRef(new Animated.Value(1)).current;
  const flash       = useRef(new Animated.Value(0)).current;

  const advance = useCallback(() => {
    if (scene >= SCENES.length - 1) return;
    Animated.timing(captionFade, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.timing(flash, { toValue: 0.52, duration: 100, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0,    duration: 300, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      setScene((s) => s + 1);
      Animated.timing(captionFade, { toValue: 1, duration: 380, useNativeDriver: true }).start();
    }, 140);
  }, [scene]);

  // Auto-advance timer
  useEffect(() => {
    const dur = SCENES[scene].dur;
    if (dur === Infinity) return;
    const t = setTimeout(advance, dur);
    return () => clearTimeout(t);
  }, [scene]);

  // Montage sub-cycle (scene 4)
  useEffect(() => {
    if (scene !== 4) return;
    setMontage(0);
    const iv = setInterval(() => setMontage((s) => (s + 1) % 4), 2000);
    return () => clearInterval(iv);
  }, [scene]);

  const s = SCENES[scene];

  // Caption for montage changes with sub-beat
  const montageCaption = scene === 4 ? MONTAGE[montageStep % 4].day : null;

  return (
    <View style={ss.root}>
      {/* Per-scene gradient background */}
      <LinearGradient
        colors={BG[s.id] as [string, string]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Ambient accent glow in center */}
      <View style={[StyleSheet.absoluteFillObject, ss.glowWrap]} pointerEvents="none">
        <View style={[ss.glowCircle, { backgroundColor: s.accent }]} />
      </View>
      {/* Camera flash overlay */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#fff', opacity: flash }]} pointerEvents="none" />

      <SafeAreaView style={StyleSheet.absoluteFillObject} edges={['top', 'bottom']}>

        {/* Top bar */}
        <View style={ss.topBar}>
          <SceneBar current={scene} />
          <AnimatedPressable onPress={() => navigation.goBack()} scaleDown={0.86}>
            <View style={ss.closeBtn}>
              <X size={13} color="rgba(255,255,255,0.38)" strokeWidth={2.5} />
            </View>
          </AnimatedPressable>
        </View>

        {/* Eyebrow */}
        {(s.eyebrow || scene === 4) && (
          <Animated.View style={[ss.eyebrowRow, { opacity: captionFade }]}>
            <Text style={[ss.eyebrow, { color: s.accent }]}>
              {scene === 4 ? 'THE WORK' : s.eyebrow}
            </Text>
          </Animated.View>
        )}

        {/* Hero visual */}
        <View style={ss.hero}>
          {scene === 0 && <StruggleVisual />}
          {scene === 1 && <DiscoveryVisual />}
          {scene === 2 && <AIPlanVisual />}
          {scene === 3 && <WorkoutTimerVisual />}
          {scene === 4 && <MontageVisual step={montageStep} />}
          {scene === 5 && <ProgressVisual />}
          {scene === 6 && <ResultVisual />}
          {scene === 7 && <BrandClose onDone={() => navigation.goBack()} />}
        </View>

        {/* Caption — hidden on brand close (scene 7) */}
        {scene < 7 && (
          <Animated.View style={[ss.caption, { opacity: captionFade }]}>
            <View style={[ss.accentBar, { backgroundColor: s.accent }]} />
            <Text style={ss.headline}>
              {montageCaption ?? s.headline}
            </Text>
            {scene < SCENES.length - 2 && (
              <AnimatedPressable onPress={advance} scaleDown={0.9} style={{ marginTop: 16, alignSelf: 'flex-start' }}>
                <Text style={ss.skipHint}>tap to skip</Text>
              </AnimatedPressable>
            )}
          </Animated.View>
        )}

      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07070f' },
  glowWrap:   { alignItems: 'center', justifyContent: 'center' },
  glowCircle: { width: 700, height: 700, borderRadius: 350, opacity: 0.07 },

  topBar:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10, gap: 14 },
  barRow:   { flex: 1, flexDirection: 'row', gap: 4, height: 3 },
  barItem:  { height: 3, borderRadius: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },

  eyebrowRow: { paddingHorizontal: 28, marginBottom: 8 },
  eyebrow:    { fontSize: 10, fontWeight: '800', letterSpacing: 3.5, textTransform: 'uppercase' },

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },

  caption:   { paddingHorizontal: 28, paddingBottom: 4 },
  accentBar: { width: 22, height: 3, borderRadius: 2, marginBottom: 16 },
  headline: {
    color: '#fff', fontSize: 34, fontWeight: '900', lineHeight: 40, letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 14,
  },
  skipHint: { color: 'rgba(255,255,255,0.18)', fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase' },

  // Phone mockup
  phoneGlow:  { position: 'absolute', width: 260, height: 360, borderRadius: 130, backgroundColor: '#00d4ff' },
  phoneFrame: { width: 180, height: 300, borderRadius: 30, backgroundColor: '#0a0a12', borderWidth: 2, borderColor: 'rgba(0,212,255,0.28)', overflow: 'hidden', shadowColor: '#00d4ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.32, shadowRadius: 22 },
  phoneName:  { color: '#fff', fontSize: 15, fontWeight: '900', marginTop: 12, letterSpacing: -0.3 },
  getBtn:     { marginTop: 10, backgroundColor: '#00d4ff', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 7 },
  getBtnText: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  phoneRating:{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 8 },

  // Plan card
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  planLabel:  { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  planRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  planDay:    { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '700', width: 30, letterSpacing: 0.5 },
  planName:   { color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 },
  planDur:    { color: 'rgba(255,255,255,0.25)', fontSize: 11 },
  planFooter: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  greenDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },

  // Workout timer
  timerLabel:   { color: '#FF6B35', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  timerNum:     { color: '#fff', fontSize: 76, fontWeight: '900', letterSpacing: -3, lineHeight: 80 },
  timerExercise:{ color: 'rgba(255,255,255,0.58)', fontSize: 20, fontWeight: '800' },
  setDot:       { width: 36, height: 7, borderRadius: 4 },

  // Montage
  montageDay:    { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  montageCircle: { width: 130, height: 130, borderRadius: 65, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  montageLabel:  { color: 'rgba(255,255,255,0.65)', fontSize: 18, fontWeight: '800' },

  // Stats
  statBox:    { paddingVertical: 13 },
  statNum:    { fontSize: 58, fontWeight: '900', letterSpacing: -2.5, lineHeight: 62 },
  statLabel:  { color: 'rgba(255,255,255,0.28)', fontSize: 9, fontWeight: '800', letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 2 },
  statDivider:{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.07)' },

  // Result rings
  resultGlow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#FF6B35', opacity: 0.10 },

  // Brand close
  brandName:    { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  brandTagline: { color: 'rgba(255,255,255,0.42)', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 28, paddingVertical: 19, paddingHorizontal: 32,
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 26,
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
});
