import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft, Moon, Apple, Zap, Dumbbell, Brain, Heart,
  Sparkles, RefreshCw, Calendar,
} from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../types';
import { FadeIn } from '../../components/FadeIn';
import { GradientBackground } from '../../components/GradientBackground';
import { supabase } from '../../lib/supabase';
import { usePlanStore, isRoadmapPlan } from '../../store/planStore';
import { useProfileStore } from '../../store/profileStore';

type Props = NativeStackScreenProps<HomeStackParamList, 'HealthInsights'>;
const { width: W } = Dimensions.get('window');

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = 'All' | 'Sleep' | 'Nutrition' | 'Recovery' | 'Strength' | 'Mindset' | 'Cardio';

interface Insight {
  id: string;
  category: Exclude<Category, 'All'>;
  title: string;
  body: string;
  emoji: string;
  readMin: number;
}

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<Exclude<Category, 'All'>, { color: string; color2: string; Icon: any }> = {
  Sleep:     { color: '#5e5ce6', color2: '#bf5af2', Icon: Moon     },
  Nutrition: { color: '#34d399', color2: '#059669', Icon: Apple    },
  Recovery:  { color: '#00d4ff', color2: '#0084ff', Icon: Zap      },
  Strength:  { color: '#FF6B35', color2: '#ff2d55', Icon: Dumbbell },
  Mindset:   { color: '#bf5af2', color2: '#5e5ce6', Icon: Brain    },
  Cardio:    { color: '#ff8c00', color2: '#FF6B35', Icon: Heart    },
};

const CATEGORIES: Category[] = ['All', 'Sleep', 'Nutrition', 'Recovery', 'Strength', 'Mindset', 'Cardio'];

const TODAY = new Date().toISOString().split('T')[0];
const CACHE_KEY = `health_insights_${TODAY}`;

// ── Cache helpers ─────────────────────────────────────────────────────────────

async function loadCached(): Promise<Insight[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function saveCache(insights: Insight[]) {
  try {
    // Clear yesterday's cache entries (keys from prior days)
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter((k) => k.startsWith('health_insights_') && k !== CACHE_KEY);
    if (stale.length) await AsyncStorage.multiRemove(stale);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(insights));
  } catch {}
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard({ index }: { index: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900 + index * 120, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900 + index * 120, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.14] });

  return (
    <View style={ss.card}>
      <Animated.View style={[ss.cardHeader, { opacity }]}>
        <LinearGradient colors={['#fff', '#fff']} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <View style={ss.cardBody}>
        <Animated.View style={[{ height: 18, borderRadius: 9, marginBottom: 10, width: '75%', backgroundColor: '#fff' }, { opacity }]} />
        <Animated.View style={[{ height: 12, borderRadius: 6, marginBottom: 6, backgroundColor: '#fff' }, { opacity }]} />
        <Animated.View style={[{ height: 12, borderRadius: 6, marginBottom: 6, width: '85%', backgroundColor: '#fff' }, { opacity }]} />
        <Animated.View style={[{ height: 12, borderRadius: 6, width: '60%', backgroundColor: '#fff' }, { opacity }]} />
      </View>
    </View>
  );
}

// ── Insight card ──────────────────────────────────────────────────────────────

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const cfg  = CATEGORY_CONFIG[insight.category] ?? CATEGORY_CONFIG.Strength;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 3000 + index * 150, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.96, duration: 3000 + index * 150, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <FadeIn delay={Math.min(index * 40, 400)} fromY={18} fromScale={0.96}>
      <View style={ss.card}>
        {/* Illustration header */}
        <View style={ss.cardHeader}>
          <LinearGradient
            colors={[cfg.color + '55', cfg.color2 + '25', '#09090e']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <View style={[ss.orb1, { backgroundColor: cfg.color + '35' }]} />
          <View style={[ss.orb2, { backgroundColor: cfg.color2 + '20' }]} />

          <View style={[ss.catBadge, { borderColor: cfg.color + '50', backgroundColor: cfg.color + '18' }]}>
            <cfg.Icon size={11} color={cfg.color} strokeWidth={2} />
            <Text style={[ss.catText, { color: cfg.color }]}>{insight.category.toUpperCase()}</Text>
          </View>

          <Animated.Text style={[ss.cardEmoji, { transform: [{ scale: pulse }] }]}>
            {insight.emoji}
          </Animated.Text>

          <Text style={ss.readTime}>{insight.readMin} min read</Text>
        </View>

        <View style={ss.cardBody}>
          <Text style={ss.cardTitle}>{insight.title}</Text>
          <Text style={ss.cardBodyText}>{insight.body}</Text>
        </View>
      </View>
    </FadeIn>
  );
}

// ── ForgeAI daily tip banner ──────────────────────────────────────────────────

const TIP_CACHE_KEY = `forge_tip_${TODAY}`;

function ForgeAIBanner({ goalContext }: { goalContext: string }) {
  const { profile }           = useProfileStore();
  const [tip, setTip]         = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  const fetchTip = useCallback(async (force = false) => {
    // Serve from cache unless forcing a refresh
    if (!force) {
      try {
        const cached = await AsyncStorage.getItem(TIP_CACHE_KEY);
        if (cached) { setTip(cached); return; }
      } catch {}
    }

    setLoading(true);
    spinLoop.current = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true }),
    );
    spinLoop.current.start();

    const profileSoFar = profile
      ? {
          goal: profile.goal,
          fitness_level: profile.fitness_level,
          equipment: profile.equipment,
          days_per_week: profile.days_per_week,
        }
      : {};

    try {
      const { data } = await supabase.functions.invoke('daily-insights', {
        body: {
          goalContext,
          tipOnly: true,
        },
      });
      const text = data?.tip ?? data?.insights?.[0]?.body ?? null;
      if (text) {
        const cleaned = text.replace(/^["']|["']$/g, '');
        setTip(cleaned);
        AsyncStorage.setItem(TIP_CACHE_KEY, cleaned).catch(() => {});
      }
    } catch {
      setTip('Consistency beats perfection. One good session today is worth ten perfect sessions planned for later.');
    } finally {
      setLoading(false);
      spinLoop.current?.stop();
      spin.setValue(0);
    }
  }, [goalContext, profile]);

  useEffect(() => { fetchTip(); }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <FadeIn delay={60} style={{ paddingHorizontal: 16, marginBottom: 14 }}>
      <LinearGradient
        colors={['rgba(191,90,242,0.18)', 'rgba(94,92,230,0.10)', 'rgba(0,0,0,0)']}
        style={ss.aiBanner}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={ss.aiBadge}>
            <Sparkles size={12} color="#bf5af2" strokeWidth={2} />
            <Text style={ss.aiBadgeText}>FORGEAI DAILY TIP</Text>
          </View>
          <TouchableOpacity onPress={() => fetchTip(true)} disabled={loading} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <RefreshCw size={15} color={loading ? 'rgba(191,90,242,0.4)' : '#bf5af2'} strokeWidth={2} />
            </Animated.View>
          </TouchableOpacity>
        </View>
        {loading && !tip
          ? <ActivityIndicator size="small" color="#bf5af2" style={{ alignSelf: 'flex-start' }} />
          : <Text style={ss.aiTipText}>{tip ?? 'Generating your personalized tip...'}</Text>
        }
      </LinearGradient>
    </FadeIn>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function HealthInsightsScreen({ navigation }: Props) {
  const { plans, activePlanId } = usePlanStore();
  const { profile }             = useProfileStore();

  const [active,   setActive]   = useState<Category>('All');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [status,   setStatus]   = useState<'loading' | 'ready' | 'error'>('loading');
  const [isStale,  setIsStale]  = useState(false); // true while background-refreshing cached data

  // Build goal context string for the AI
  const goalContext = useMemo(() => {
    const plan = activePlanId
      ? plans.find((p) => p.id === activePlanId)
      : plans.find((p) => isRoadmapPlan(p.plan_json as any));
    if (plan) {
      const rp = plan.plan_json as any;
      return `${rp.goal_type?.replace('_', ' ') ?? 'fitness'}, ${rp.goal_details?.experience_level ?? 'intermediate'} level`;
    }
    return profile?.goal
      ? `${profile.goal.replace('_', ' ')}, ${profile.fitness_level ?? 'intermediate'} level`
      : 'general fitness';
  }, [plans, activePlanId, profile]);

  // Fetch daily insights — cached per day in AsyncStorage
  const fetchInsights = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await loadCached();
      if (cached) {
        setInsights(cached);
        setStatus('ready');
        return;
      }
    }

    setIsStale(forceRefresh);
    if (!forceRefresh) setStatus('loading');

    try {
      const { data, error } = await supabase.functions.invoke('daily-insights', {
        body: { goalContext },
      });
      if (error || !data?.insights?.length) throw new Error(error?.message ?? 'No insights returned');
      const fresh: Insight[] = data.insights;
      await saveCache(fresh);
      setInsights(fresh);
      setStatus('ready');
    } catch {
      setStatus('error');
    } finally {
      setIsStale(false);
    }
  }, [goalContext]);

  useEffect(() => { fetchInsights(); }, []);

  const filtered = useMemo(() =>
    active === 'All' ? insights : insights.filter((i) => i.category === active),
  [active, insights]);

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  return (
    <View style={{ flex: 1 }}>
      <GradientBackground variant="default" />
      <View style={StyleSheet.absoluteFillObject}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>

          {/* Header */}
          <FadeIn delay={0} fromY={-8}>
            <View style={ss.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={ss.backBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <ChevronLeft size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={ss.headerTitle}>Health Insights</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <Calendar size={10} color="#FF6B35" />
                  <Text style={ss.headerDate}>{dateLabel}</Text>
                </View>
              </View>
              {/* Refresh button */}
              <TouchableOpacity
                onPress={() => fetchInsights(true)}
                style={ss.backBtn}
                disabled={status === 'loading' || isStale}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {isStale
                  ? <ActivityIndicator size="small" color="#FF6B35" />
                  : <RefreshCw size={16} color="rgba(255,255,255,0.55)" strokeWidth={2} />
                }
              </TouchableOpacity>
            </View>
          </FadeIn>

          {/* ForgeAI daily tip banner */}
          <ForgeAIBanner goalContext={goalContext} />

          {/* Category filter */}
          <FadeIn delay={40} fromY={8}>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={ss.filterRow}
              style={{ flexGrow: 0, marginBottom: 12 }}
            >
              {CATEGORIES.map((cat) => {
                const isAll    = cat === 'All';
                const isActive = active === cat;
                const cfg      = isAll ? null : CATEGORY_CONFIG[cat as Exclude<Category, 'All'>];
                const color    = cfg?.color ?? '#FF6B35';
                const Icon     = cfg?.Icon;
                const count    = isAll
                  ? insights.length
                  : insights.filter((i) => i.category === cat).length;

                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActive(cat)}
                    activeOpacity={0.75}
                    style={[
                      ss.filterChip,
                      { borderColor: isActive ? color : 'rgba(255,255,255,0.18)', backgroundColor: isActive ? color + '20' : 'rgba(255,255,255,0.08)' },
                    ]}
                  >
                    {Icon && <Icon size={13} color={isActive ? color : 'rgba(255,255,255,0.55)'} strokeWidth={2} />}
                    <Text style={[ss.filterText, { color: isActive ? color : 'rgba(255,255,255,0.72)' }]}>{cat}</Text>
                    {count > 0 && (
                      <View style={[ss.countBadge, { backgroundColor: isActive ? color + '30' : 'rgba(255,255,255,0.08)' }]}>
                        <Text style={[ss.countBadgeText, { color: isActive ? color : 'rgba(255,255,255,0.38)' }]}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </FadeIn>

          {/* Disclaimer */}
          <Text style={{
            fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center',
            paddingHorizontal: 24, paddingVertical: 6,
          }}>
            General wellness guidance only. Not a substitute for professional medical advice.
          </Text>

          {/* Content */}
          {status === 'loading' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.list}>
              {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} index={i} />)}
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : status === 'error' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 }}>
              <Text style={{ fontSize: 40 }}>🌐</Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' }}>Could not load today's insights</Text>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>Check your connection and try again.</Text>
              <TouchableOpacity
                onPress={() => fetchInsights()}
                style={{ marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, backgroundColor: 'rgba(255,107,53,0.18)', borderWidth: 1, borderColor: 'rgba(255,107,53,0.35)' }}
              >
                <Text style={{ color: '#FF6B35', fontWeight: '800', fontSize: 14 }}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.list}>
              {/* Stale-refresh banner */}
              {isStale && (
                <View style={ss.staleBanner}>
                  <ActivityIndicator size="small" color="#FF6B35" />
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>Refreshing today's content...</Text>
                </View>
              )}

              {filtered.length === 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
                  <Text style={{ fontSize: 36 }}>🔍</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No {active} insights today</Text>
                </View>
              ) : (
                filtered.map((insight, i) => (
                  <InsightCard key={insight.id} insight={insight} index={i} />
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}

        </SafeAreaView>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  headerDate:  { color: '#FF6B35', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  filterRow: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '700' },
  countBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  countBadgeText: { fontSize: 10, fontWeight: '800' },

  list: { paddingHorizontal: 20, gap: 14 },

  staleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,107,53,0.08)', borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: 'rgba(255,107,53,0.15)',
  },

  // Card
  card: {
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardHeader: {
    height: 150, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', gap: 4,
  },
  orb1: { position: 'absolute', width: 150, height: 150, borderRadius: 75, top: -50, right: -40 },
  orb2: { position: 'absolute', width: 110, height: 110, borderRadius: 55, bottom: -35, left: -25 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5, marginBottom: 4,
  },
  catText:    { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  cardEmoji:  { fontSize: 52 },
  readTime:   { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600', marginTop: 4 },

  cardBody:     { padding: 18 },
  cardTitle:    { color: '#fff', fontSize: 16, fontWeight: '900', lineHeight: 22, letterSpacing: -0.3, marginBottom: 10 },
  cardBodyText: { color: 'rgba(255,255,255,0.68)', fontSize: 14, lineHeight: 22 },

  // ForgeAI banner
  aiBanner: {
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(191,90,242,0.28)', padding: 16,
  },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(191,90,242,0.18)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(191,90,242,0.3)',
  },
  aiBadgeText: { color: '#bf5af2', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  aiTipText:   { color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 21 },
});
