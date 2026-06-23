import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, Modal, Alert, TouchableOpacity,
  Animated, Dimensions, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart2, Scale, Flame, TrendingUp, Calendar, Zap, Plus, Trash2,
  FileText, ChevronRight, Clock, CalendarRange, ActivitySquare,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarChart3DGL } from '../../components/gl/BarChart3DGL';
import { GradientBackground } from '../../components/GradientBackground';
import { useAuthStore } from '../../store/authStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { usePlanStore, isRoadmapPlan, getTodayEntry } from '../../store/planStore';
import { supabase } from '../../lib/supabase';
import { calcStreak } from '../../lib/calcStreak';
import { AnimatedCounter } from '../../components/AnimatedCounter';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FadeIn } from '../../components/FadeIn';
import { ProgressEntry, Report, UserPlan, AnyPlanJson, ProgressStackParamList } from '../../types';

const { width: W } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<ProgressStackParamList, 'ProgressDashboard'>;

type DateRangeOption = '7d' | '14d' | '30d' | 'month';

const DATE_RANGE_LABELS: Record<DateRangeOption, string> = {
  '7d':    'Last 7 days',
  '14d':   'Last 14 days',
  '30d':   'Last 30 days',
  'month': 'This month',
};

function rangeFromOption(option: DateRangeOption): { from: string; to: string } {
  const to  = new Date();
  const from = new Date();
  if (option === '7d')    from.setDate(from.getDate() - 7);
  else if (option === '14d')  from.setDate(from.getDate() - 14);
  else if (option === '30d')  from.setDate(from.getDate() - 30);
  else { from.setDate(1); } // this month
  return {
    from: from.toISOString().split('T')[0],
    to:   to.toISOString().split('T')[0],
  };
}

function buildReportContext(
  plans: any[], activePlanId: string | null,
  logs: any[], entries: ProgressEntry[],
  profile: any,
  range?: { from: string; to: string },
): string {
  const lines: string[] = [];
  const today = new Date().toISOString().split('T')[0];
  const fromDate = range?.from ?? null;
  const toDate   = range?.to   ?? today;

  if (range) {
    lines.push(`REPORT PERIOD: ${range.from} to ${range.to}`);
  } else {
    lines.push(`DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`);
  }

  const activePlan = plans.find((p) => activePlanId ? p.id === activePlanId : isRoadmapPlan(p.plan_json as AnyPlanJson));
  if (activePlan) {
    const rp = activePlan.plan_json as UserPlan;
    const todayEntry = getTodayEntry(rp);
    const scheduleDone  = rp.daily_schedule.filter((d) => d.status === 'completed').length;
    const scheduleTotal = rp.daily_schedule.filter((d) => d.date <= today && d.day_type !== 'rest').length;
    lines.push(`ACTIVE PLAN: ${rp.goal_type?.replace(/_/g, ' ')} | ${rp.start_date} to ${rp.end_date}`);
    lines.push(`Plan completion: ${scheduleDone}/${scheduleTotal} sessions`);
    if (!range && todayEntry) lines.push(`Today: ${todayEntry.focus} (${todayEntry.day_type})`);

    if (!range) {
      const upcoming = rp.daily_schedule
        .filter((d) => d.date > today && d.day_type !== 'rest')
        .slice(0, 5).map((d) => `${d.date}: ${d.focus}`);
      if (upcoming.length) lines.push(`Upcoming: ${upcoming.join(', ')}`);
    }
  }

  const filteredLogs = [...logs]
    .filter((l) => (!fromDate || l.date >= fromDate) && l.date <= toDate)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (filteredLogs.length) {
    const totalVol = filteredLogs.reduce((s, l) =>
      s + (l.exercises_json ?? []).reduce((es: number, ex: any) =>
        es + (ex.actual_sets ?? []).reduce((ss: number, set: any) => ss + set.reps * set.weight, 0), 0), 0);
    lines.push(`WORKOUTS IN PERIOD: ${filteredLogs.length} sessions`);
    lines.push(`Volume lifted: ${Math.round(totalVol).toLocaleString()} kg`);
    lines.push(`Dates: ${filteredLogs.map((l) => l.date).join(', ')}`);
  } else {
    lines.push('WORKOUTS IN PERIOD: None');
  }

  const filteredEntries = entries
    .filter((e) => e.body_weight && (!fromDate || e.date >= fromDate) && e.date <= toDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (filteredEntries.length) {
    const first = filteredEntries[0];
    const last  = filteredEntries[filteredEntries.length - 1];
    const delta = (last.body_weight ?? 0) - (first.body_weight ?? 0);
    lines.push(`WEIGHT IN PERIOD: ${first.body_weight}kg → ${last.body_weight}kg (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}kg)`);
    lines.push(`Entries: ${filteredEntries.map((e) => `${e.date}: ${e.body_weight}kg`).join(', ')}`);
  } else {
    // fall back to most recent overall weight for context
    const allW = entries.filter((e) => e.body_weight).sort((a, b) => a.date.localeCompare(b.date));
    if (allW.length) lines.push(`WEIGHT (latest): ${allW[allW.length - 1].body_weight}kg on ${allW[allW.length - 1].date}`);
    else lines.push('WEIGHT: Not tracked');
  }

  return lines.join('\n');
}

// ── Sub-components ────────────────────────────────────────────────────────────
function AnimatedBar({ value, max, delay = 0, color = '#FF6B35' }: {
  value: number; max: number; delay?: number; color?: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.spring(anim, {
        toValue: max > 0 ? Math.min(value / max, 1) : 0,
        tension: 60, friction: 8, useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(t);
  }, [value, max]);
  return (
    <View style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
      <Animated.View style={{
        height: 4, borderRadius: 2, backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }} />
    </View>
  );
}

function StatCard({ value, label, color, barMax, delay }: {
  value: number; label: string; color: string; barMax: number; delay: number;
}) {
  return (
    <FadeIn delay={delay} fromY={12} fromScale={0.95} style={{ flex: 1 }}>
      <View style={ss.statCard}>
        <AnimatedCounter value={value} style={{ fontSize: 38, fontWeight: '900', color }} />
        <Text style={ss.statLabel}>{label}</Text>
        <AnimatedBar value={value} max={barMax} color={color} delay={delay + 200} />
      </View>
    </FadeIn>
  );
}

function VolumeChart({ data }: { data: { x: string; y: number }[] }) {
  const slice = data.slice(-10);
  const max = Math.max(...slice.map((d) => d.y), 1);
  const anims = useRef(slice.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    slice.forEach((_, i) => {
      setTimeout(() => {
        Animated.spring(anims[i], {
          toValue: slice[i].y / max, tension: 80, friction: 6, useNativeDriver: false,
        }).start();
      }, i * 50);
    });
  }, [data.length]);
  return (
    <View style={{ height: 110, flexDirection: 'row', alignItems: 'flex-end', gap: 5 }}>
      {slice.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
          <Animated.View style={{
            width: '75%', borderRadius: 5,
            backgroundColor: i === slice.length - 1 ? '#FF6B35' : 'rgba(255,107,53,0.35)',
            height: anims[i]?.interpolate({ inputRange: [0, 1], outputRange: [2, 88] }),
          }} />
          <Text style={ss.chartLabel}>{d.x.slice(5)}</Text>
        </View>
      ))}
    </View>
  );
}

function TabButton({ label, active, onPress, Icon }: {
  label: string; active: boolean; onPress: () => void; Icon: React.ComponentType<any>;
}) {
  return (
    <AnimatedPressable onPress={onPress} scaleDown={0.93} style={{ flex: 1 }}>
      <LinearGradient
        colors={active ? ['#FF6B35', '#ff2d55'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']}
        style={ss.tab}
      >
        <Icon size={16} color={active ? '#fff' : 'rgba(255,255,255,0.35)'} strokeWidth={active ? 2.5 : 1.8} />
        <Text style={[ss.tabLabel, { color: active ? '#fff' : 'rgba(255,255,255,0.4)' }]}>{label}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────
function ReportCard({ report, onPress, onDelete }: {
  report: Report;
  onPress: () => void;
  onDelete: () => void;
}) {
  const expiresIn = Math.max(0, Math.ceil(
    (new Date(report.expires_at).getTime() - Date.now()) / 86400000,
  ));
  const isExpiringSoon = expiresIn <= 1;
  const accent = report.type === 'daily' ? '#FF6B35' : '#bf5af2';

  return (
    <FadeIn fromY={10}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={ss.reportCard}>
        <View style={[ss.reportCardLeft, { backgroundColor: `${accent}18`, borderColor: `${accent}30` }]}>
          <FileText size={18} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ss.reportCardTitle} numberOfLines={2}>{report.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 }}>
            <View style={[ss.typePill, { borderColor: `${accent}40` }]}>
              <Text style={[ss.typePillText, { color: accent }]}>
                {report.type === 'daily' ? 'Daily' : 'Custom'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={10} color={isExpiringSoon ? '#ff2d55' : 'rgba(255,255,255,0.25)'} />
              <Text style={[ss.reportCardMeta, { color: isExpiringSoon ? '#ff2d55' : 'rgba(255,255,255,0.25)' }]}>
                {expiresIn === 0 ? 'Expires today' : `${expiresIn}d left`}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={ss.deleteReportBtn}
          >
            <Trash2 size={13} color="rgba(255,45,85,0.6)" />
          </TouchableOpacity>
          <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
        </View>
      </TouchableOpacity>
    </FadeIn>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ProgressScreen() {
  const navigation = useNavigation<NavProp>();
  const { user }   = useAuthStore();
  const { logs, units } = useWorkoutStore();
  const { plans, activePlanId } = usePlanStore();
  const profile = null as any; // profile store access if needed

  const [entries, setEntries]     = useState<ProgressEntry[]>([]);
  const [reports, setReports]     = useState<Report[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [weight, setWeight]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'body' | 'reports'>('overview');

  // Report state
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showCustomModal, setShowCustomModal]   = useState(false);
  const [customRange, setCustomRange]           = useState<DateRangeOption>('7d');
  const [hasTodayReport, setHasTodayReport]     = useState(false);
  const [autoGenError, setAutoGenError]         = useState<string | null>(null);
  const autoGenTriggered = useRef(false);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('progress_entries').select('*').eq('user_id', user.id)
      .order('date', { ascending: true });
    if (data) setEntries(data);
  }, [user]);

  const loadReports = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    // Delete expired
    await supabase.from('reports').delete().eq('user_id', user.id).lt('expires_at', now);
    // Load valid
    const { data } = await supabase
      .from('reports').select('*').eq('user_id', user.id)
      .gte('expires_at', now).order('created_at', { ascending: false });
    if (data) {
      setReports(data as Report[]);
      const today = new Date().toISOString().split('T')[0];
      setHasTodayReport(data.some((r: any) =>
        r.type === 'daily' && r.created_at.startsWith(today),
      ));
    }
  }, [user]);

  useEffect(() => { loadEntries(); loadReports(); }, [loadEntries, loadReports]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { loadEntries(); loadReports(); autoGenTriggered.current = false; });
    return unsub;
  }, [navigation, loadEntries, loadReports]);

  // Auto-generate today's daily report when Reports tab opens
  useEffect(() => {
    if (activeTab === 'reports' && !hasTodayReport && !generatingReport && user && !autoGenTriggered.current) {
      autoGenTriggered.current = true;
      generateDailyReport();
    }
  }, [activeTab, hasTodayReport, generatingReport, user]);

  async function callGenerateReport(
    type: 'daily' | 'custom',
    context: string,
    range?: { from: string; to: string },
  ) {
    const { data: result, error: fnErr } = await supabase.functions.invoke('generate-report', {
      body: { context, reportType: type, dateRange: range ?? null },
    });

    if (fnErr) throw new Error(fnErr.message ?? 'Report generation failed');
    if (!result || result.error) throw new Error(result?.error ?? 'Empty response from report function');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: saved, error: dbErr } = await supabase
      .from('reports')
      .insert({
        user_id: user!.id,
        type,
        title: result.title,
        content: { sections: result.sections },
        expires_at: expiresAt,
      })
      .select().single();
    if (dbErr) throw dbErr;
    return saved as Report;
  }

  async function generateDailyReport(isRetry = false) {
    if (!user) return;
    setGeneratingReport(true);
    setAutoGenError(null);
    try {
      const context = buildReportContext(plans, activePlanId, logs, entries, profile);
      const saved = await callGenerateReport('daily', context);
      setReports((prev) => [saved, ...prev]);
      setHasTodayReport(true);
      navigation.navigate('ReportDetail', { report: saved });
    } catch (err: any) {
      const msg = err?.message ?? 'Generation failed — try again.';
      console.error('[Reports] generateDailyReport failed:', msg);
      setAutoGenError(msg);
      if (isRetry) Alert.alert('Could not generate report', msg);
    } finally {
      setGeneratingReport(false);
    }
  }

  async function generateCustomReport() {
    if (!user) return;
    setGeneratingReport(true);
    const range = rangeFromOption(customRange);
    try {
      const context = buildReportContext(plans, activePlanId, logs, entries, profile, range);
      const saved = await callGenerateReport('custom', context, range);
      setReports((prev) => [saved, ...prev]);
      setShowCustomModal(false);
      navigation.navigate('ReportDetail', { report: saved });
    } catch (err: any) {
      Alert.alert('Could not generate report', err.message ?? 'Try again.');
    } finally {
      setGeneratingReport(false);
    }
  }

  async function deleteReport(id: string) {
    Alert.alert(
      'Delete report?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await supabase.from('reports').delete().eq('id', id);
            setReports((prev) => prev.filter((r) => r.id !== id));
          },
        },
      ],
    );
  }

  async function logWeight() {
    if (!user || !weight) return;
    const parsed = parseFloat(weight);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid weight', 'Enter a valid number greater than 0.');
      return;
    }
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('progress_entries')
      .upsert(
        { user_id: user.id, date: today, body_weight: parsed, measurements_json: {} },
        { onConflict: 'user_id,date' },
      )
      .select().single();
    setSaving(false);
    if (error) { Alert.alert('Could not save', error.message); return; }
    if (data) {
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.date === today);
        if (idx >= 0) { const n = [...prev]; n[idx] = data; return n; }
        return [...prev, data].sort((a, b) => a.date.localeCompare(b.date));
      });
      setWeight(''); setShowModal(false);
    }
  }

  async function deleteEntry(entry: ProgressEntry) {
    Alert.alert(
      'Delete entry?',
      `Remove ${entry.body_weight} ${units} on ${new Date(entry.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('progress_entries').delete().eq('id', entry.id);
            if (error) { Alert.alert('Error', 'Could not delete. Try again.'); return; }
            setEntries((prev) => prev.filter((e) => e.id !== entry.id));
          },
        },
      ],
    );
  }

  // Derived stats
  const streak        = calcStreak(logs);
  const totalWorkouts = logs.length;
  const thisWeek      = logs.filter((l) => (Date.now() - new Date(l.date).getTime()) / 86400000 <= 7).length;
  const totalVolume   = logs.reduce((sum, log) =>
    sum + (log.exercises_json ?? []).reduce((s: number, ex: any) =>
      s + (ex.actual_sets ?? []).reduce((ss: number, set: any) => ss + set.reps * set.weight, 0), 0), 0);
  const totalSets     = logs.reduce((sum, log) =>
    sum + (log.exercises_json ?? []).reduce((s: number, ex: any) => s + (ex.actual_sets ?? []).length, 0), 0);

  const volumeData = [...logs].sort((a, b) => a.date.localeCompare(b.date)).map((log) => ({
    x: log.date,
    y: (log.exercises_json ?? []).reduce((s: number, ex: any) =>
      s + (ex.actual_sets ?? []).reduce((ss: number, set: any) => ss + set.reps * set.weight, 0), 0),
  }));

  const weightData   = entries.filter((e) => e.body_weight).map((e) => ({ x: e.date, y: e.body_weight! }));
  const maxVolume    = Math.max(...volumeData.map((d) => d.y), 1);
  const latestWeight = weightData[weightData.length - 1]?.y ?? 0;
  const prevWeight   = weightData[weightData.length - 2]?.y ?? latestWeight;
  const weightDelta  = latestWeight - prevWeight;

  const TABS = [
    { id: 'overview' as const, label: 'Overview', Icon: TrendingUp },
    { id: 'history'  as const, label: 'History',  Icon: Calendar   },
    { id: 'body'     as const, label: 'Body',      Icon: Scale      },
    { id: 'reports'  as const, label: 'Reports',   Icon: FileText   },
  ];

  return (
    <View style={{ flex: 1 }}>
      <GradientBackground variant="progress" />
      <View style={StyleSheet.absoluteFillObject}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>

          {/* Header */}
          <FadeIn delay={0} fromY={-14}>
            <View style={ss.header}>
              <View>
                <Text style={ss.title}>Progress</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Flame size={13} color="#FF6B35" />
                  <Text style={ss.streakText}>
                    {streak > 0 ? `${streak}-day streak` : 'No active streak'}
                  </Text>
                </View>
              </View>
              <AnimatedPressable onPress={() => setShowModal(true)} scaleDown={0.90} haptic>
                <LinearGradient colors={['#FF6B35', '#ff2d55']} style={ss.logBtn}>
                  <Plus size={16} color="#fff" strokeWidth={2.5} />
                  <Text style={ss.logBtnText}>Log Weight</Text>
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </FadeIn>

          {/* Tabs */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={ss.tabRow}
          >
            {TABS.map((t) => (
              <TabButton key={t.id} label={t.label} active={activeTab === t.id}
                onPress={() => setActiveTab(t.id)} Icon={t.Icon} />
            ))}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll}>

            {/* ── Overview ── */}
            {activeTab === 'overview' && (
              <>
                {streak > 0 && (
                  <FadeIn delay={60} fromScale={0.94} fromY={10}>
                    <LinearGradient colors={['#FF6B3522', '#ff2d5511']} style={ss.streakCard}>
                      <View style={ss.streakIcon}><Flame size={28} color="#FF6B35" /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={ss.streakHero}>{streak} day{streak !== 1 ? 's' : ''}</Text>
                        <Text style={ss.streakSub}>Current Streak — keep it going</Text>
                      </View>
                    </LinearGradient>
                  </FadeIn>
                )}
                {volumeData.length > 0 && (
                  <FadeIn delay={80} fromY={16}>
                    <View style={ss.chartCard}>
                      <Text style={ss.sectionLabel}>Volume History</Text>
                      <View style={{ borderRadius: 14, overflow: 'hidden' }}>
                        <BarChart3DGL
                          width={W - 72} height={180}
                          data={volumeData.slice(-7).map((d) => ({
                            label: d.x.slice(5),
                            value: maxVolume > 0 ? d.y / maxVolume : 0,
                          }))}
                        />
                      </View>
                    </View>
                  </FadeIn>
                )}
                <View style={ss.statsGrid}>
                  <StatCard value={totalWorkouts} label="Workouts" color="#FF6B35" barMax={50}  delay={100} />
                  <StatCard value={thisWeek}      label="This Week" color="#bf5af2" barMax={7}   delay={140} />
                </View>
                <View style={[ss.statsGrid, { marginTop: 10 }]}>
                  <StatCard value={Math.round(totalVolume / 1000)} label={`Volume k${units}`} color="#00d4ff" barMax={100} delay={180} />
                  <StatCard value={totalSets} label="Total Sets" color="#34d399" barMax={500} delay={220} />
                </View>
                {volumeData.length > 1 && (
                  <FadeIn delay={260} fromY={16}>
                    <View style={ss.chartCard}>
                      <Text style={ss.sectionLabel}>Volume Per Session</Text>
                      <VolumeChart data={volumeData} />
                    </View>
                  </FadeIn>
                )}
                {latestWeight > 0 && (
                  <FadeIn delay={300} fromY={16}>
                    <View style={ss.chartCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <View>
                          <Text style={ss.sectionLabel}>Body Weight</Text>
                          <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 2 }}>
                            {latestWeight} <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>{units}</Text>
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: weightDelta > 0 ? '#ff5500' : '#34d399', fontSize: 20, fontWeight: '800' }}>
                            {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} {units}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>vs previous</Text>
                        </View>
                      </View>
                    </View>
                  </FadeIn>
                )}
                {logs.length === 0 && latestWeight === 0 && (
                  <FadeIn delay={100} fromY={20}>
                    <View style={ss.empty}>
                      <Zap size={48} color="rgba(255,255,255,0.1)" strokeWidth={1.2} />
                      <Text style={ss.emptyTitle}>No data yet</Text>
                      <Text style={ss.emptySub}>Complete workouts and log your weight to see progress charts here.</Text>
                    </View>
                  </FadeIn>
                )}
              </>
            )}

            {/* ── History ── */}
            {activeTab === 'history' && (
              <>
                {logs.length === 0 ? (
                  <FadeIn delay={80} fromY={20}>
                    <View style={ss.empty}>
                      <BarChart2 size={48} color="rgba(255,255,255,0.1)" strokeWidth={1.2} />
                      <Text style={ss.emptyTitle}>No workouts logged yet</Text>
                      <Text style={ss.emptySub}>Complete your first session from the Home tab to see history here.</Text>
                    </View>
                  </FadeIn>
                ) : (
                  [...logs].sort((a, b) => b.date.localeCompare(a.date)).map((log, i) => {
                    const vol = (log.exercises_json ?? []).reduce((s: number, ex: any) =>
                      s + (ex.actual_sets ?? []).reduce((ss: number, set: any) => ss + set.reps * set.weight, 0), 0);
                    const setCount = (log.exercises_json ?? []).reduce((s: number, ex: any) => s + (ex.actual_sets ?? []).length, 0);
                    return (
                      <FadeIn key={log.id ?? i} delay={i < 8 ? i * 40 : 0} fromY={12}>
                        <View style={ss.histCard}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View style={ss.histIcon}><Calendar size={16} color="#FF6B35" /></View>
                              <Text style={ss.histDate}>{new Date(log.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                            </View>
                            <View style={ss.histBadge}>
                              <Text style={ss.histBadgeText}>{(log.exercises_json ?? []).length} exercises</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
                            <View>
                              <Text style={ss.histMetaLabel}>Sets</Text>
                              <Text style={ss.histMetaVal}>{setCount}</Text>
                            </View>
                            {vol > 0 && (
                              <View>
                                <Text style={ss.histMetaLabel}>Volume</Text>
                                <Text style={ss.histMetaVal}>{vol.toLocaleString()} {units}</Text>
                              </View>
                            )}
                          </View>
                          {(log.exercises_json ?? []).slice(0, 3).map((ex: any, j: number) => (
                            <View key={j} style={ss.histExRow}>
                              <Text style={ss.histExName} numberOfLines={1}>{ex.name}</Text>
                              <Text style={ss.histExSets}>
                                {(ex.actual_sets ?? []).length} sets
                                {(ex.actual_sets ?? []).length > 0 && ex.actual_sets[0].weight > 0
                                  ? ` · ${ex.actual_sets[0].weight}${units}` : ''}
                              </Text>
                            </View>
                          ))}
                          {(log.exercises_json ?? []).length > 3 && (
                            <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 4 }}>
                              +{(log.exercises_json ?? []).length - 3} more exercises
                            </Text>
                          )}
                        </View>
                      </FadeIn>
                    );
                  })
                )}
              </>
            )}

            {/* ── Body ── */}
            {activeTab === 'body' && (
              <>
                {entries.length === 0 ? (
                  <FadeIn delay={80} fromY={20}>
                    <View style={ss.empty}>
                      <Scale size={52} color="rgba(255,255,255,0.1)" strokeWidth={1.2} />
                      <Text style={ss.emptyTitle}>No body stats yet</Text>
                      <Text style={ss.emptySub}>Track your body weight over time to see your transformation.</Text>
                      <AnimatedPressable onPress={() => setShowModal(true)} scaleDown={0.93} haptic style={{ marginTop: 20 }}>
                        <LinearGradient colors={['#FF6B35', '#ff2d55']} style={ss.emptyBtn}>
                          <Plus size={18} color="#fff" strokeWidth={2.5} />
                          <Text style={ss.emptyBtnText}>Log First Weight</Text>
                        </LinearGradient>
                      </AnimatedPressable>
                    </View>
                  </FadeIn>
                ) : (
                  <>
                    <FadeIn delay={60} fromScale={0.95} fromY={10}>
                      <LinearGradient colors={['rgba(255,107,53,0.15)', 'rgba(255,107,53,0.04)']} style={ss.bodyHero}>
                        <View>
                          <Text style={ss.sectionLabel}>Current Weight</Text>
                          <Text style={{ color: '#fff', fontSize: 42, fontWeight: '900', marginTop: 2 }}>
                            {latestWeight}
                            <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}> {units}</Text>
                          </Text>
                        </View>
                        <AnimatedPressable onPress={() => setShowModal(true)} scaleDown={0.90} haptic>
                          <LinearGradient colors={['#FF6B35', '#ff2d55']} style={ss.logBtnSmall}>
                            <Plus size={15} color="#fff" strokeWidth={2.5} />
                            <Text style={ss.logBtnSmallText}>Update</Text>
                          </LinearGradient>
                        </AnimatedPressable>
                      </LinearGradient>
                    </FadeIn>
                    <Text style={[ss.sectionLabel, { marginBottom: 8, marginTop: 4 }]}>Log History</Text>
                    {[...entries].reverse().map((entry, i) => {
                      const prev = [...entries].reverse()[i + 1];
                      const delta = prev?.body_weight ? (entry.body_weight ?? 0) - prev.body_weight : null;
                      return (
                        <FadeIn key={entry.id ?? i} delay={i < 6 ? i * 40 : 0} fromY={10}>
                          <View style={ss.bodyEntryRow}>
                            <View style={ss.histIcon}><Scale size={16} color="#FF6B35" /></View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{entry.body_weight} {units}</Text>
                              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 1 }}>
                                {new Date(entry.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </Text>
                            </View>
                            {delta !== null && (
                              <Text style={{ color: delta > 0 ? '#ff5500' : '#34d399', fontWeight: '700', fontSize: 14, marginRight: 10 }}>
                                {delta > 0 ? '+' : ''}{delta.toFixed(1)} {units}
                              </Text>
                            )}
                            <TouchableOpacity
                              onPress={() => deleteEntry(entry)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              style={ss.deleteEntryBtn}
                            >
                              <Trash2 size={14} color="#ff2d55" />
                            </TouchableOpacity>
                          </View>
                        </FadeIn>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {/* ── Reports ── */}
            {activeTab === 'reports' && (
              <>
                {/* Auto-generating today's report */}
                {generatingReport && !showCustomModal && (
                  <FadeIn delay={0} fromY={8}>
                    <View style={ss.generatingCard}>
                      <ActivitySquare size={18} color="#FF6B35" />
                      <View style={{ flex: 1 }}>
                        <Text style={ss.generatingTitle}>Generating today's report...</Text>
                        <Text style={ss.generatingSub}>Your AI coach is reviewing your data</Text>
                      </View>
                    </View>
                  </FadeIn>
                )}

                {/* Retry card — shown if auto-gen failed */}
                {!generatingReport && !hasTodayReport && (
                  <FadeIn delay={40} fromY={10}>
                    <TouchableOpacity
                      onPress={() => { autoGenTriggered.current = false; generateDailyReport(true); }}
                      activeOpacity={0.82}
                      style={ss.retryCard}
                    >
                      <View style={ss.generateIcon}><FileText size={20} color="#FF6B35" /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={ss.generateTitle}>Today's report not ready</Text>
                        <Text style={ss.generateSub}>
                          {autoGenError ? 'Generation failed — tap to retry' : 'Tap to generate'}
                        </Text>
                      </View>
                      <Zap size={16} color="#FF6B35" />
                    </TouchableOpacity>
                  </FadeIn>
                )}

                {/* Custom report CTA */}
                <FadeIn delay={60} fromY={10}>
                  <TouchableOpacity
                    onPress={() => setShowCustomModal(true)}
                    activeOpacity={0.82}
                    style={ss.customCard}
                  >
                    <View style={ss.customCardLeft}>
                      <CalendarRange size={18} color="#bf5af2" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ss.customCardTitle}>Custom Period Report</Text>
                      <Text style={ss.customCardSub}>Pick any time range — last 7, 14, 30 days, or this month</Text>
                    </View>
                    <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
                  </TouchableOpacity>
                </FadeIn>

                {/* Reports list */}
                {reports.length > 0 && (
                  <>
                    <Text style={[ss.sectionLabel, { marginTop: 4 }]}>Your Reports</Text>
                    {reports.map((r) => (
                      <ReportCard
                        key={r.id}
                        report={r}
                        onPress={() => navigation.navigate('ReportDetail', { report: r })}
                        onDelete={() => deleteReport(r.id)}
                      />
                    ))}
                  </>
                )}

                {reports.length === 0 && !generatingReport && hasTodayReport && (
                  <FadeIn delay={100} fromY={16}>
                    <View style={[ss.empty, { paddingTop: 30 }]}>
                      <FileText size={44} color="rgba(255,255,255,0.08)" strokeWidth={1.2} />
                      <Text style={ss.emptyTitle}>No reports yet</Text>
                      <Text style={ss.emptySub}>Your first report is on its way.</Text>
                    </View>
                  </FadeIn>
                )}

                <FadeIn delay={200} fromY={8}>
                  <View style={ss.expiryNote}>
                    <Clock size={11} color="rgba(255,255,255,0.2)" />
                    <Text style={ss.expiryNoteText}>Reports auto-delete 7 days after creation</Text>
                  </View>
                </FadeIn>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Log Weight Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={ss.modalOverlay}>
          <View style={ss.modalSheet}>
            <View style={ss.modalHandle} />
            <Text style={ss.modalTitle}>Log Body Weight</Text>
            <Text style={ss.modalSub}>Enter your current weight in {units}</Text>
            <View style={ss.modalInput}>
              <TextInput
                style={ss.modalInputText} placeholder="0.0"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric" value={weight}
                onChangeText={setWeight} autoFocus
              />
              <Text style={ss.modalUnit}>{units}</Text>
            </View>
            <AnimatedPressable onPress={logWeight} scaleDown={0.96} haptic disabled={saving} style={ss.saveBtnWrap}>
              <LinearGradient colors={saving ? ['#555', '#444'] : ['#FF6B35', '#ff2d55']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ss.saveBtn}>
                <Text style={ss.saveBtnText}>{saving ? 'Saving...' : 'Save Weight'}</Text>
              </LinearGradient>
            </AnimatedPressable>
            <AnimatedPressable onPress={() => setShowModal(false)} style={ss.cancelBtn}>
              <Text style={ss.cancelText}>Cancel</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Custom Report Modal — date range picker */}
      <Modal visible={showCustomModal} transparent animationType="slide" onRequestClose={() => setShowCustomModal(false)}>
        <View style={ss.modalOverlay}>
          <View style={ss.modalSheet}>
            <View style={ss.modalHandle} />
            <Text style={ss.modalTitle}>Custom Period Report</Text>
            <Text style={ss.modalSub}>Choose the time period to analyse</Text>

            <View style={{ gap: 10, marginBottom: 24 }}>
              {(Object.entries(DATE_RANGE_LABELS) as [DateRangeOption, string][]).map(([key, label]) => {
                const active = customRange === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setCustomRange(key)}
                    activeOpacity={0.8}
                    style={[ss.rangeOption, active && ss.rangeOptionActive]}
                  >
                    <CalendarRange size={16} color={active ? '#bf5af2' : 'rgba(255,255,255,0.35)'} />
                    <Text style={[ss.rangeOptionText, { color: active ? '#fff' : 'rgba(255,255,255,0.5)' }]}>
                      {label}
                    </Text>
                    {active && <View style={ss.rangeOptionDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <AnimatedPressable
              onPress={generateCustomReport}
              scaleDown={0.96} haptic
              disabled={generatingReport}
              style={ss.saveBtnWrap}
            >
              <LinearGradient
                colors={generatingReport ? ['#555', '#444'] : ['#bf5af2', '#9b3dd8']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={ss.saveBtn}
              >
                <Text style={ss.saveBtnText}>
                  {generatingReport ? 'Generating...' : `Generate ${DATE_RANGE_LABELS[customRange]} Report`}
                </Text>
              </LinearGradient>
            </AnimatedPressable>
            <AnimatedPressable onPress={() => setShowCustomModal(false)} style={ss.cancelBtn}>
              <Text style={ss.cancelText}>Cancel</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  title:      { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  streakText: { color: '#FF6B35', fontSize: 13, fontWeight: '700' },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 18,
  },
  logBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16,
    paddingRight: 20,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13, borderRadius: 16, paddingHorizontal: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tabLabel: { fontSize: 13, fontWeight: '800' },
  scroll:    { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  sectionLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10,
  },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 18, alignItems: 'center',
  },
  statLabel:   { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 18,
  },
  chartLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 9, marginTop: 4 },
  streakCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)',
  },
  streakIcon: {
    width: 50, height: 50, borderRadius: 15,
    backgroundColor: 'rgba(255,107,53,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  streakHero: { color: '#fff', fontSize: 22, fontWeight: '900' },
  streakSub:  { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2 },
  histCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 18, padding: 16,
  },
  histIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,107,53,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  histDate:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  histBadge:     { backgroundColor: 'rgba(255,140,0,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  histBadgeText: { color: '#ff8c00', fontSize: 12, fontWeight: '700' },
  histMetaLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  histMetaVal:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  histExRow:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  histExName: { color: 'rgba(255,255,255,0.55)', fontSize: 13, flex: 1 },
  histExSets: { color: 'rgba(255,255,255,0.28)', fontSize: 13 },
  bodyHero: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)',
  },
  logBtnSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14,
  },
  logBtnSmallText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bodyEntryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14,
  },
  deleteEntryBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,45,85,0.1)', borderWidth: 1, borderColor: 'rgba(255,45,85,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  empty:      { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  emptySub:   { color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  emptyBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 18 },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Reports
  generatingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,107,53,0.07)', borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)', borderRadius: 18, padding: 18,
  },
  generatingTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  generatingSub:   { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  retryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)', borderRadius: 18, padding: 18,
  },
  generateIcon: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: 'rgba(255,107,53,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  generateTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  generateSub:   { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  customCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(191,90,242,0.2)', borderRadius: 20, padding: 18,
  },
  customCardLeft: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(191,90,242,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  customCardTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  customCardSub:   { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  reportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)', borderRadius: 18, padding: 16,
  },
  reportCardLeft: {
    width: 44, height: 44, borderRadius: 13,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  reportCardTitle: { color: '#fff', fontWeight: '700', fontSize: 14, lineHeight: 19 },
  reportCardMeta:  { fontSize: 11 },
  typePill: {
    borderWidth: 1, borderRadius: 7,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  typePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  deleteReportBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(255,45,85,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  rangeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)', borderRadius: 14, padding: 16,
  },
  rangeOptionActive: {
    backgroundColor: 'rgba(191,90,242,0.1)',
    borderColor: 'rgba(191,90,242,0.35)',
  },
  rangeOptionText: { flex: 1, fontWeight: '700', fontSize: 15 },
  rangeOptionDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#bf5af2',
  },
  expiryNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 4,
  },
  expiryNoteText: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  modalSheet: {
    backgroundColor: '#0f0f1c', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 28, paddingBottom: 48,
  },
  modalHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'center', marginBottom: 22 },
  modalTitle:     { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  modalSub:       { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 },
  modalInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16,
    paddingHorizontal: 18, marginBottom: 24,
  },
  modalInputText: { flex: 1, color: '#fff', paddingVertical: 16, fontSize: 28, fontWeight: '700' },
  modalUnit:      { color: '#ff8c00', fontSize: 18, fontWeight: '700' },
  saveBtnWrap:    { borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  saveBtn:        { paddingVertical: 17, alignItems: 'center' },
  saveBtnText:    { color: '#fff', fontWeight: '900', fontSize: 18 },
  cancelBtn:      { alignItems: 'center', paddingVertical: 12 },
  cancelText:     { color: 'rgba(255,255,255,0.35)', fontSize: 15 },
});
