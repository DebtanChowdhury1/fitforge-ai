import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X, Zap, CheckCircle, Play, TrendingUp, Flame } from 'lucide-react-native';
import { WorkflowGL } from '../components/gl/WorkflowGL';
import { AnimatedRing } from '../components/AnimatedRing';
import { GlassCard } from '../components/GlassCard';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FadeIn } from '../components/FadeIn';
import { PulseView } from '../components/PulseView';
import { HomeStackParamList } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Story'>;
const { width: W, height: H } = Dimensions.get('window');

// ─── Scene config ─────────────────────────────────────────────────────────────
const SCENES = [
  {
    id: 'plateau',
    duration: 4200,
    accent: '#505878',
    eyebrow: 'THE REALITY',
    headline: "You've\ntried before.",
    sub: 'The plan was good.\nThe follow-through wasn\'t.',
    tint: 'rgba(0,0,10,0.78)',
  },
  {
    id: 'intelligence',
    duration: 4900,
    accent: '#bf5af2',
    eyebrow: 'AI-POWERED',
    headline: 'Your plan.\nIn 3 seconds.',
    sub: 'AI that learns your body, your schedule, and your limits.',
    tint: 'rgba(4,0,12,0.68)',
  },
  {
    id: 'consistency',
    duration: 5100,
    accent: '#FF6B35',
    eyebrow: 'STAY CONSISTENT',
    headline: 'Show up.\nEvery time.',
    sub: 'Every rep tracked. Every streak protected.',
    tint: 'rgba(10,3,0,0.64)',
  },
  {
    id: 'results',
    duration: 4400,
    accent: '#00d4ff',
    eyebrow: 'THE NUMBERS',
    headline: 'Results you\ncan measure.',
    sub: 'Week by week. Rep by rep.',
    tint: 'rgba(0,4,12,0.60)',
  },
  {
    id: 'achievement',
    duration: Infinity,
    accent: '#FF6B35',
    eyebrow: 'YOUR TURN',
    headline: 'This could\nbe you.',
    sub: null,
    tint: 'rgba(12,3,0,0.52)',
  },
] as const;

// ─── Concentric activity rings ────────────────────────────────────────────────
function ConcentricRings({ plateau }: { plateau: boolean }) {
  const rotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!plateau) {
      Animated.loop(
        Animated.timing(rotAnim, { toValue: 1, duration: 28000, useNativeDriver: true })
      ).start();
    }
  }, [plateau]);

  const rotate = rotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rings = plateau
    ? [
        { size: 164, sw: 10, p: 0.10, c: '#30334a', c2: '#3a3e58', id: 'p_o' },
        { size: 122, sw: 10, p: 0.07, c: '#252840', c2: '#2f3250', id: 'p_m' },
        { size: 80,  sw: 10, p: 0.04, c: '#1a1c30', c2: '#222440', id: 'p_i' },
      ]
    : [
        { size: 164, sw: 10, p: 1.00, c: '#FF6B35', c2: '#ff2d55', id: 'a_o' },
        { size: 122, sw: 10, p: 0.88, c: '#bf5af2', c2: '#d97aff', id: 'a_m' },
        { size: 80,  sw: 10, p: 0.74, c: '#00d4ff', c2: '#007aff', id: 'a_i' },
      ];

  return (
    <View style={{ width: 164, height: 164, alignItems: 'center', justifyContent: 'center' }}>
      {!plateau && (
        <View style={{
          position: 'absolute', width: 260, height: 260, borderRadius: 130,
          backgroundColor: '#FF6B35', opacity: 0.10,
        }} />
      )}
      <Animated.View style={[
        { width: 164, height: 164, alignItems: 'center', justifyContent: 'center' },
        !plateau && { transform: [{ rotate }] },
      ]}>
        {rings.map((r) => (
          <View key={r.id} style={{ position: 'absolute', opacity: plateau ? 0.45 : 1 }}>
            <AnimatedRing
              size={r.size} strokeWidth={r.sw} progress={r.p}
              color={r.c} color2={r.c2} gradientId={r.id}
            />
          </View>
        ))}
      </Animated.View>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
        {plateau
          ? <TrendingUp size={20} color="rgba(255,255,255,0.12)" />
          : <CheckCircle size={22} color="#FF6B35" strokeWidth={2.5} />
        }
      </View>
    </View>
  );
}

// ─── Scene 1: AI plan card (typewriter) ──────────────────────────────────────
const PLAN = [
  { day: 'Mon', name: 'Push Day',        dur: '45 min' },
  { day: 'Tue', name: 'Rest & Mobility', dur: '20 min' },
  { day: 'Wed', name: 'Pull Day',        dur: '50 min' },
  { day: 'Thu', name: 'Legs & Core',     dur: '55 min' },
  { day: 'Fri', name: 'Cardio HIIT',     dur: '30 min' },
  { day: 'Sat', name: 'Full Body',       dur: '60 min' },
  { day: 'Sun', name: 'Rest',            dur: '—'      },
];

function AIPlanCard() {
  const [visible, setVisible] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setVisible(i);
      if (i >= PLAN.length) { clearInterval(iv); setTimeout(() => setDone(true), 400); }
    }, 370);
    return () => clearInterval(iv);
  }, []);

  return (
    <GlassCard style={{ width: W - 56, maxWidth: 360 }} glow="#bf5af2" fromY={36}>
      <View style={ss.planHeader}>
        {!done
          ? <PulseView minScale={0.82} maxScale={1.18} duration={800}>
              <Zap size={13} color="#bf5af2" fill="#bf5af2" />
            </PulseView>
          : <CheckCircle size={13} color="#34d399" />
        }
        <Text style={[ss.planLabel, { color: done ? '#34d399' : '#bf5af2' }]}>
          {done ? 'Plan ready — 3.1 seconds' : 'AI Coach — Building your plan...'}
        </Text>
      </View>

      {PLAN.slice(0, visible).map((item, i) => (
        <FadeIn key={item.day} delay={0} duration={200} fromY={8}>
          <View style={[ss.planRow, i > 0 && ss.planRowBorder]}>
            <Text style={ss.planDay}>{item.day}</Text>
            <Text style={ss.planName}>{item.name}</Text>
            <Text style={ss.planDur}>{item.dur}</Text>
          </View>
        </FadeIn>
      ))}

      {done && (
        <FadeIn delay={0} duration={280} fromY={6}>
          <View style={ss.planFooter}>
            <View style={ss.greenDot} />
            <Text style={ss.planReady}>Generated for your profile</Text>
          </View>
        </FadeIn>
      )}
    </GlassCard>
  );
}

// ─── Scene 2: calendar dot grid ───────────────────────────────────────────────
const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
const DAY_LABELS  = ['M',  'T',  'W',  'T',  'F',  'S',  'S'];

function CalendarGrid() {
  const [filled, setFilled] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let c = 0;
    const iv = setInterval(() => { c++; setFilled(c); if (c >= 42) clearInterval(iv); }, 52);

    const streakAnim = new Animated.Value(0);
    let streakRef: Animated.CompositeAnimation;
    const id = streakAnim.addListener(({ value }) => setStreak(Math.round(value)));
    const t = setTimeout(() => {
      streakRef = Animated.timing(streakAnim, { toValue: 28, duration: 2100, useNativeDriver: false });
      streakRef.start();
    }, 350);

    return () => { clearInterval(iv); clearTimeout(t); streakRef?.stop(); streakAnim.removeListener(id); };
  }, []);

  return (
    <FadeIn fromY={24} duration={360}>
      <View style={{ alignItems: 'center', gap: 22 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {/* Week labels */}
          <View style={{ gap: 6 }}>
            {WEEK_LABELS.map((w) => (
              <Text key={w} style={ss.weekLabel}>{w}</Text>
            ))}
          </View>
          {/* Dot grid */}
          <View style={{ gap: 6 }}>
            {Array.from({ length: 6 }).map((_, row) => (
              <View key={row} style={{ flexDirection: 'row', gap: 6 }}>
                {Array.from({ length: 7 }).map((_, col) => {
                  const lit = row * 7 + col < filled;
                  return (
                    <View key={col} style={[ss.calDot, {
                      backgroundColor: lit ? '#FF6B35' : 'rgba(255,255,255,0.06)',
                      shadowColor:     lit ? '#FF6B35' : undefined,
                      shadowOpacity:   lit ? 0.7 : 0,
                      shadowRadius:    lit ? 5 : 0,
                    }]} />
                  );
                })}
              </View>
            ))}
          </View>
          {/* Day labels (vertical, one per row) */}
          <View style={{ gap: 6 }}>
            {DAY_LABELS.map((d, i) => (
              <Text key={i} style={ss.dayLabel}>{d}</Text>
            ))}
          </View>
        </View>

        <View style={{ alignItems: 'center', gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Flame size={20} color="#FF6B35" fill="#FF6B35" />
            <Text style={ss.streakNum}>{streak}</Text>
          </View>
          <Text style={ss.streakLabel}>DAY STREAK</Text>
        </View>
      </View>
    </FadeIn>
  );
}

// ─── Scene 3: count-up stats ──────────────────────────────────────────────────
function StatBox({ to, label, color, delay = 0, prefix = '' }: {
  to: number; label: string; color: string; delay?: number; prefix?: string;
}) {
  const [v, setV] = useState(0);

  useEffect(() => {
    const anim = new Animated.Value(0);
    let ref: Animated.CompositeAnimation;
    const id = anim.addListener(({ value }) => setV(Math.round(value)));
    const t = setTimeout(() => {
      ref = Animated.timing(anim, { toValue: to, duration: 1900, useNativeDriver: false });
      ref.start();
    }, delay);
    return () => { clearTimeout(t); ref?.stop(); anim.removeListener(id); };
  }, []);

  return (
    <FadeIn delay={delay} duration={300} fromY={22} fromScale={0.88}>
      <View style={ss.statBox}>
        <Text style={[ss.statNum, { color }]}>{prefix}{v}</Text>
        <Text style={ss.statLabel}>{label}</Text>
      </View>
    </FadeIn>
  );
}

function StatsScene() {
  return (
    <View style={{ width: W - 44 }}>
      <StatBox to={38} label="WORKOUTS COMPLETED" color="#FF6B35" delay={0}   />
      <View style={ss.statDivider} />
      <StatBox to={14} label="DAY STREAK"         color="#00d4ff" delay={220} />
      <View style={ss.statDivider} />
      <StatBox to={12} label="LBS LOST"           color="#34d399" delay={440} prefix="-" />
    </View>
  );
}

// ─── Scene 4 extras ───────────────────────────────────────────────────────────
function RingLegend() {
  return (
    <FadeIn delay={900} duration={380} fromY={10}>
      <View style={{ flexDirection: 'row', gap: 18, justifyContent: 'center' }}>
        {[['#FF6B35','Strength'],['#bf5af2','Mobility'],['#00d4ff','Cardio']].map(([color, label]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
            <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>{label}</Text>
          </View>
        ))}
      </View>
    </FadeIn>
  );
}

function AchievementCTA({ onPress }: { onPress: () => void }) {
  return (
    <FadeIn delay={1600} duration={500} fromY={28} fromScale={0.92}>
      <AnimatedPressable onPress={onPress} scaleDown={0.94}>
        <LinearGradient
          colors={['#FF6B35', '#ff2d55']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={ss.ctaBtn}
        >
          <Play size={17} color="#fff" fill="#fff" />
          <Text style={ss.ctaText}>Start Your Transformation</Text>
        </LinearGradient>
      </AnimatedPressable>
    </FadeIn>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ current }: { current: number }) {
  return (
    <View style={ss.dotsRow}>
      {SCENES.map((s, i) => (
        <View key={s.id} style={[ss.dotsItem, {
          flex: i === current ? 2.4 : 1,
          backgroundColor: i <= current ? SCENES[i].accent : 'rgba(255,255,255,0.10)',
          opacity: i <= current ? 1 : 0.38,
        }]} />
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export function StoryScreen({ navigation }: Props) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const captionAnim = useRef(new Animated.Value(1)).current;
  const flashAnim   = useRef(new Animated.Value(0)).current;

  const advance = useCallback(() => {
    if (sceneIndex >= SCENES.length - 1) return;
    Animated.timing(captionAnim, { toValue: 0, duration: 240, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.48, duration: 110, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0,    duration: 320, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      setSceneIndex((i) => i + 1);
      Animated.timing(captionAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 150);
  }, [sceneIndex]);

  useEffect(() => {
    const dur = SCENES[sceneIndex].duration;
    if (dur === Infinity) return;
    const t = setTimeout(advance, dur);
    return () => clearTimeout(t);
  }, [sceneIndex]);

  const scene = SCENES[sceneIndex];

  return (
    <View style={ss.root}>
      <WorkflowGL width={W} height={H} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: scene.tint }]} pointerEvents="none" />
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#fff', opacity: flashAnim }]} pointerEvents="none" />

      <SafeAreaView style={ss.safe} edges={['top', 'bottom']}>
        {/* Top bar */}
        <View style={ss.topBar}>
          <ProgressDots current={sceneIndex} />
          <AnimatedPressable onPress={() => navigation.goBack()} scaleDown={0.86}>
            <View style={ss.closeBtn}>
              <X size={13} color="rgba(255,255,255,0.40)" strokeWidth={2.5} />
            </View>
          </AnimatedPressable>
        </View>

        {/* Eyebrow */}
        <Animated.View style={[ss.eyebrowRow, { opacity: captionAnim }]}>
          <Text style={[ss.eyebrow, { color: scene.accent }]}>{scene.eyebrow}</Text>
        </Animated.View>

        {/* Hero visual */}
        <View style={ss.hero}>
          {sceneIndex === 0 && (
            <FadeIn fromY={0} fromScale={0.88} duration={600}>
              <ConcentricRings plateau />
            </FadeIn>
          )}
          {sceneIndex === 1 && <AIPlanCard />}
          {sceneIndex === 2 && <CalendarGrid />}
          {sceneIndex === 3 && <StatsScene />}
          {sceneIndex === 4 && (
            <View style={{ alignItems: 'center', gap: 22 }}>
              <FadeIn fromY={0} fromScale={0.84} duration={700}>
                <ConcentricRings plateau={false} />
              </FadeIn>
              <RingLegend />
              <AchievementCTA onPress={() => navigation.goBack()} />
            </View>
          )}
        </View>

        {/* Caption */}
        <Animated.View style={[ss.caption, { opacity: captionAnim }]}>
          <View style={[ss.accentBar, { backgroundColor: scene.accent }]} />
          <Text style={ss.headline}>{scene.headline}</Text>
          {scene.sub && <Text style={ss.sub}>{scene.sub}</Text>}
          {sceneIndex < SCENES.length - 1 && (
            <AnimatedPressable onPress={advance} scaleDown={0.9} style={{ marginTop: 18, alignSelf: 'flex-start' }}>
              <Text style={ss.skipHint}>tap to continue</Text>
            </AnimatedPressable>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07070f' },
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10, gap: 14,
  },
  dotsRow:  { flex: 1, flexDirection: 'row', gap: 5, height: 3 },
  dotsItem: { height: 3, borderRadius: 2 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },

  eyebrowRow: { paddingHorizontal: 28, marginBottom: 8 },
  eyebrow:    { fontSize: 10, fontWeight: '800', letterSpacing: 3.5, textTransform: 'uppercase' },

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },

  caption:    { paddingHorizontal: 28, paddingBottom: 4 },
  accentBar:  { width: 22, height: 3, borderRadius: 2, marginBottom: 16 },
  headline: {
    color: '#fff', fontSize: 34, fontWeight: '900',
    lineHeight: 40, letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  sub:      { color: 'rgba(255,255,255,0.36)', fontSize: 14, lineHeight: 21, marginTop: 10 },
  skipHint: { color: 'rgba(255,255,255,0.18)', fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase' },

  // Plan card
  planHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  planLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  planRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  planRowBorder:{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.05)' },
  planDay:      { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '700', width: 30, letterSpacing: 0.5 },
  planName:     { color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 },
  planDur:      { color: 'rgba(255,255,255,0.25)', fontSize: 11 },
  planFooter:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  greenDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },
  planReady:    { color: '#34d399', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  // Calendar
  calDot:     { width: 16, height: 16, borderRadius: 4 },
  weekLabel:  { color: 'rgba(255,255,255,0.18)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, lineHeight: 16, textAlign: 'right', width: 18 },
  dayLabel:   { color: 'rgba(255,255,255,0.18)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, lineHeight: 16, textAlign: 'center', width: 16 },
  streakNum:  { color: '#FF6B35', fontSize: 46, fontWeight: '900', letterSpacing: -1, lineHeight: 50 },
  streakLabel:{ color: 'rgba(255,255,255,0.28)', fontSize: 9, fontWeight: '800', letterSpacing: 3 },

  // Stats
  statBox:    { paddingVertical: 14 },
  statNum:    { fontSize: 58, fontWeight: '900', letterSpacing: -2.5, lineHeight: 62 },
  statLabel:  { color: 'rgba(255,255,255,0.28)', fontSize: 9, fontWeight: '800', letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 2 },
  statDivider:{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.07)' },

  // CTA
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 26, paddingVertical: 18, paddingHorizontal: 28,
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55, shadowRadius: 26,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
});
