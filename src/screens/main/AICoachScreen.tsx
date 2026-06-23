import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Bot, ArrowUp, ChevronLeft, Zap, ChevronRight } from 'lucide-react-native';
import { useProfileStore } from '../../store/profileStore';
import { useChatStore, ChatMessage } from '../../store/chatStore';
import {
  usePlanStore, isRoadmapPlan, getTodayEntry, getPlanProgress, expandRoadmap,
} from '../../store/planStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import {
  ForgeAIStackParamList, AnyPlanJson, UserPlan, GoalDetails, RoadmapDay,
  ProfileSoFar, CoachPhase, CoachAction, EMPTY_PROFILE_SO_FAR,
} from '../../types';
import { validateWeightGoal } from '../../lib/validation/healthGoals';

type Props = NativeStackScreenProps<ForgeAIStackParamList, 'ChatSession'>;

const SUGGESTIONS = [
  "I want to lose weight but don't know where to start",
  "I've been working out but not seeing results",
  "Just finished my workout",
  "I keep skipping sessions, need help staying consistent",
  "What should I eat today?",
  "I'm injured, can we adjust my plan?",
];

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])).start();
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4 }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={{
          width: 7, height: 7, borderRadius: 4, backgroundColor: '#bf5af2',
          transform: [{ translateY: dot }],
        }} />
      ))}
    </View>
  );
}

// ── Action card ───────────────────────────────────────────────────────────────
function ActionCard({
  action, onPress, busy,
}: {
  action: CoachAction;
  onPress: () => void;
  busy?: boolean;
}) {
  const isEdit = WRITE_ACTION_TYPES.includes(action.type);
  const accentColor = isEdit ? '#34d399' : '#FF6B35';

  return (
    <TouchableOpacity
      onPress={busy ? undefined : onPress}
      activeOpacity={busy ? 1 : 0.8}
      style={{ marginTop: 8 }}
    >
      <LinearGradient
        colors={isEdit
          ? ['rgba(52,211,153,0.12)', 'rgba(52,211,153,0.06)']
          : ['rgba(255,107,53,0.15)', 'rgba(191,90,242,0.12)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{
          borderRadius: 14, borderWidth: 1,
          borderColor: isEdit ? 'rgba(52,211,153,0.3)' : 'rgba(255,107,53,0.3)',
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 14, paddingVertical: 12, gap: 10,
        }}
      >
        <View style={{
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: accentColor + '22',
          borderWidth: 1, borderColor: accentColor + '40',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {busy
            ? <ActivityIndicator size="small" color={accentColor} />
            : <Zap size={15} color={accentColor} />
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: accentColor, fontSize: 13, fontWeight: '800' }}>{action.label}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 1 }}>
            {action.description}
          </Text>
        </View>
        <ChevronRight size={16} color={accentColor + '99'} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Action types that write data (shown in green) ─────────────────────────────
const WRITE_ACTION_TYPES = [
  'log_body_weight',
  'log_body_measurement',
  'log_workout_done',
  'change_day_type',
  'extend_plan',
  'update_plan_status',
  'delete_plan',
  'set_active_plan',
  'update_day_exercises',
];

// ── Build rich context from all app data ──────────────────────────────────────
function buildContext(
  profile: any,
  planRows: any[],
  activePlanId: string | null,
  logs: any[],
  weightEntries: any[],
): string {
  const parts: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  parts.push(`TODAY: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`);

  // ── All plans (not just active) ──
  const roadmapPlans = planRows.filter((p: any) => isRoadmapPlan(p.plan_json as AnyPlanJson));
  const activePlan = activePlanId
    ? planRows.find((p: any) => p.id === activePlanId)
    : roadmapPlans[0];

  if (roadmapPlans.length > 1) {
    const others = roadmapPlans.filter((p: any) => p.id !== activePlan?.id);
    parts.push(
      `ALL PLANS (${roadmapPlans.length} total): ` +
      roadmapPlans.map((p: any) => {
        const rp = p.plan_json as UserPlan;
        return `[id:${p.id}] "${rp.name}" (${rp.goal_type}, ${rp.status})${p.id === activePlan?.id ? ' ← ACTIVE' : ''}`;
      }).join(' | '),
    );
    if (others.length) {
      parts.push(`OTHER PLANS the coach can switch to or delete: ${others.map((p: any) => `[id:${p.id}] "${(p.plan_json as UserPlan).name}"`).join(', ')}`);
    }
  }

  if (activePlan && isRoadmapPlan(activePlan.plan_json as AnyPlanJson)) {
    const rp = activePlan.plan_json as UserPlan;
    const prog = getPlanProgress(rp);
    const todayEntry = getTodayEntry(rp);

    parts.push(
      `PROFILE (from active plan): Goal=${rp.goal_type}, Level=${rp.goal_details.experience_level}, ` +
      `Equipment=${rp.goal_details.equipment}, ${rp.goal_details.days_per_week} days/week, ` +
      `${rp.goal_details.session_duration}min/session` +
      (rp.goal_details.limitations ? `, Limitations=${rp.goal_details.limitations}` : '') +
      (rp.goal_details.current_weight ? `, StartWeight=${rp.goal_details.current_weight}${rp.goal_details.units}` : '') +
      (rp.goal_details.target_weight ? `, TargetWeight=${rp.goal_details.target_weight}${rp.goal_details.units}` : ''),
    );

    parts.push(
      `ACTIVE PLAN [id:${activePlan.id}]: "${rp.name}" (${rp.goal_type}) | Status=${rp.status} | ` +
      `Progress=${prog.pct}% (${prog.done} done, ${prog.missed} missed, ${prog.total - prog.done - prog.missed} remaining) | ` +
      `Runs ${rp.start_date} to ${rp.end_date}`,
    );

    if (todayEntry) {
      const exerciseList = todayEntry.exercises.length
        ? todayEntry.exercises.map((ex) => `${ex.name} ${ex.sets}x${ex.reps}`).join(', ')
        : 'none';
      parts.push(
        `TODAY (${today}): ${todayEntry.focus} | Type=${todayEntry.day_type} | Status=${todayEntry.status}` +
        (todayEntry.day_type === 'workout' ? ` | Exercises: ${exerciseList}` : ''),
      );
    } else {
      parts.push(`TODAY (${today}): Nothing scheduled in plan`);
    }

    const upcoming = rp.daily_schedule
      .filter((d) => d.date > today && d.status === 'upcoming' && d.day_type !== 'rest')
      .slice(0, 7);
    if (upcoming.length) {
      parts.push(
        `UPCOMING: ${upcoming.map((d) => `${d.date} ${d.day_of_week.slice(0, 3)} — ${d.focus}`).join(' | ')}`,
      );
    }

    if (rp.nutrition_note) parts.push(`NUTRITION GUIDANCE: ${rp.nutrition_note}`);
  } else {
    if (profile && profile.goal && profile.fitness_level) {
      parts.push(
        `PROFILE (from onboarding): Goal=${profile.goal}, Level=${profile.fitness_level}, ` +
        `Equipment=${profile.equipment ?? 'unknown'}, ${profile.days_per_week} days/week, ` +
        `${profile.session_duration}min/session` +
        (profile.limitations ? `, Limitations=${profile.limitations}` : ''),
      );
    } else {
      parts.push('PROFILE: Not set up');
    }
    parts.push('ACTIVE PLAN: None');
  }

  if (logs.length) {
    const sorted = [...logs].sort((a: any, b: any) => b.date.localeCompare(a.date));
    const thisWeek = sorted.filter((l: any) => (Date.now() - new Date(l.date).getTime()) / 86400000 <= 7);
    const totalVol = sorted.reduce((s: number, l: any) =>
      s + (l.exercises_json ?? []).reduce((es: number, ex: any) =>
        es + (ex.actual_sets ?? []).reduce((ss: number, set: any) => ss + set.reps * set.weight, 0), 0), 0);
    parts.push(
      `WORKOUT HISTORY: ${sorted.length} total sessions | This week: ${thisWeek.length} | ` +
      `Total volume: ${Math.round(totalVol).toLocaleString()} kg | ` +
      `Recent: ${sorted.slice(0, 5).map((l: any) => l.date).join(', ')}`,
    );
  } else {
    parts.push('WORKOUT HISTORY: None logged');
  }

  if (weightEntries.length) {
    const latest = weightEntries[weightEntries.length - 1];
    const oldest = weightEntries[0];
    const change = (latest.body_weight - oldest.body_weight).toFixed(1);
    const sign = parseFloat(change) >= 0 ? '+' : '';
    const recent = weightEntries.slice(-4).map((e: any) => `${e.date}: ${e.body_weight}kg`).join(', ');
    parts.push(
      `WEIGHT: Current=${latest.body_weight}kg (${latest.date}), Start=${oldest.body_weight}kg, ` +
      `Change=${sign}${change}kg | Recent entries: ${recent}`,
    );
  } else {
    parts.push('WEIGHT: Not tracked yet');
  }

  return parts.join('\n');
}

// ── Extended message type ─────────────────────────────────────────────────────
interface ExtendedMessage extends ChatMessage {
  thinking?: string;
  action?: CoachAction | null;
  phase?: CoachPhase;
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function AICoachScreen({ route, navigation }: Props) {
  const { sessionId, isNew } = route.params;
  const { profile }          = useProfileStore();
  const { user }             = useAuthStore();
  const { plans, activePlanId, setPlans, addPlan, updatePlan, removePlan, setActivePlanId } = usePlanStore();
  const { logs }             = useWorkoutStore();
  const { saveMessages, loadMessages, updateSession, saveSessionProfile, loadSessionProfile } = useChatStore();

  const [messages, setMessages]         = useState<ExtendedMessage[]>([]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [executingAction, setExecuting] = useState<string | null>(null); // tracks which action is running
  const [generatingPlan, setGenerating] = useState(false);
  const [ready, setReady]               = useState(false);
  const [context, setContext]           = useState('');
  const [profileSoFar, setProfileSoFar] = useState<ProfileSoFar>(EMPTY_PROFILE_SO_FAR);
  const [phase, setPhase]               = useState<CoachPhase>('qa');
  const scrollRef   = useRef<ScrollView>(null);
  const titleSetRef = useRef(false);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      if (!user) { setReady(true); return; }

      const [plansRes, logsRes, weightRes, savedProfile] = await Promise.all([
        supabase.from('workout_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('workout_logs').select('date, exercises_json').eq('user_id', user.id).order('date', { ascending: false }).limit(14),
        supabase.from('progress_entries').select('date, body_weight').eq('user_id', user.id).order('date', { ascending: true }).limit(20),
        loadSessionProfile(sessionId),
      ]);

      const freshPlans   = (plansRes.data ?? []).filter((p: any) => p.plan_json?.plan_type === 'roadmap');
      const freshLogs    = logsRes.data ?? [];
      const freshWeights = weightRes.data ?? [];

      if (freshPlans.length && plans.length === 0) setPlans(freshPlans);

      if (savedProfile) {
        setProfileSoFar(savedProfile as unknown as ProfileSoFar);
        if ((savedProfile as any).phase) setPhase((savedProfile as any).phase as CoachPhase);
      }

      const builtContext = buildContext(profile, freshPlans, activePlanId, freshLogs, freshWeights);
      setContext(builtContext);

      const activePlan = freshPlans.find((p: any) =>
        activePlanId ? p.id === activePlanId : isRoadmapPlan(p.plan_json as AnyPlanJson),
      );
      const planGoal = activePlan ? (activePlan.plan_json as UserPlan).goal_type.replace('_', ' ') : null;

      const welcomeContent = planGoal
        ? `Hey — got your ${planGoal} plan pulled up. What's going on today?`
        : "Hey, what's up? Whether you want to build a plan, sort out your diet, ask about training, or just figure out why you're not seeing results — I'm here. What's on your mind?";

      if (isNew) {
        const welcome: ExtendedMessage = {
          role: 'assistant', content: welcomeContent, timestamp: new Date().toISOString(),
        };
        setMessages([welcome]);
        await saveMessages(sessionId, [welcome]);
      } else {
        const stored = await loadMessages(sessionId);
        setMessages(stored.length ? (stored as ExtendedMessage[]) : [{
          role: 'assistant', content: welcomeContent, timestamp: new Date().toISOString(),
        }]);
      }
      setReady(true);
    }
    init();
  }, [sessionId]);

  // Rebuild context when store changes
  useEffect(() => {
    if (!ready || !user) return;
    supabase.from('progress_entries').select('date, body_weight').eq('user_id', user.id).order('date', { ascending: true }).limit(20)
      .then(({ data }) => setContext(buildContext(profile, plans, activePlanId, logs, data ?? [])));
  }, [plans, logs, ready]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading, generatingPlan]);

  const persist = useCallback(async (
    msgs: ExtendedMessage[],
    updatedProfile?: ProfileSoFar,
    updatedPhase?: CoachPhase,
  ) => {
    await saveMessages(sessionId, msgs);
    const userMsgs = msgs.filter((m) => m.role === 'user');
    const lastMsg  = msgs[msgs.length - 1];
    await updateSession(sessionId, {
      preview: lastMsg.content.slice(0, 80),
      messageCount: msgs.length,
      ...(userMsgs.length === 1 && !titleSetRef.current
        ? { title: userMsgs[0].content.slice(0, 45) + (userMsgs[0].content.length > 45 ? '…' : '') }
        : {}),
    });
    if (userMsgs.length >= 1) titleSetRef.current = true;
    if (updatedProfile) {
      await saveSessionProfile(sessionId, { ...updatedProfile, phase: updatedPhase ?? phase } as any);
    }
  }, [sessionId, saveMessages, updateSession, saveSessionProfile, phase]);

  // ── Execute write actions ─────────────────────────────────────────────────
  async function executeAction(action: CoachAction): Promise<{ success: boolean; message: string }> {
    if (!user) return { success: false, message: 'Not signed in.' };

    const getActivePlan = () => {
      const p = activePlanId ? plans.find((pl) => pl.id === activePlanId) : plans[0];
      return p && isRoadmapPlan(p.plan_json as AnyPlanJson) ? p : null;
    };

    try {
      switch (action.type) {
        case 'log_body_weight': {
          const weightKg = action.data?.weightKg as number;
          const date = (action.data?.date as string) ?? new Date().toISOString().split('T')[0];
          if (!weightKg || !isFinite(weightKg)) return { success: false, message: 'Invalid weight value.' };

          const { error } = await supabase.from('progress_entries').upsert(
            { user_id: user.id, date, body_weight: weightKg, measurements_json: {} },
            { onConflict: 'user_id,date' },
          );
          if (error) throw error;
          return { success: true, message: `Done — logged ${weightKg} kg for ${date === new Date().toISOString().split('T')[0] ? 'today' : date}.` };
        }

        case 'log_workout_done': {
          const plan = getActivePlan();
          if (!plan) return { success: false, message: 'No active plan found.' };
          const rp   = plan.plan_json as UserPlan;
          const today = new Date().toISOString().split('T')[0];
          const completion = (action.data?.completion as number) ?? 100;
          const notes      = (action.data?.notes as string) ?? '';

          const todayEntry = rp.daily_schedule.find((d) => d.date === today);
          if (!todayEntry) return { success: false, message: "Nothing scheduled for today in your plan." };

          const updatedSchedule = rp.daily_schedule.map((day) => {
            if (day.date !== today) return day;
            return {
              ...day,
              status: (completion >= 80 ? 'completed' : 'partial') as 'completed' | 'partial',
              user_log: {
                logged_at:              new Date().toISOString(),
                completion_percentage:  completion,
                exercises_done:         day.exercises.map((ex) => ({
                  name:      ex.name,
                  sets_done: Array(ex.sets).fill({ reps: parseInt(ex.reps) || 10, weight: 0 }),
                })),
                notes,
              },
            };
          });

          const updatedPlan = { ...rp, daily_schedule: updatedSchedule };
          const { error } = await supabase.from('workout_plans').update({ plan_json: updatedPlan }).eq('id', plan.id);
          if (error) throw error;
          updatePlan({ ...plan, plan_json: updatedPlan });
          return { success: true, message: `Logged — today's session marked as ${completion >= 80 ? 'completed' : 'partial'} (${completion}%).` };
        }

        case 'change_day_type': {
          const plan = getActivePlan();
          if (!plan) return { success: false, message: 'No active plan found.' };
          const rp   = plan.plan_json as UserPlan;
          const date    = (action.data?.date as string) ?? new Date().toISOString().split('T')[0];
          const newType = (action.data?.newType as 'rest' | 'active_recovery' | 'workout') ?? 'rest';
          const focusMap = { rest: 'Rest Day', active_recovery: 'Active Recovery', workout: 'Training' };

          const updatedSchedule = rp.daily_schedule.map((day) => {
            if (day.date !== date) return day;
            return {
              ...day,
              day_type: newType,
              focus: day.day_type === newType ? day.focus : focusMap[newType],
            };
          });

          const updatedPlan = { ...rp, daily_schedule: updatedSchedule };
          const { error } = await supabase.from('workout_plans').update({ plan_json: updatedPlan }).eq('id', plan.id);
          if (error) throw error;
          updatePlan({ ...plan, plan_json: updatedPlan });
          const isToday = date === new Date().toISOString().split('T')[0];
          return { success: true, message: `Done — changed ${isToday ? 'today' : date} to ${focusMap[newType]}.` };
        }

        case 'extend_plan': {
          const plan = getActivePlan();
          if (!plan) return { success: false, message: 'No active plan found.' };
          const rp            = plan.plan_json as UserPlan;
          const additionalWeeks = (action.data?.additionalWeeks as number) ?? 2;

          const newEndDate = new Date(rp.end_date);
          newEndDate.setDate(newEndDate.getDate() + additionalWeeks * 7);
          const newEndStr = newEndDate.toISOString().split('T')[0];

          // Repeat last week's pattern for the extension
          const lastWeek    = rp.daily_schedule.slice(-7);
          const lastWeekNum = rp.daily_schedule[rp.daily_schedule.length - 1]?.week_number ?? Math.ceil(rp.total_days / 7);
          const extensionDays: RoadmapDay[] = [];

          for (let i = 0; i < additionalWeeks * 7; i++) {
            const template = lastWeek[i % lastWeek.length];
            const d = new Date(rp.end_date);
            d.setDate(d.getDate() + i + 1);
            extensionDays.push({
              ...template,
              date:         d.toISOString().split('T')[0],
              day_of_week:  d.toLocaleDateString('en-US', { weekday: 'long' }),
              week_number:  lastWeekNum + Math.floor(i / 7) + 1,
              status:       'upcoming',
              user_log:     undefined,
              ai_assessment: undefined,
            });
          }

          const updatedPlan = {
            ...rp,
            end_date:       newEndStr,
            total_days:     rp.total_days + additionalWeeks * 7,
            daily_schedule: [...rp.daily_schedule, ...extensionDays],
          };
          const { error } = await supabase.from('workout_plans').update({ plan_json: updatedPlan }).eq('id', plan.id);
          if (error) throw error;
          updatePlan({ ...plan, plan_json: updatedPlan });
          return { success: true, message: `Plan extended by ${additionalWeeks} week${additionalWeeks > 1 ? 's' : ''} — new end date ${newEndStr}.` };
        }

        case 'update_plan_status': {
          const plan = getActivePlan();
          if (!plan) return { success: false, message: 'No active plan found.' };
          const rp     = plan.plan_json as UserPlan;
          const status = (action.data?.status as 'active' | 'paused' | 'completed') ?? 'paused';

          const updatedPlan = { ...rp, status };
          const { error } = await supabase.from('workout_plans').update({ plan_json: updatedPlan }).eq('id', plan.id);
          if (error) throw error;
          updatePlan({ ...plan, plan_json: updatedPlan });
          return { success: true, message: `Plan ${status}.` };
        }

        case 'delete_plan': {
          const planId = (action.data?.planId as string) ?? activePlanId ?? plans[0]?.id;
          if (!planId) return { success: false, message: 'No plan found to delete.' };
          const planRow = plans.find((p) => p.id === planId);
          if (!planRow) return { success: false, message: 'Plan not found.' };
          const planName = (planRow.plan_json as UserPlan)?.name ?? 'Plan';

          const { error } = await supabase.from('workout_plans').delete().eq('id', planId);
          if (error) throw error;
          removePlan(planId);
          return { success: true, message: `"${planName}" has been deleted.` };
        }

        case 'set_active_plan': {
          const planId = action.data?.planId as string;
          if (!planId) return { success: false, message: 'No plan ID provided.' };
          const planRow = plans.find((p) => p.id === planId);
          if (!planRow) return { success: false, message: 'Plan not found.' };
          const planName = (planRow.plan_json as UserPlan)?.name ?? 'Plan';
          setActivePlanId(planId);
          return { success: true, message: `Switched active plan to "${planName}".` };
        }

        case 'update_day_exercises': {
          const plan = getActivePlan();
          if (!plan) return { success: false, message: 'No active plan found.' };
          const rp      = plan.plan_json as UserPlan;
          const date     = (action.data?.date as string) ?? new Date().toISOString().split('T')[0];
          const rawExs   = action.data?.exercises as Array<{ name: string; sets: number; reps: string; rest?: string; rest_seconds?: number }>;
          if (!rawExs?.length) return { success: false, message: 'No exercises provided.' };

          // Normalise to the Exercise shape required by RoadmapDay
          const exercises = rawExs.map((ex) => ({
            name:         ex.name,
            sets:         ex.sets,
            reps:         ex.reps,
            rest_seconds: ex.rest_seconds ?? 90,
            notes:        ex.rest,
          }));

          const updatedSchedule = rp.daily_schedule.map((day) => {
            if (day.date !== date) return day;
            return { ...day, exercises };
          });

          if (!updatedSchedule.some((d) => d.date === date)) {
            return { success: false, message: `No day found in plan for ${date}.` };
          }

          const updatedPlan = { ...rp, daily_schedule: updatedSchedule };
          const { error } = await supabase.from('workout_plans').update({ plan_json: updatedPlan }).eq('id', plan.id);
          if (error) throw error;
          updatePlan({ ...plan, plan_json: updatedPlan });
          const isToday = date === new Date().toISOString().split('T')[0];
          return { success: true, message: `Updated — ${isToday ? "today's" : date + "'s"} session now has ${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}.` };
        }

        case 'log_body_measurement': {
          const date = (action.data?.date as string) ?? new Date().toISOString().split('T')[0];
          const measurements = action.data?.measurements as Record<string, number>;
          if (!measurements || Object.keys(measurements).length === 0) {
            return { success: false, message: 'No measurements provided.' };
          }

          const { error } = await supabase.from('progress_entries').upsert(
            { user_id: user.id, date, measurements_json: measurements },
            { onConflict: 'user_id,date' },
          );
          if (error) throw error;
          const parts = Object.entries(measurements).map(([k, v]) => `${k.replace('_', ' ')}: ${v}cm`).join(', ');
          return { success: true, message: `Saved — logged ${parts} for ${date === new Date().toISOString().split('T')[0] ? 'today' : date}.` };
        }

        default:
          return { success: false, message: `Unknown action: ${action.type}` };
      }
    } catch (err: any) {
      return { success: false, message: err.message ?? 'Something went wrong.' };
    }
  }

  // ── Generate plan from profileSoFar ──────────────────────────────────────
  async function generatePlanFromProfile() {
    if (!user || !profileSoFar.goal) return;
    setGenerating(true);

    const timeframeWeeks = profileSoFar.timeframeWeeks ?? 12;
    const durationDays   = timeframeWeeks * 7;
    const startDate      = new Date().toISOString().split('T')[0];
    const endDate        = (() => {
      const d = new Date();
      d.setDate(d.getDate() + durationDays);
      return d.toISOString().split('T')[0];
    })();

    const goalDetails: GoalDetails = {
      experience_level: profileSoFar.experience ?? 'intermediate',
      equipment:        profileSoFar.equipment ?? 'full_gym',
      days_per_week:    profileSoFar.daysPerWeek ?? 3,
      session_duration: profileSoFar.sessionDurationMins ?? 45,
      limitations:      profileSoFar.constraints?.join(', ') ?? '',
      units:            profileSoFar.units ?? 'kg',
      current_weight:   profileSoFar.currentWeightKg ?? undefined,
      target_weight:    profileSoFar.goalWeightKg ?? undefined,
      event_type:       profileSoFar.eventType ?? undefined,
      dietary_note:     profileSoFar.dietPattern ?? undefined,
    };

    try {
      const { data, error } = await supabase.functions.invoke('create-roadmap', {
        body: { goal_type: profileSoFar.goal, goal_details: goalDetails, start_date: startDate, end_date: endDate, total_days: durationDays },
      });

      if (error || !data?.roadmap) throw new Error(error?.message ?? 'Plan generation failed');

      const dailySchedule = expandRoadmap(data.roadmap.phases, startDate, endDate);
      const planJson: UserPlan = {
        plan_type: 'roadmap',
        name: data.roadmap.plan_name ?? `${profileSoFar.goal.replace('_', ' ')} Plan`,
        goal_type: profileSoFar.goal, goal_details: goalDetails,
        start_date: startDate, end_date: endDate, original_end_date: endDate,
        total_days: durationDays, status: 'active', daily_schedule: dailySchedule,
        nutrition_note: data.roadmap.nutrition_note,
        ai_note: `Built from ForgeAI conversation on ${new Date().toLocaleDateString()}`,
        load_increase_active: false,
      };

      const { data: planRow, error: dbErr } = await supabase
        .from('workout_plans').insert({ user_id: user.id, plan_json: planJson }).select().single();
      if (dbErr || !planRow) throw new Error(dbErr?.message ?? 'Could not save plan');

      addPlan(planRow);

      const successMsg: ExtendedMessage = {
        role: 'assistant',
        content: `Your plan is ready. ${timeframeWeeks}-week ${profileSoFar.goal.replace('_', ' ')} roadmap${profileSoFar.goalWeightKg ? ` targeting ${profileSoFar.goalWeightKg} ${profileSoFar.units}` : ''}, ${profileSoFar.daysPerWeek ?? 3} days per week${profileSoFar.constraints?.length ? `, working around your ${profileSoFar.constraints[0]}` : ''}. Opening it now.`,
        action: { type: 'navigate_to_plan_detail_id', label: 'View My Plan', description: planJson.name, data: { planId: planRow.id } },
        timestamp: new Date().toISOString(),
      };
      const finalMsgs = [...messages, successMsg];
      setMessages(finalMsgs);
      await persist(finalMsgs);

      navigation.getParent()?.navigate('Plan' as any, { screen: 'PlanDetail', params: { planId: planRow.id } } as any);
    } catch (err: any) {
      const errMsg: ExtendedMessage = {
        role: 'assistant',
        content: `Something went wrong generating your plan: ${err.message}. Let's try again.`,
        timestamp: new Date().toISOString(),
      };
      const finalMsgs = [...messages, errMsg];
      setMessages(finalMsgs);
      await persist(finalMsgs);
    } finally {
      setGenerating(false);
    }
  }

  // ── Handle action card tap ────────────────────────────────────────────────
  async function handleAction(action: CoachAction) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (WRITE_ACTION_TYPES.includes(action.type)) {
      setExecuting(action.type);
      const result = await executeAction(action);
      setExecuting(null);

      const confirmMsg: ExtendedMessage = {
        role: 'assistant',
        content: result.success ? result.message : `Could not do that — ${result.message}`,
        timestamp: new Date().toISOString(),
      };
      const finalMsgs = [...messages, confirmMsg];
      setMessages(finalMsgs);
      await persist(finalMsgs);

      // Rebuild context so AI knows about the change on the next turn
      if (result.success && user) {
        supabase.from('progress_entries').select('date, body_weight').eq('user_id', user.id).order('date', { ascending: true }).limit(20)
          .then(({ data }) => setContext(buildContext(profile, plans, activePlanId, logs, data ?? [])));
      }
      return;
    }

    const parent = navigation.getParent();
    switch (action.type) {
      case 'generate_plan_now':
        generatePlanFromProfile();
        break;
      case 'navigate_to_plan_wizard':
        parent?.navigate('Plan' as any, {
          screen: 'PlanWizard',
          params: phase !== 'qa' ? { prefill: profileSoFar } : undefined,
        } as any);
        break;
      case 'navigate_to_plan_detail':
      case 'navigate_to_plan_detail_id': {
        const planId = (action.data?.planId as string);
        if (planId) {
          parent?.navigate('Plan' as any, { screen: 'PlanDetail', params: { planId } } as any);
        } else {
          const plan = activePlanId ? plans.find((p) => p.id === activePlanId) : plans[0];
          if (plan) parent?.navigate('Plan' as any, { screen: 'PlanDetail', params: { planId: plan.id } } as any);
          else parent?.navigate('Plan' as any, { screen: 'PlanList' } as any);
        }
        break;
      }
      case 'navigate_to_day_log': {
        const plan  = activePlanId ? plans.find((p) => p.id === activePlanId) : plans[0];
        const today = new Date().toISOString().split('T')[0];
        if (plan) parent?.navigate('Plan' as any, { screen: 'DayLog', params: { planId: plan.id, date: today } } as any);
        break;
      }
      case 'navigate_to_progress':
        parent?.navigate('Progress' as any);
        break;
      case 'navigate_to_reports':
        parent?.navigate('Progress' as any);
        break;
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(text?: string) {
    const content = text ?? input.trim();
    if (!content || loading || generatingPlan) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ExtendedMessage = { role: 'user', content, timestamp: new Date().toISOString() };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: {
          messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
          context,
          profileSoFar: profileSoFar as any,
        },
      });

      let assistantMsg: ExtendedMessage;

      if (error || !data) {
        console.error('[AICoach] invoke error:', error?.message ?? error, '| data:', data);
        assistantMsg = {
          role: 'assistant',
          content: "Something went wrong on my end — try sending that again.",
          timestamp: new Date().toISOString(),
        };
      } else {
        const newProfile = (data.profileSoFar ?? profileSoFar) as ProfileSoFar;
        const newPhase   = (data.phase ?? 'qa') as CoachPhase;
        let   reply      = data.reply ?? "Couldn't generate a response. Try again.";
        let   action     = data.action ?? null;

        // Client-side safety net for dangerous weight goals
        if (
          newPhase !== 'qa' &&
          newProfile.currentWeightKg !== null &&
          newProfile.goalWeightKg !== null &&
          newProfile.goal === 'weight_loss' &&
          !data.validationIssue
        ) {
          const check = validateWeightGoal(newProfile.currentWeightKg, newProfile.goalWeightKg, newProfile.timeframeWeeks ?? undefined);
          if (!check.valid && check.severity === 'error') {
            reply  = `${reply}\n\nNote: ${check.message}`;
            action = null;
          }
        }

        // Gate: never show generate_plan_now action during discovery
        if (newPhase === 'discovery' && action?.type === 'generate_plan_now') action = null;

        assistantMsg = {
          role: 'assistant',
          content: reply,
          thinking: data.thinking || undefined,
          action,
          phase: newPhase,
          timestamp: new Date().toISOString(),
        };

        setProfileSoFar(newProfile);
        setPhase(newPhase);

        const finalMsgs = [...nextMsgs, assistantMsg];
        setMessages(finalMsgs);
        await persist(finalMsgs, newProfile, newPhase);
        setLoading(false);
        return;
      }

      const finalMsgs = [...nextMsgs, assistantMsg];
      setMessages(finalMsgs);
      await persist(finalMsgs);
    } catch (catchErr) {
      console.error('[AICoach] sendMessage threw:', catchErr);
      const errMsg: ExtendedMessage = {
        role: 'assistant', content: 'Something went wrong — try sending that again.', timestamp: new Date().toISOString(),
      };
      const finalMsgs = [...nextMsgs, errMsg];
      setMessages(finalMsgs);
      await persist(finalMsgs);
    }
    setLoading(false);
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#0a0a0f' }} />;

  const isBusy = loading || generatingPlan;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{
          paddingHorizontal: 16, paddingVertical: 12,
          borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.06)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <LinearGradient
            colors={['#bf5af2', '#0084ff']}
            style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
          >
            <Bot size={20} color="#fff" />
          </LinearGradient>

          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>ForgeAI</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' }} />
              <Text style={{ color: '#34d399', fontSize: 12 }}>
                {phase === 'discovery'
                  ? 'Learning your goals'
                  : phase === 'ready_for_plan'
                    ? 'Ready to build your plan'
                    : 'Full access to your app'}
              </Text>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg, i) => (
              <View key={i} style={{
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                marginBottom: 16, gap: 10, alignItems: 'flex-start',
              }}>
                {msg.role === 'assistant' && (
                  <View style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: 'rgba(191,90,242,0.2)',
                    borderWidth: 1, borderColor: 'rgba(191,90,242,0.3)',
                    alignItems: 'center', justifyContent: 'center', marginTop: 2,
                  }}>
                    <Bot size={16} color="#bf5af2" />
                  </View>
                )}

                <View style={{ maxWidth: '80%' }}>
                  <View style={{
                    borderRadius: 18,
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 18,
                    borderBottomLeftRadius:  msg.role === 'assistant' ? 4 : 18,
                    overflow: 'hidden',
                  }}>
                    {msg.role === 'user' ? (
                      <LinearGradient
                        colors={['#ff5500', '#ff2d55']}
                        style={{ paddingHorizontal: 16, paddingVertical: 12 }}
                      >
                        <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>{msg.content}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={{
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                        paddingHorizontal: 16, paddingVertical: 12,
                      }}>
                        <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>{msg.content}</Text>
                      </View>
                    )}
                  </View>

                  {msg.role === 'assistant' && msg.action ? (
                    <ActionCard
                      action={msg.action}
                      onPress={() => handleAction(msg.action!)}
                      busy={executingAction === msg.action.type || (generatingPlan && msg.action.type === 'generate_plan_now')}
                    />
                  ) : null}

                  <Text style={{
                    color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 4,
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                  }}>
                    {formatTime(msg.timestamp)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Loading state */}
            {isBusy && (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: 'rgba(191,90,242,0.2)',
                  borderWidth: 1, borderColor: 'rgba(191,90,242,0.3)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={16} color="#bf5af2" />
                </View>
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 18, borderBottomLeftRadius: 4,
                  paddingHorizontal: 16, paddingVertical: 14,
                }}>
                  {generatingPlan
                    ? <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Building your plan...</Text>
                    : <TypingDots />
                  }
                </View>
              </View>
            )}

            {/* Suggestion chips on fresh chats */}
            {messages.length <= 1 && !isBusy && (
              <View style={{ marginTop: 8 }}>
                <Text style={{
                  color: 'rgba(255,255,255,0.3)', fontSize: 12,
                  marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase',
                }}>
                  Try asking...
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => sendMessage(s)}
                      style={{
                        backgroundColor: 'rgba(255,85,0,0.08)',
                        borderWidth: 1, borderColor: 'rgba(255,85,0,0.2)',
                        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
                      }}
                    >
                      <Text style={{ color: '#ff8c00', fontSize: 13 }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Disclaimer */}
          <Text style={{
            fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center',
            paddingHorizontal: 20, paddingTop: 6,
          }}>
            ForgeAI provides general fitness guidance, not medical advice. Consult a healthcare professional for medical decisions.
          </Text>

          {/* Input bar */}
          <View style={{
            flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12,
            paddingBottom: Platform.OS === 'android' ? 16 : 12,
            borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
            backgroundColor: '#0a0a0f',
          }}>
            <View style={{
              flex: 1, backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
              flexDirection: 'row', alignItems: 'center',
            }}>
              <TextInput
                style={{ flex: 1, color: '#fff', fontSize: 15 }}
                placeholder="Ask ForgeAI anything..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage()}
                editable={!isBusy}
              />
            </View>
            <TouchableOpacity
              onPress={() => sendMessage()}
              disabled={!input.trim() || isBusy}
              style={{ borderRadius: 20, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={input.trim() && !isBusy
                  ? ['#ff5500', '#ff2d55']
                  : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
              >
                <ArrowUp size={20} color="#fff" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
