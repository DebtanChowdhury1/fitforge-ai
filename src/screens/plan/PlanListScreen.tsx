import React, { useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Plus, Target, TrendingDown, Zap, Activity, CheckCircle,
  Clock, Calendar, ChevronRight, Trash2, Star,
} from 'lucide-react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FadeIn } from '../../components/FadeIn';
import { usePlanStore, isRoadmapPlan, getPlanProgress } from '../../store/planStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { PlanStackParamList, UserPlan, AnyPlanJson } from '../../types';

type Props = NativeStackScreenProps<PlanStackParamList, 'PlanList'>;

const { width: W } = Dimensions.get('window');

const GOAL_META: Record<string, { label: string; color: string; Icon: React.ComponentType<any> }> = {
  weight_loss:      { label: 'Weight Loss',    color: '#ff2d55', Icon: TrendingDown },
  muscle_gain:      { label: 'Muscle Gain',    color: '#bf5af2', Icon: Target       },
  endurance:        { label: 'Endurance',      color: '#00d4ff', Icon: Activity     },
  general_fitness:  { label: 'General Fitness', color: '#34d399', Icon: Zap         },
};

const STATUS_COLORS: Record<string, string> = {
  active:    '#34d399',
  completed: '#FF6B35',
  paused:    'rgba(255,255,255,0.3)',
};

function daysLeft(endDate: string): number {
  const end  = new Date(endDate);
  const now  = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

function PlanCard({
  planRow, isActive, onPress, onActivate, onDelete,
}: {
  planRow: any;
  isActive: boolean;
  onPress: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const plan = planRow.plan_json as UserPlan;
  const meta = GOAL_META[plan.goal_type] ?? GOAL_META.general_fitness;
  const { Icon } = meta;
  const progress = getPlanProgress(plan);
  const left     = daysLeft(plan.end_date);

  return (
    <FadeIn fromY={16} fromScale={0.97}>
      <AnimatedPressable onPress={onPress} scaleDown={0.97}>
        <View style={[ss.card, isActive && ss.cardActive]}>
          {isActive && (
            <View style={ss.activeBadge}>
              <Star size={10} color="#FF6B35" fill="#FF6B35" />
              <Text style={ss.activeBadgeText}>ACTIVE</Text>
            </View>
          )}

          {/* Goal icon + name */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
            <View style={[ss.goalIcon, { backgroundColor: meta.color + '18', borderColor: meta.color + '35' }]}>
              <Icon size={22} color={meta.color} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ss.planName} numberOfLines={1}>{plan.name}</Text>
              <View style={[ss.goalBadge, { backgroundColor: meta.color + '16', borderColor: meta.color + '30' }]}>
                <Text style={[ss.goalBadgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
            <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
          </View>

          {/* Dates row */}
          <View style={ss.dateRow}>
            <View style={ss.dateItem}>
              <Calendar size={11} color="rgba(255,255,255,0.3)" />
              <Text style={ss.dateText}>
                {new Date(plan.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                {' → '}
                {new Date(plan.end_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <View style={ss.dateItem}>
              <Clock size={11} color="rgba(255,255,255,0.3)" />
              <Text style={ss.dateText}>
                {plan.status === 'completed' ? 'Completed' : `${left}d left`}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={ss.progressLabel}>Progress</Text>
              <Text style={[ss.progressLabel, { color: meta.color }]}>{progress.pct}%</Text>
            </View>
            <View style={ss.progressBg}>
              <View style={[ss.progressFill, { width: `${progress.pct}%` as any, backgroundColor: meta.color }]} />
            </View>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
              <Text style={ss.miniStat}>{progress.done} done</Text>
              <Text style={[ss.miniStat, { color: '#ff3b30' }]}>{progress.missed} missed</Text>
              <Text style={ss.miniStat}>{progress.total - progress.done - progress.missed} upcoming</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={ss.cardActions}>
            {!isActive && plan.status === 'active' && (
              <AnimatedPressable onPress={onActivate} scaleDown={0.93}>
                <View style={ss.setActiveBtn}>
                  <Text style={ss.setActiveBtnText}>Set Active</Text>
                </View>
              </AnimatedPressable>
            )}
            <AnimatedPressable onPress={onDelete} scaleDown={0.90}>
              <View style={ss.deleteBtn}>
                <Trash2 size={14} color="#ff3b30" />
              </View>
            </AnimatedPressable>
          </View>
        </View>
      </AnimatedPressable>
    </FadeIn>
  );
}

export function PlanListScreen({ navigation }: Props) {
  const { user }                             = useAuthStore();
  const { plans, setPlans, activePlanId, setActivePlanId, removePlan } = usePlanStore();

  const loadPlans = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) {
      // Only roadmap plans in this view
      const roadmaps = data.filter((p: any) => p.plan_json?.plan_type === 'roadmap');
      setPlans(roadmaps);
    }
  }, [user]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadPlans);
    return unsub;
  }, [navigation]);

  const roadmapPlans = plans.filter((p) => isRoadmapPlan(p.plan_json as AnyPlanJson));
  const activePlans  = roadmapPlans.filter((p) => (p.plan_json as UserPlan).status === 'active');
  const donePlans    = roadmapPlans.filter((p) => (p.plan_json as UserPlan).status !== 'active');

  function handleDelete(planRow: any) {
    Alert.alert(
      'Delete Plan',
      `Delete "${(planRow.plan_json as UserPlan).name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await supabase.from('workout_plans').delete().eq('id', planRow.id);
            removePlan(planRow.id);
          },
        },
      ],
    );
  }

  return (
    <View style={ss.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <FadeIn delay={0} fromY={-14}>
          <View style={ss.header}>
            <View>
              <Text style={ss.title}>My Plans</Text>
              <Text style={ss.subtitle}>{roadmapPlans.length} plan{roadmapPlans.length !== 1 ? 's' : ''} · AI-powered roadmaps</Text>
            </View>
            <AnimatedPressable onPress={() => navigation.navigate('PlanWizard')} scaleDown={0.90} haptic>
              <LinearGradient colors={['#FF6B35', '#ff2d55']} style={ss.createBtn}>
                <Plus size={17} color="#fff" strokeWidth={2.5} />
                <Text style={ss.createBtnText}>New Plan</Text>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        </FadeIn>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll}>

          {roadmapPlans.length === 0 ? (
            <FadeIn delay={120} fromY={20} fromScale={0.95}>
              <View style={ss.empty}>
                <LinearGradient colors={['rgba(255,107,53,0.12)', 'rgba(255,107,53,0.04)']} style={ss.emptyCard}>
                  <Target size={52} color="rgba(255,107,53,0.5)" strokeWidth={1.2} />
                  <Text style={ss.emptyTitle}>No plans yet</Text>
                  <Text style={ss.emptySub}>
                    Create your first AI-powered roadmap. Set your goal, duration, and get a day-by-day plan with real dates.
                  </Text>
                  <AnimatedPressable onPress={() => navigation.navigate('PlanWizard')} scaleDown={0.93} haptic style={{ marginTop: 20, alignSelf: 'stretch' }}>
                    <LinearGradient colors={['#FF6B35', '#ff2d55']} style={[ss.createBtn, { justifyContent: 'center', paddingVertical: 15 }]}>
                      <Plus size={18} color="#fff" strokeWidth={2.5} />
                      <Text style={[ss.createBtnText, { fontSize: 16 }]}>Create My First Plan</Text>
                    </LinearGradient>
                  </AnimatedPressable>
                </LinearGradient>
              </View>
            </FadeIn>
          ) : (
            <>
              {activePlans.length > 0 && (
                <>
                  <Text style={ss.sectionLabel}>Active</Text>
                  {activePlans.map((p) => (
                    <PlanCard
                      key={p.id}
                      planRow={p}
                      isActive={p.id === activePlanId}
                      onPress={() => navigation.navigate('PlanDetail', { planId: p.id })}
                      onActivate={() => setActivePlanId(p.id)}
                      onDelete={() => handleDelete(p)}
                    />
                  ))}
                </>
              )}

              {donePlans.length > 0 && (
                <>
                  <Text style={[ss.sectionLabel, { marginTop: 8 }]}>Completed / Paused</Text>
                  {donePlans.map((p) => (
                    <PlanCard
                      key={p.id}
                      planRow={p}
                      isActive={false}
                      onPress={() => navigation.navigate('PlanDetail', { planId: p.id })}
                      onActivate={() => {}}
                      onDelete={() => handleDelete(p)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const ss = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#0a0a0f' },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  title:    { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },

  createBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18 },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },

  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18,
  },
  cardActive: { borderColor: 'rgba(255,107,53,0.3)', backgroundColor: 'rgba(255,107,53,0.05)' },

  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,107,53,0.15)', borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)', paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10,
  },
  activeBadgeText: { color: '#FF6B35', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  goalIcon: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  planName: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  goalBadge: { flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  goalBadgeText: { fontSize: 11, fontWeight: '700' },

  dateRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  progressLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  progressBg:    { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 6, borderRadius: 3 },
  miniStat:      { color: 'rgba(255,255,255,0.3)', fontSize: 11 },

  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  setActiveBtn: { backgroundColor: 'rgba(255,107,53,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,53,0.3)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  setActiveBtnText: { color: '#FF6B35', fontSize: 12, fontWeight: '700' },
  deleteBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,59,48,0.1)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)', alignItems: 'center', justifyContent: 'center' },

  empty: { paddingTop: 20 },
  emptyCard: { borderRadius: 24, padding: 28, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(255,107,53,0.15)' },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 8 },
  emptySub:   { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
