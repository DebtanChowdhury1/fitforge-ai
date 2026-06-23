import React, { useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChevronLeft, CheckCircle, XCircle, Clock, Dumbbell,
  AlertCircle, TrendingUp, Calendar, Zap, Info,
} from 'lucide-react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FadeIn } from '../../components/FadeIn';
import { usePlanStore, getPlanProgress } from '../../store/planStore';
import { PlanStackParamList, UserPlan, RoadmapDay, AnyPlanJson } from '../../types';

type Props = NativeStackScreenProps<PlanStackParamList, 'PlanDetail'>;
const { width: W } = Dimensions.get('window');

const GOAL_COLORS: Record<string, string> = {
  weight_loss:     '#ff2d55',
  muscle_gain:     '#bf5af2',
  endurance:       '#00d4ff',
  general_fitness: '#34d399',
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; Icon: React.ComponentType<any>; label: string }> = {
  completed:       { color: '#34d399', bg: 'rgba(52,211,153,0.14)', Icon: CheckCircle,  label: 'Done'     },
  partial:         { color: '#ff8c00', bg: 'rgba(255,140,0,0.14)',  Icon: AlertCircle,  label: 'Partial'  },
  missed:          { color: '#ff3b30', bg: 'rgba(255,59,48,0.14)',  Icon: XCircle,      label: 'Missed'   },
  upcoming:        { color: 'rgba(255,255,255,0.25)', bg: 'rgba(255,255,255,0.04)', Icon: Clock, label: 'Upcoming' },
};

function DayRow({ day, isToday, onPress }: { day: RoadmapDay; isToday: boolean; onPress: () => void }) {
  const cfg   = STATUS_CONFIG[day.status] ?? STATUS_CONFIG.upcoming;
  const { Icon } = cfg;
  const isRest = day.day_type === 'rest';
  const dateD  = new Date(day.date);

  return (
    <AnimatedPressable onPress={onPress} scaleDown={0.97}>
      <View style={[
        ss.dayRow,
        isToday && ss.dayRowToday,
        isRest && !isToday && { opacity: 0.5 },
      ]}>
        {/* Left: date */}
        <View style={ss.dateBox}>
          <Text style={[ss.dateDOW, isToday && { color: '#FF6B35' }]}>
            {dateD.toLocaleDateString('en-US', { weekday: 'short' })}
          </Text>
          <Text style={[ss.dateNum, isToday && { color: '#fff' }]}>
            {dateD.getDate()}
          </Text>
        </View>

        {/* Center: focus */}
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          {isToday && (
            <View style={ss.todayPill}>
              <Text style={ss.todayPillText}>TODAY</Text>
            </View>
          )}
          <Text style={[ss.dayFocus, isRest && { color: 'rgba(255,255,255,0.3)', fontWeight: '500' }]} numberOfLines={1}>
            {day.focus}
          </Text>
          {!isRest && (
            <Text style={ss.dayMeta}>
              {day.exercises.length} exercises
              {day.cardio ? ` · ${day.cardio.duration}min ${day.cardio.type}` : ''}
            </Text>
          )}
          {day.ai_assessment?.adjustment_type === 'extended_deadline' && (
            <Text style={ss.aiNote}>AI extended deadline</Text>
          )}
          {day.ai_assessment?.adjustment_type === 'increased_load' && (
            <Text style={[ss.aiNote, { color: '#ff8c00' }]}>Load increased by AI</Text>
          )}
        </View>

        {/* Right: status */}
        <View style={[ss.statusBadge, { backgroundColor: cfg.bg }]}>
          <Icon size={15} color={cfg.color} strokeWidth={2} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

export function PlanDetailScreen({ route, navigation }: Props) {
  const { planId }   = route.params;
  const { plans }    = usePlanStore();
  const planRow      = plans.find((p) => p.id === planId);
  const plan         = planRow?.plan_json as UserPlan | undefined;

  const todayStr  = new Date().toISOString().split('T')[0];
  const goalColor = plan ? (GOAL_COLORS[plan.goal_type] ?? '#FF6B35') : '#FF6B35';

  const progress = plan ? getPlanProgress(plan) : null;

  // Group days by week
  const weekGroups = useMemo(() => {
    if (!plan) return [];
    const groups: { weekNum: number; days: RoadmapDay[] }[] = [];
    let lastWeek = -1;
    plan.daily_schedule.forEach((d) => {
      if (d.week_number !== lastWeek) {
        groups.push({ weekNum: d.week_number, days: [] });
        lastWeek = d.week_number;
      }
      groups[groups.length - 1].days.push(d);
    });
    return groups;
  }, [plan?.daily_schedule.length]);

  if (!plan) {
    return (
      <View style={[ss.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Plan not found</Text>
      </View>
    );
  }

  const daysLeft = Math.max(0, Math.ceil((new Date(plan.end_date).getTime() - new Date().getTime()) / 86400000));

  return (
    <View style={ss.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={ss.header}>
          <AnimatedPressable onPress={() => navigation.goBack()} scaleDown={0.90}>
            <View style={ss.backBtn}>
              <ChevronLeft size={20} color="rgba(255,255,255,0.6)" />
            </View>
          </AnimatedPressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={ss.planName} numberOfLines={1}>{plan.name}</Text>
            <Text style={ss.planMeta}>
              {new Date(plan.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              {' → '}
              {new Date(plan.end_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              {daysLeft > 0 ? ` · ${daysLeft}d left` : ' · Ended'}
            </Text>
          </View>
        </View>

        {/* Stats strip */}
        <FadeIn delay={60} fromY={10}>
          <LinearGradient colors={[goalColor + '18', goalColor + '06']} style={ss.statsStrip}>
            {[
              { label: 'Done',     value: progress!.done,                        color: '#34d399' },
              { label: 'Missed',   value: progress!.missed,                      color: '#ff3b30' },
              { label: 'Left',     value: progress!.total - progress!.done - progress!.missed, color: 'rgba(255,255,255,0.5)' },
              { label: 'Progress', value: `${progress!.pct}%`,                   color: goalColor },
            ].map(({ label, value, color }) => (
              <View key={label} style={ss.statItem}>
                <Text style={[ss.statValue, { color }]}>{value}</Text>
                <Text style={ss.statLabel}>{label}</Text>
              </View>
            ))}
          </LinearGradient>
        </FadeIn>

        {/* AI note banner */}
        {plan.ai_note && (
          <FadeIn delay={80}>
            <View style={ss.aiNoteBanner}>
              <Info size={14} color="#ff8c00" />
              <Text style={ss.aiNoteBannerText} numberOfLines={2}>{plan.ai_note}</Text>
            </View>
          </FadeIn>
        )}

        {/* Progress bar */}
        <View style={ss.planProgressWrap}>
          <View style={ss.planProgressBg}>
            <LinearGradient
              colors={[goalColor, goalColor + '88']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[ss.planProgressFill, { width: `${progress!.pct}%` as any }]}
            />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll}>
          {weekGroups.map(({ weekNum, days }) => {
            const weekDone = days.filter((d) => d.status === 'completed' || d.status === 'partial').length;
            const weekWorkout = days.filter((d) => d.day_type === 'workout').length;
            const startOfWeek = days[0]?.date;
            return (
              <FadeIn key={weekNum} delay={weekNum < 4 ? weekNum * 40 : 0} fromY={12}>
                <View style={ss.weekGroup}>
                  {/* Week header */}
                  <View style={ss.weekHeader}>
                    <View style={[ss.weekNumBadge, { backgroundColor: goalColor + '18', borderColor: goalColor + '35' }]}>
                      <Text style={[ss.weekNumText, { color: goalColor }]}>W{weekNum}</Text>
                    </View>
                    <Text style={ss.weekTitle}>
                      Week {weekNum}
                      {startOfWeek ? ` · ${new Date(startOfWeek).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}
                    </Text>
                    <Text style={ss.weekDone}>{weekDone}/{weekWorkout} done</Text>
                  </View>

                  {/* Days */}
                  {days.map((day) => (
                    <DayRow
                      key={day.date}
                      day={day}
                      isToday={day.date === todayStr}
                      onPress={() => navigation.navigate('DayLog', { planId, date: day.date })}
                    />
                  ))}
                </View>
              </FadeIn>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const ss = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  planName: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  planMeta: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 1 },

  statsStrip:  { flexDirection: 'row', marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statItem:    { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 20, fontWeight: '900' },
  statLabel:   { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },

  planProgressWrap: { paddingHorizontal: 20, marginBottom: 12 },
  planProgressBg:   { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  planProgressFill: { height: 4, borderRadius: 2 },

  aiNoteBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginBottom: 10, backgroundColor: 'rgba(255,140,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)', borderRadius: 12, padding: 12 },
  aiNoteBannerText: { flex: 1, color: '#ff8c00', fontSize: 13, lineHeight: 18 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },

  weekGroup:  { marginBottom: 4 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  weekNumBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  weekNumText:  { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  weekTitle:    { flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '700' },
  weekDone:     { color: 'rgba(255,255,255,0.25)', fontSize: 12 },

  dayRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 12, marginBottom: 6,
  },
  dayRowToday: {
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderColor: 'rgba(255,107,53,0.3)',
    borderWidth: 1.5,
  },

  dateBox:  { alignItems: 'center', width: 36 },
  dateDOW:  { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dateNum:  { color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: '900', marginTop: 1 },

  todayPill:     { backgroundColor: 'rgba(255,107,53,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 3 },
  todayPillText: { color: '#FF6B35', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  dayFocus:      { color: '#fff', fontSize: 14, fontWeight: '700' },
  dayMeta:       { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },
  aiNote:        { color: '#34d399', fontSize: 10, fontWeight: '700', marginTop: 3 },

  statusBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
