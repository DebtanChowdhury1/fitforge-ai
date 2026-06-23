import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  ActivityIndicator, Animated, Dimensions, StyleSheet, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Play, Flame, Dumbbell, Moon, Zap, User,
  CheckCircle, XCircle, Clock, TrendingUp, ChevronRight,
  Calendar, AlertCircle, Target, MessageCircle, BarChart3,
  Sparkles, Award, BookOpen, Coffee, Heart, Lightbulb,
} from 'lucide-react-native';
import { useAuthStore }    from '../../store/authStore';
import { usePlanStore, isRoadmapPlan, getWeekEntries, getTodayEntry } from '../../store/planStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { calcStreak }      from '../../lib/calcStreak';
import { supabase }        from '../../lib/supabase';
import { AnimatedRing }    from '../../components/AnimatedRing';
import { GlassCard }       from '../../components/GlassCard';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FadeIn }          from '../../components/FadeIn';
import { PulseView }       from '../../components/PulseView';
import { WorkflowGL }      from '../../components/gl/WorkflowGL';
import { HomeStackParamList, UserPlan, RoadmapDay, AnyPlanJson } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Dashboard'>;
const { width, height: screenHeight } = Dimensions.get('window');

const WEEK_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const GOAL_COLORS: Record<string, string> = {
  weight_loss: '#ff2d55', muscle_gain: '#bf5af2',
  endurance: '#00d4ff',  general_fitness: '#34d399',
};

const DAILY_TIPS = [
  { icon: Lightbulb, color: '#ff8c00', tip: 'Progressive overload — add just 2.5 kg or 1 rep each week. That small step compounds into serious strength over months.' },
  { icon: Coffee, color: '#00d4ff', tip: 'Caffeine 30-45 minutes before training increases power output by up to 11%. Time your coffee strategically.' },
  { icon: Heart, color: '#ff2d55', tip: 'Sleep is where muscle is actually built. 7-9 hours is non-negotiable — no supplement replaces quality sleep.' },
  { icon: Zap, color: '#bf5af2', tip: 'Compound movements first, isolation last. Your best energy should go to squats, deadlifts, and press — not curls.' },
  { icon: Target, color: '#34d399', tip: 'Protein synthesis stays elevated for 24-48 hours post workout. Your "off" days are when the real growth happens.' },
  { icon: Award, color: '#FF6B35', tip: 'Consistency beats perfection. A 70% workout every day beats a 100% workout once a week — every single time.' },
];

const FEATURED_EXERCISES = [
  { name: 'Pull-Up', category: 'Back', desc: 'The benchmark for upper body strength', color: '#00d4ff' },
  { name: 'Hip Thrust', category: 'Glutes', desc: 'Highest glute activation of any exercise', color: '#bf5af2' },
  { name: 'Lateral Raise', category: 'Shoulders', desc: 'The move that makes shoulders visually wider', color: '#ff8c00' },
];

function getDayIndex() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Still grinding?';
  if (h < 12) return 'Rise & Forge';
  if (h < 17) return 'Afternoon session';
  if (h < 20) return 'Evening warrior';
  return 'Night forger';
}

// ── Weekly dot ────────────────────────────────────────────────────────────────

function WeekDayDot({
  label, dateStr, day, isToday, onPress,
}: {
  label: string; dateStr: string; day?: RoadmapDay; isToday: boolean; onPress?: () => void;
}) {
  const isPast   = dateStr < new Date().toISOString().split('T')[0];
  const isRest   = day?.day_type === 'rest';
  const done     = day?.status === 'completed';
  const partial  = day?.status === 'partial';
  const missed   = day?.status === 'missed' && isPast;
  const upcoming = !isPast && day?.day_type === 'workout';

  let dotColor = 'rgba(255,255,255,0.08)';
  let dotBorder = 'rgba(255,255,255,0.1)';
  let innerContent: React.ReactNode = null;

  if (isToday) {
    dotColor  = 'rgba(255,107,53,0.2)';
    dotBorder = '#FF6B35';
    innerContent = <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B35' }} />;
  } else if (done) {
    dotColor  = 'rgba(52,211,153,0.2)';
    dotBorder = '#34d399';
    innerContent = <CheckCircle size={14} color="#34d399" strokeWidth={2.5} />;
  } else if (partial) {
    dotColor  = 'rgba(255,140,0,0.15)';
    dotBorder = '#ff8c00';
    innerContent = <AlertCircle size={14} color="#ff8c00" strokeWidth={2.5} />;
  } else if (missed) {
    dotColor  = 'rgba(255,59,48,0.12)';
    dotBorder = '#ff3b30';
    innerContent = <XCircle size={14} color="#ff3b30" strokeWidth={2} />;
  } else if (isRest && isPast) {
    dotColor  = 'rgba(255,255,255,0.05)';
    dotBorder = 'rgba(255,255,255,0.08)';
    innerContent = <Moon size={12} color="rgba(255,255,255,0.2)" />;
  } else if (upcoming) {
    dotColor  = 'rgba(255,255,255,0.04)';
    dotBorder = 'rgba(255,255,255,0.15)';
    innerContent = <Dumbbell size={12} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />;
  }

  return (
    <AnimatedPressable onPress={onPress} scaleDown={0.88} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
      <View style={{
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: dotColor, borderWidth: isToday ? 2 : 1.5,
        borderColor: dotBorder, alignItems: 'center', justifyContent: 'center',
      }}>
        {innerContent}
      </View>
      <Text style={{ color: isToday ? '#FF6B35' : 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: isToday ? '800' : '600' }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

// ── No-plan home content ──────────────────────────────────────────────────────

function NoPlanHome({ navigation, userName, streak, totalVolume, totalWorkouts, logs }: {
  navigation: any;
  userName: string;
  streak: number;
  totalVolume: number;
  totalWorkouts: number;
  logs: any[];
}) {
  const todayTip = DAILY_TIPS[new Date().getDay() % DAILY_TIPS.length];
  const TipIcon = todayTip.icon;

  const weekSessions = logs.filter(
    (l) => (Date.now() - new Date(l.date).getTime()) / 86400000 <= 7,
  ).length;

  return (
    <>
      {/* ── Hero CTA ── */}
      <FadeIn delay={80} style={{ paddingHorizontal: 20, marginTop: 14 }}>
        <LinearGradient
          colors={['#1a0a00', '#2a1100', '#1a0800']}
          style={{ borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)' }}
        >
          <PulseView minScale={0.92} maxScale={1.08} duration={2200}>
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: 'rgba(255,107,53,0.18)', borderWidth: 1,
              borderColor: 'rgba(255,107,53,0.35)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Sparkles size={30} color="#FF6B35" strokeWidth={1.5} />
            </View>
          </PulseView>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.4, lineHeight: 28 }}>
            Your transformation{'\n'}starts with one plan.
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 10, lineHeight: 21 }}>
            ForgeAI builds a personalised training program around your schedule, goals, and current level. No guesswork.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <AnimatedPressable
              scaleDown={0.95}
              onPress={() => navigation.getParent()?.navigate('Plan')}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={['#FF6B35', '#ff2d55']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Build My Plan</Text>
              </LinearGradient>
            </AnimatedPressable>
            <AnimatedPressable
              scaleDown={0.95}
              onPress={() => navigation.getParent()?.navigate('AI')}
              style={{ flex: 1 }}
            >
              <View style={{
                borderRadius: 14, paddingVertical: 14, alignItems: 'center',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700' }}>Ask Coach</Text>
              </View>
            </AnimatedPressable>
          </View>
        </LinearGradient>
      </FadeIn>

      {/* ── Quick actions ── */}
      <FadeIn delay={140} style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <Text style={ss.sectionLabel}>Explore</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { icon: BookOpen, label: 'Exercise\nLibrary', color: '#00d4ff', tab: 'Library' },
            { icon: BarChart3, label: 'My\nProgress', color: '#bf5af2', tab: 'Progress' },
            { icon: MessageCircle, label: 'AI\nCoach', color: '#34d399', tab: 'AI' },
          ].map(({ icon: Icon, label, color, tab }) => (
            <AnimatedPressable
              key={tab}
              scaleDown={0.93}
              onPress={() => navigation.getParent()?.navigate(tab)}
              style={{ flex: 1 }}
            >
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18,
                padding: 16, alignItems: 'center', gap: 10,
              }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: color + '18', borderWidth: 1,
                  borderColor: color + '35', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color={color} strokeWidth={1.8} />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 16 }}>{label}</Text>
              </View>
            </AnimatedPressable>
          ))}
        </View>
      </FadeIn>

      {/* ── Stats ── */}
      <FadeIn delay={190} style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <Text style={ss.sectionLabel}>Your Stats</Text>
        <GlassCard noEntrance style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <AnimatedRing progress={Math.min(weekSessions / 4, 1)} size={80} strokeWidth={8} color="#FF6B35" color2="#ff8c00" value={`${weekSessions}`} label="This Week" gradientId="np_ring1" />
            <AnimatedRing progress={Math.min(streak / 7, 1)} size={80} strokeWidth={8} color="#bf5af2" color2="#5e5ce6" value={`${streak}`} label="Streak" gradientId="np_ring2" />
            <AnimatedRing progress={totalWorkouts > 0 ? Math.min(totalWorkouts / 50, 1) : 0} size={80} strokeWidth={8} color="#00d4ff" color2="#0084ff" value={`${totalWorkouts}`} label="Sessions" gradientId="np_ring3" />
          </View>
          {totalWorkouts === 0 && (
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                Your stats will populate as you train. Build your plan and start logging.
              </Text>
            </View>
          )}
        </GlassCard>
      </FadeIn>

      {/* ── Today's Insight (1 best + View All) ── */}
      <FadeIn delay={240} style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={ss.sectionLabel}>Today's Insight</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('HealthInsights')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ color: '#FF6B35', fontSize: 12, fontWeight: '700' }}>Health Feed</Text>
            <ChevronRight size={14} color="#FF6B35" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.navigate('HealthInsights')}
        >
          <LinearGradient
            colors={[todayTip.color + '28', todayTip.color + '0a', 'rgba(0,0,0,0)']}
            style={{
              borderWidth: 1, borderColor: todayTip.color + '35',
              borderRadius: 22, padding: 20, gap: 14,
            }}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <View style={{
                width: 48, height: 48, borderRadius: 15,
                backgroundColor: todayTip.color + '20', borderWidth: 1,
                borderColor: todayTip.color + '40', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <TipIcon size={22} color={todayTip.color} strokeWidth={1.7} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: todayTip.color, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 5 }}>
                  DAILY INSIGHT
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 21 }}>
                  {todayTip.tip}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              <Text style={{ color: todayTip.color, fontSize: 12, fontWeight: '700' }}>View all 24 insights</Text>
              <ChevronRight size={13} color={todayTip.color} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </FadeIn>

      {/* ── Featured exercises ── */}
      <FadeIn delay={290} style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={ss.sectionLabel}>Featured Moves</Text>
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Library')}>
            <Text style={{ color: '#FF6B35', fontSize: 12, fontWeight: '700' }}>Browse all</Text>
          </TouchableOpacity>
        </View>
        <View style={{ gap: 8 }}>
          {FEATURED_EXERCISES.map((ex) => (
            <AnimatedPressable
              key={ex.name}
              scaleDown={0.97}
              onPress={() => navigation.getParent()?.navigate('Library')}
            >
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 14,
              }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: ex.color + '18', borderWidth: 1,
                  borderColor: ex.color + '35', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Dumbbell size={20} color={ex.color} strokeWidth={1.6} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{ex.name}</Text>
                  <Text style={{ color: ex.color, fontSize: 11, fontWeight: '700', marginTop: 1 }}>{ex.category}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, marginTop: 3 }} numberOfLines={1}>{ex.desc}</Text>
                </View>
                <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
              </View>
            </AnimatedPressable>
          ))}
        </View>
      </FadeIn>

      {/* ── Bottom CTA ── */}
      <FadeIn delay={340} style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <View style={{
          backgroundColor: 'rgba(191,90,242,0.08)', borderWidth: 1,
          borderColor: 'rgba(191,90,242,0.2)', borderRadius: 20, padding: 20,
          flexDirection: 'row', alignItems: 'center', gap: 14,
        }}>
          <View style={{
            width: 48, height: 48, borderRadius: 14,
            backgroundColor: 'rgba(191,90,242,0.18)', borderWidth: 1,
            borderColor: 'rgba(191,90,242,0.35)', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageCircle size={22} color="#bf5af2" strokeWidth={1.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Not sure where to start?</Text>
            <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, marginTop: 2, lineHeight: 17 }}>
              Talk to your AI coach — describe your goal and it will guide you
            </Text>
          </View>
          <AnimatedPressable scaleDown={0.92} onPress={() => navigation.getParent()?.navigate('AI')}>
            <LinearGradient colors={['#bf5af2', '#5e5ce6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Chat</Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </FadeIn>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function HomeScreen({ navigation }: Props) {
  const { user }      = useAuthStore();
  const { currentPlan, isGenerating, setCurrentPlan, plans, setPlans, getActiveRoadmap } = usePlanStore();
  const { logs, setLogs } = useWorkoutStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [planRes, logsRes, roadmapRes] = await Promise.all([
      supabase.from('workout_plans').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('workout_logs').select('*').eq('user_id', user.id)
        .order('date', { ascending: false }).limit(30),
      supabase.from('workout_plans').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    if (planRes.data) setCurrentPlan(planRes.data);
    if (logsRes.data) setLogs(logsRes.data);
    if (roadmapRes.data) {
      const roadmaps = (roadmapRes.data as any[]).filter((p) => p.plan_json?.plan_type === 'roadmap');
      setPlans(roadmaps);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const displayName = (user?.user_metadata?.display_name as string) || user?.email?.split('@')[0] || 'Athlete';
  const firstName   = displayName.split(' ')[0];
  const streak      = calcStreak(logs);
  const totalVolume = logs.reduce((sum, log) =>
    sum + (log.exercises_json ?? []).reduce((s: number, ex: any) =>
      s + (ex.actual_sets ?? []).reduce((ss: number, set: any) => ss + set.reps * set.weight, 0), 0), 0);
  const totalWorkouts = logs.length;

  // Use ONLY roadmap plan — no legacy fallback that confuses users
  const activeRoadmap = getActiveRoadmap();
  const todayRoadmap  = activeRoadmap ? getTodayEntry(activeRoadmap) : null;
  const goalColor     = activeRoadmap ? (GOAL_COLORS[activeRoadmap.goal_type] ?? '#FF6B35') : '#FF6B35';

  const weekGoal        = activeRoadmap ? activeRoadmap.goal_details.days_per_week : 4;
  const weekSessions    = logs.filter((l) => (Date.now() - new Date(l.date).getTime()) / 86400000 <= 7).length;
  const thisWeekRoadmap = activeRoadmap ? getWeekEntries(activeRoadmap, 0) : [];
  const nextWeekRoadmap = activeRoadmap ? getWeekEntries(activeRoadmap, 1) : [];
  const todayStr        = new Date().toISOString().split('T')[0];

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - getDayIndex() + i);
    const dateStr = d.toISOString().split('T')[0];
    const roadmapDay = thisWeekRoadmap.find((r) => r.date === dateStr);
    return { label: WEEK_DAYS[i].slice(0, 3), dateStr, day: roadmapDay, isToday: dateStr === todayStr };
  });

  const nextWeekWorkouts = nextWeekRoadmap.filter((d) => d.day_type === 'workout');

  return (
    <View style={{ flex: 1 }}>
      <WorkflowGL width={width} height={screenHeight} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.44)' }]} pointerEvents="none" />

      <View style={StyleSheet.absoluteFillObject}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
            contentContainerStyle={{ paddingBottom: 48 }}
          >
            {/* ── Header ── */}
            <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase' }}>
                    {getGreeting()}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 }}>
                    {firstName}
                  </Text>
                  {streak > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <Flame size={13} color="#FF6B35" />
                      <Text style={{ color: '#FF6B35', fontSize: 12, fontWeight: '700' }}>{streak}-day streak</Text>
                    </View>
                  )}
                </View>
                <AnimatedPressable onPress={() => navigation.navigate('Profile')} scaleDown={0.90}>
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,107,53,0.15)', borderWidth: 1, borderColor: 'rgba(255,107,53,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={22} color="#FF6B35" strokeWidth={2} />
                  </View>
                </AnimatedPressable>
              </View>
            </Animated.View>

            {/* ── Story / Video banner ── */}
            <FadeIn delay={40} fromX={-24} fromY={0} style={{ paddingHorizontal: 20, marginTop: 12, marginBottom: 4 }}>
              <AnimatedPressable onPress={() => navigation.navigate('WatchDemo')} scaleDown={0.96}>
                <LinearGradient
                  colors={['rgba(255,107,53,0.18)', 'rgba(191,90,242,0.14)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 18, borderWidth: 1,
                    borderColor: 'rgba(255,107,53,0.22)',
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
                  }}
                >
                  <PulseView minScale={0.88} maxScale={1.12} duration={1100}>
                    <View style={{
                      width: 38, height: 38, borderRadius: 12,
                      backgroundColor: 'rgba(255,107,53,0.2)',
                      borderWidth: 1, borderColor: 'rgba(255,107,53,0.3)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Play size={16} color="#FF6B35" fill="#FF6B35" />
                    </View>
                  </PulseView>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>See the transformation</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, marginTop: 1 }}>
                      Watch how FitForge AI changes lives
                    </Text>
                  </View>
                  <Text style={{ color: '#FF6B35', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>PLAY</Text>
                </LinearGradient>
              </AnimatedPressable>
            </FadeIn>

            {/* ── BRANCH: no plan vs has plan ── */}
            {!activeRoadmap ? (
              <NoPlanHome
                navigation={navigation}
                userName={firstName}
                streak={streak}
                totalVolume={totalVolume}
                totalWorkouts={totalWorkouts}
                logs={logs}
              />
            ) : (
              <>
                {/* ── Today's Focus Session ── */}
                <FadeIn delay={80} style={{ paddingHorizontal: 20, marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={ss.sectionLabel}>Today's Focus Session</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                      {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                    </Text>
                  </View>

                  {isGenerating ? (
                    <GlassCard noEntrance style={{ alignItems: 'center', paddingVertical: 40 }}>
                      <PulseView><ActivityIndicator color="#FF6B35" size="large" /></PulseView>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 14 }}>Generating your plan...</Text>
                    </GlassCard>

                  ) : todayRoadmap && todayRoadmap.day_type !== 'rest' ? (
                    <AnimatedPressable
                      onPress={() => {
                        const activePlanRow = plans.find((p) => (p.plan_json as AnyPlanJson as UserPlan).plan_type === 'roadmap' && (p.plan_json as UserPlan).status === 'active');
                        if (activePlanRow) navigation.getParent()?.navigate('Plan', { screen: 'DayLog', params: { planId: activePlanRow.id, date: todayStr } });
                      }}
                      scaleDown={0.97}
                    >
                      <View style={{ borderRadius: 24, overflow: 'hidden', shadowColor: goalColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 24, elevation: 12 }}>
                        <LinearGradient
                          colors={['#120a00', '#1e0f00', '#160a00']}
                          style={{ padding: 22 }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                <View style={[ss.tagPill, { backgroundColor: goalColor + '20', borderColor: goalColor + '40' }]}>
                                  <Text style={[ss.tagText, { color: goalColor }]}>{activeRoadmap.name}</Text>
                                </View>
                                {todayRoadmap.status === 'completed' && (
                                  <View style={[ss.tagPill, { backgroundColor: '#34d39920', borderColor: '#34d39940' }]}>
                                    <CheckCircle size={10} color="#34d399" />
                                    <Text style={[ss.tagText, { color: '#34d399' }]}>Done</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={{ color: '#FF6B35', fontSize: 11, letterSpacing: 1.5, fontWeight: '700', textTransform: 'uppercase' }}>
                                Week {todayRoadmap.week_number}
                              </Text>
                              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 }}>
                                {todayRoadmap.focus}
                              </Text>
                            </View>
                            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,107,53,0.2)', borderWidth: 1, borderColor: 'rgba(255,107,53,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                              {todayRoadmap.status === 'completed'
                                ? <CheckCircle size={24} color="#34d399" />
                                : <Play size={24} color="#FF6B35" fill="#FF6B35" />}
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                            {todayRoadmap.exercises.slice(0, 4).map((ex, i) => (
                              <FadeIn key={i} delay={200 + i * 50} fromY={6} fromScale={0.9}>
                                <View style={ss.exPill}>
                                  <Text style={ss.exPillText}>{ex.name}</Text>
                                </View>
                              </FadeIn>
                            ))}
                            {todayRoadmap.exercises.length > 4 && (
                              <View style={[ss.exPill, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>+{todayRoadmap.exercises.length - 4} more</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 18 }}>
                            <View style={ss.metaItem}>
                              <Dumbbell size={12} color="rgba(255,255,255,0.4)" />
                              <Text style={ss.metaText}>{todayRoadmap.exercises.length} exercises</Text>
                            </View>
                            {todayRoadmap.cardio && (
                              <View style={ss.metaItem}>
                                <Flame size={12} color="rgba(255,255,255,0.4)" />
                                <Text style={ss.metaText}>{todayRoadmap.cardio.duration}min cardio</Text>
                              </View>
                            )}
                            <View style={ss.metaItem}>
                              <ChevronRight size={12} color="#FF6B35" />
                              <Text style={[ss.metaText, { color: '#FF6B35' }]}>Log session</Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </View>
                    </AnimatedPressable>
                  ) : (
                    <GlassCard noEntrance style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
                      <Moon size={40} color="rgba(255,255,255,0.2)" strokeWidth={1.2} />
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Rest Day</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, lineHeight: 19, textAlign: 'center', paddingHorizontal: 20 }}>
                        Recovery is where the muscle grows. Use today for sleep, light movement, and nutrition.
                      </Text>
                    </GlassCard>
                  )}
                </FadeIn>

                {/* ── Weekly Activity Grid ── */}
                <FadeIn delay={130} style={{ paddingHorizontal: 20, marginTop: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <Text style={ss.sectionLabel}>This Week</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
                      {thisWeekRoadmap.filter((d) => d.status === 'completed').length}/
                      {thisWeekRoadmap.filter((d) => d.day_type === 'workout').length} sessions done
                    </Text>
                  </View>
                  <View style={ss.weekGrid}>
                    {weekDays.map(({ label, dateStr, day, isToday }) => (
                      <WeekDayDot
                        key={dateStr}
                        label={label}
                        dateStr={dateStr}
                        day={day}
                        isToday={isToday}
                        onPress={day ? () => {
                          const activePlanRow = plans.find((p) => p.plan_json && (p.plan_json as any).plan_type === 'roadmap' && (p.plan_json as any).status === 'active');
                          if (activePlanRow) navigation.getParent()?.navigate('Plan', { screen: 'DayLog', params: { planId: activePlanRow.id, date: dateStr } });
                        } : undefined}
                      />
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
                    {[
                      { color: '#34d399', label: 'Done' },
                      { color: '#ff8c00', label: 'Partial' },
                      { color: '#ff3b30', label: 'Missed' },
                      { color: '#FF6B35', label: 'Today' },
                    ].map(({ color, label }) => (
                      <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </FadeIn>

                {/* ── Weekly Summary Stats ── */}
                <FadeIn delay={190} style={{ paddingHorizontal: 20, marginTop: 22 }}>
                  <Text style={[ss.sectionLabel, { marginBottom: 14 }]}>Weekly Summary</Text>
                  <GlassCard noEntrance style={{ padding: 18 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 16 }}>
                      <View style={{ flex: 1 }}>
                        <AnimatedRing progress={weekGoal > 0 ? weekSessions / weekGoal : 0} size={82} strokeWidth={9} color="#FF6B35" color2="#ff8c00" value={`${weekSessions}`} label="Sessions" gradientId="ring1" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AnimatedRing progress={Math.min(streak / 7, 1)} size={82} strokeWidth={9} color="#bf5af2" color2="#0084ff" value={`${streak}`} label="Streak" gradientId="ring2" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AnimatedRing progress={totalVolume > 0 ? Math.min(totalVolume / 50000, 1) : 0} size={82} strokeWidth={9} color="#00d4ff" color2="#0084ff" value={totalVolume > 999 ? `${Math.round(totalVolume / 1000)}k` : `${Math.round(totalVolume)}`} label="Volume" gradientId="ring3" />
                      </View>
                    </View>
                    {thisWeekRoadmap.some((d) => d.status === 'completed' || d.status === 'partial') && (
                      <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 14 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                          Completed This Week
                        </Text>
                        {thisWeekRoadmap.filter((d) => d.status === 'completed' || d.status === 'partial').map((d) => (
                          <View key={d.date} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <CheckCircle size={12} color={d.status === 'completed' ? '#34d399' : '#ff8c00'} />
                            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }} numberOfLines={1}>
                              {new Date(d.date).toLocaleDateString([], { weekday: 'short' })} · {d.focus}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginLeft: 'auto' }}>
                              {d.user_log?.completion_percentage ?? 0}%
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </GlassCard>
                </FadeIn>

                {/* ── Upcoming Week Preview ── */}
                {nextWeekWorkouts.length > 0 && (
                  <FadeIn delay={250} style={{ paddingHorizontal: 20, marginTop: 22 }}>
                    <Text style={[ss.sectionLabel, { marginBottom: 12 }]}>Next Week Preview</Text>
                    <View style={{ gap: 7 }}>
                      {nextWeekWorkouts.slice(0, 4).map((day, i) => (
                        <FadeIn key={day.date} delay={270 + i * 50} fromX={20} fromY={0}>
                          <View style={ss.upcomingRow}>
                            <View style={ss.upcomingDate}>
                              <Text style={ss.upcomingDOW}>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                              <Text style={ss.upcomingNum}>{new Date(day.date).getDate()}</Text>
                            </View>
                            <View style={{ flex: 1, paddingHorizontal: 12 }}>
                              <Text style={ss.upcomingFocus} numberOfLines={1}>{day.focus}</Text>
                              <Text style={ss.upcomingMeta}>{day.exercises.length} ex{day.cardio ? ` · ${day.cardio.duration}min cardio` : ''}</Text>
                            </View>
                            <TrendingUp size={14} color="rgba(255,255,255,0.2)" />
                          </View>
                        </FadeIn>
                      ))}
                      {nextWeekWorkouts.length > 4 && (
                        <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                          +{nextWeekWorkouts.length - 4} more sessions next week
                        </Text>
                      )}
                    </View>
                  </FadeIn>
                )}

                {/* ── Coach's Insight + Health Feed link ── */}
                {(() => {
                  const tip = DAILY_TIPS[new Date().getDay() % DAILY_TIPS.length];
                  const TipIcon = tip.icon;
                  return (
                    <FadeIn delay={310} style={{ paddingHorizontal: 20, marginTop: 22 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={ss.sectionLabel}>Coach's Insight</Text>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('HealthInsights')}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Text style={{ color: '#FF6B35', fontSize: 12, fontWeight: '700' }}>Health Feed</Text>
                          <ChevronRight size={14} color="#FF6B35" />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity activeOpacity={0.82} onPress={() => navigation.navigate('HealthInsights')}>
                        <LinearGradient
                          colors={[tip.color + '25', tip.color + '08', 'rgba(0,0,0,0)']}
                          style={{ borderWidth: 1, borderColor: tip.color + '35', borderRadius: 22, padding: 18, gap: 12 }}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                            <View style={{
                              width: 46, height: 46, borderRadius: 14,
                              backgroundColor: tip.color + '18', borderWidth: 1,
                              borderColor: tip.color + '38', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <TipIcon size={20} color={tip.color} strokeWidth={1.7} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: tip.color, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 }}>
                                DAILY INSIGHT
                              </Text>
                              <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 21 }}>{tip.tip}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            <Text style={{ color: tip.color, fontSize: 12, fontWeight: '700' }}>View all 24 insights</Text>
                            <ChevronRight size={13} color={tip.color} />
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    </FadeIn>
                  );
                })()}

                {/* ── Quick link to AI ── */}
                <FadeIn delay={360} style={{ paddingHorizontal: 20, marginTop: 16 }}>
                  <AnimatedPressable scaleDown={0.97} onPress={() => navigation.getParent()?.navigate('AI')}>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                      backgroundColor: 'rgba(191,90,242,0.07)', borderWidth: 1,
                      borderColor: 'rgba(191,90,242,0.18)', borderRadius: 18, padding: 16,
                    }}>
                      <View style={{
                        width: 42, height: 42, borderRadius: 13,
                        backgroundColor: 'rgba(191,90,242,0.18)', borderWidth: 1,
                        borderColor: 'rgba(191,90,242,0.3)', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <MessageCircle size={20} color="#bf5af2" strokeWidth={1.6} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Ask your AI coach</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>
                          Form checks, nutrition, recovery advice
                        </Text>
                      </View>
                      <ChevronRight size={16} color="rgba(191,90,242,0.5)" />
                    </View>
                  </AnimatedPressable>
                </FadeIn>
              </>
            )}

          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  sectionLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 11,
    letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700',
  },
  tagPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:   { fontSize: 10, fontWeight: '700' },
  exPill:    { backgroundColor: 'rgba(255,107,53,0.14)', borderWidth: 1, borderColor: 'rgba(255,107,53,0.28)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  exPillText: { color: '#ff8c00', fontSize: 11, fontWeight: '600' },
  metaItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:  { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  weekGrid:  { flexDirection: 'row', gap: 4, justifyContent: 'space-between' },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 12 },
  upcomingDate: { alignItems: 'center', width: 34 },
  upcomingDOW:  { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  upcomingNum:  { color: 'rgba(255,255,255,0.55)', fontSize: 18, fontWeight: '900' },
  upcomingFocus: { color: '#fff', fontSize: 13, fontWeight: '700' },
  upcomingMeta:  { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 1 },
});
