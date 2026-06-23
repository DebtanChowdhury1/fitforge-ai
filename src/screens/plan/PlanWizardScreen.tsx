import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Animated, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChevronLeft, ChevronRight, TrendingDown, Target,
  Activity, Zap, Check, Sparkles,
} from 'lucide-react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FadeIn } from '../../components/FadeIn';
import { usePlanStore, expandRoadmap } from '../../store/planStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { GoalType, GoalDetails, AIRoadmapPhase, UserPlan, PlanStackParamList } from '../../types';
import { validateWeightGoal } from '../../lib/validation/healthGoals';

type Props = NativeStackScreenProps<PlanStackParamList, 'PlanWizard'>;
const { width: W } = Dimensions.get('window');

// ── Constants ─────────────────────────────────────────────────────────────────

const GOALS: { id: GoalType; label: string; sub: string; color: string; Icon: React.ComponentType<any> }[] = [
  { id: 'weight_loss',     label: 'Lose Weight',    sub: 'Burn fat, keep muscle',     color: '#ff2d55', Icon: TrendingDown },
  { id: 'muscle_gain',     label: 'Build Muscle',   sub: 'Strength & mass',           color: '#bf5af2', Icon: Target       },
  { id: 'endurance',       label: 'Endurance',      sub: 'Cardio & stamina',          color: '#00d4ff', Icon: Activity     },
  { id: 'general_fitness', label: 'General Fitness', sub: 'Health & energy',          color: '#34d399', Icon: Zap          },
];

const DURATIONS = [
  { label: '4 Weeks',   days: 28  },
  { label: '8 Weeks',   days: 56  },
  { label: '12 Weeks',  days: 84  },
  { label: '16 Weeks',  days: 112 },
];

const EQUIPMENT_OPTIONS = [
  { id: 'none',          label: 'No Equipment',   sub: 'Bodyweight only'          },
  { id: 'home_dumbbells', label: 'Home Gym',      sub: 'Dumbbells & bands'        },
  { id: 'full_gym',      label: 'Full Gym',        sub: 'Barbells, cables, machines' },
];

const LEVEL_OPTIONS = [
  { id: 'beginner',     label: 'Beginner',     sub: 'New to training'             },
  { id: 'intermediate', label: 'Intermediate', sub: '1-3 years of training'       },
  { id: 'advanced',     label: 'Advanced',     sub: '3+ years, serious training'  },
];

const DAYS_OPTIONS = [3, 4, 5, 6];
const DURATION_OPTIONS = [30, 45, 60, 75, 90];

function toKg(value: number, units: 'kg' | 'lb'): number {
  return units === 'lb' ? value * 0.453592 : value;
}

// ── Picker row ────────────────────────────────────────────────────────────────
function PickRow<T extends string | number>({
  options, value, onSelect, labelFn, color = '#FF6B35',
}: {
  options: T[]; value: T; onSelect: (v: T) => void; labelFn?: (v: T) => string; color?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <TouchableOpacity
            key={String(opt)}
            onPress={() => onSelect(opt)}
            style={[
              ss.pickOption,
              active ? { backgroundColor: color + '20', borderColor: color } : {},
            ]}
          >
            {active && <Check size={12} color={color} />}
            <Text style={[ss.pickText, { color: active ? color : 'rgba(255,255,255,0.45)' }]}>
              {labelFn ? labelFn(opt) : String(opt)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', suffix, error }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; keyboardType?: any; suffix?: string; error?: string | null;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={ss.fieldLabel}>{label}</Text>
      <View style={[
        ss.inputWrap,
        error ? { borderColor: 'rgba(255,59,48,0.6)', backgroundColor: 'rgba(255,59,48,0.06)' } : {},
      ]}>
        <TextInput
          style={ss.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.2)"
          keyboardType={keyboardType}
        />
        {suffix && <Text style={ss.inputSuffix}>{suffix}</Text>}
      </View>
      {error ? (
        <Text style={{ color: '#ff3b30', fontSize: 12, marginTop: 6, lineHeight: 17 }}>{error}</Text>
      ) : null}
    </View>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────
const TOTAL_STEPS = 5;

export function PlanWizardScreen({ route, navigation }: Props) {
  const prefill = route.params?.prefill;

  const { user }    = useAuthStore();
  const { addPlan } = usePlanStore();

  const [step, setStep]             = useState(0);
  const [goalType, setGoalType]     = useState<GoalType>('weight_loss');
  const [currentW, setCurrentW]     = useState('');
  const [targetW, setTargetW]       = useState('');
  const [units, setUnits]           = useState<'kg' | 'lb'>('kg');
  const [eventType, setEventType]   = useState('5K');
  const [level, setLevel]           = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [equipment, setEquipment]   = useState<'none' | 'home_dumbbells' | 'full_gym'>('full_gym');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [sessionMins, setSessionMins] = useState(45);
  const [limitations, setLimitations] = useState('');
  const [durationDays, setDurationDays] = useState(84);
  const [generating, setGenerating] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  // Pre-populate from ForgeAI discovery profile if provided
  useEffect(() => {
    if (!prefill) return;
    if (prefill.goal)       setGoalType(prefill.goal);
    if (prefill.units)      setUnits(prefill.units);
    if (prefill.currentWeightKg !== null && prefill.currentWeightKg !== undefined) {
      setCurrentW(String(
        prefill.units === 'lb'
          ? Math.round(prefill.currentWeightKg * 2.205)
          : prefill.currentWeightKg,
      ));
    }
    if (prefill.goalWeightKg !== null && prefill.goalWeightKg !== undefined) {
      setTargetW(String(
        prefill.units === 'lb'
          ? Math.round(prefill.goalWeightKg * 2.205)
          : prefill.goalWeightKg,
      ));
    }
    if (prefill.experience)      setLevel(prefill.experience);
    if (prefill.equipment)       setEquipment(prefill.equipment);
    if (prefill.daysPerWeek !== null && prefill.daysPerWeek !== undefined) {
      const clamped = Math.max(3, Math.min(6, prefill.daysPerWeek));
      setDaysPerWeek(clamped);
    }
    if (prefill.sessionDurationMins !== null && prefill.sessionDurationMins !== undefined) {
      const closest = [30, 45, 60, 75, 90].reduce((prev, curr) =>
        Math.abs(curr - prefill.sessionDurationMins!) < Math.abs(prev - prefill.sessionDurationMins!) ? curr : prev
      );
      setSessionMins(closest);
    }
    if (prefill.constraints?.length) setLimitations(prefill.constraints.join(', '));
    if (prefill.eventType)       setEventType(prefill.eventType);
    if (prefill.timeframeWeeks !== null && prefill.timeframeWeeks !== undefined) {
      const days = prefill.timeframeWeeks * 7;
      const closestDuration = [28, 56, 84, 112].reduce((prev, curr) =>
        Math.abs(curr - days) < Math.abs(prev - days) ? curr : prev
      );
      setDurationDays(closestDuration);
    }
  }, [prefill]);

  const goalColor = GOALS.find((g) => g.id === goalType)?.color ?? '#FF6B35';

  function animateStep(next: number) {
    const dir = next > step ? 1 : -1;
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -dir * 40, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir * 40, duration: 0, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 220, friction: 10, useNativeDriver: true }),
    ]).start();
    setStep(next);
  }

  function validateAndProceed() {
    setWeightError(null);
    const showWeightFields = goalType === 'weight_loss' || goalType === 'muscle_gain';

    if (showWeightFields && currentW && targetW) {
      const curKg  = toKg(parseFloat(currentW), units);
      const goalKg = toKg(parseFloat(targetW), units);

      if (!isFinite(curKg) || !isFinite(goalKg)) {
        setWeightError('Please enter valid numbers for both weight fields.');
        return;
      }

      const result = validateWeightGoal(curKg, goalKg);
      if (!result.valid && result.severity === 'error') {
        setWeightError(result.message ?? 'Invalid weight goal.');
        return;
      }
    }
    animateStep(step + 1);
  }

  const startDate = new Date().toISOString().split('T')[0];
  const endDate   = (() => {
    const d = new Date();
    d.setDate(d.getDate() + durationDays);
    return d.toISOString().split('T')[0];
  })();

  async function handleGenerate() {
    if (!user) return;
    setGenerating(true);

    const goalDetails: GoalDetails = {
      experience_level: level,
      equipment,
      days_per_week: daysPerWeek,
      session_duration: sessionMins,
      limitations,
      units,
      current_weight: currentW ? parseFloat(currentW) : undefined,
      target_weight:  targetW  ? parseFloat(targetW)  : undefined,
      event_type: goalType === 'endurance' ? eventType : undefined,
    };

    try {
      const { data, error } = await supabase.functions.invoke('create-roadmap', {
        body: {
          goal_type: goalType,
          goal_details: goalDetails,
          start_date: startDate,
          end_date: endDate,
          total_days: durationDays,
        },
      });

      if (error || !data?.roadmap) throw new Error(error?.message ?? 'AI failed to generate roadmap');

      const roadmap = data.roadmap;
      const phases: AIRoadmapPhase[] = roadmap.phases;
      const dailySchedule = expandRoadmap(phases, startDate, endDate);

      const planJson: UserPlan = {
        plan_type: 'roadmap',
        name: roadmap.plan_name ?? `${GOALS.find((g) => g.id === goalType)?.label} Plan`,
        goal_type: goalType,
        goal_details: goalDetails,
        start_date: startDate,
        end_date: endDate,
        original_end_date: endDate,
        total_days: durationDays,
        status: 'active',
        daily_schedule: dailySchedule,
        nutrition_note: roadmap.nutrition_note,
        ai_note: undefined,
        load_increase_active: false,
      };

      const { data: planRow, error: dbErr } = await supabase
        .from('workout_plans')
        .insert({ user_id: user.id, plan_json: planJson })
        .select()
        .single();

      if (dbErr || !planRow) throw new Error(dbErr?.message ?? 'Could not save plan');

      addPlan(planRow);
      navigation.replace('PlanDetail', { planId: planRow.id });
    } catch (err: any) {
      Alert.alert('Could not generate plan', err.message);
    } finally {
      setGenerating(false);
    }
  }

  // ── Step content ─────────────────────────────────────────────────────────────

  function StepGoal() {
    return (
      <View style={{ gap: 12 }}>
        <Text style={ss.stepTitle}>What's your goal?</Text>
        <Text style={ss.stepSub}>Choose one to tailor your roadmap</Text>
        {GOALS.map((g) => {
          const active = goalType === g.id;
          const { Icon } = g;
          return (
            <AnimatedPressable key={g.id} onPress={() => setGoalType(g.id)} scaleDown={0.97}>
              <LinearGradient
                colors={active ? [g.color + '22', g.color + '10'] : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']}
                style={[ss.goalCard, active && { borderColor: g.color + '60' }]}
              >
                <View style={[ss.goalCardIcon, { backgroundColor: g.color + '18', borderColor: g.color + '30' }]}>
                  <Icon size={22} color={g.color} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ss.goalCardTitle, active && { color: '#fff' }]}>{g.label}</Text>
                  <Text style={ss.goalCardSub}>{g.sub}</Text>
                </View>
                {active && (
                  <View style={[ss.checkCircle, { backgroundColor: g.color }]}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </LinearGradient>
            </AnimatedPressable>
          );
        })}
        {prefill && (
          <Text style={{ color: 'rgba(255,107,53,0.6)', fontSize: 12, marginTop: 4 }}>
            Pre-filled from your ForgeAI conversation — adjust anything before generating
          </Text>
        )}
      </View>
    );
  }

  function StepGoalDetails() {
    const showWeightFields = goalType === 'weight_loss' || goalType === 'muscle_gain';
    return (
      <View>
        <Text style={ss.stepTitle}>Tell us about yourself</Text>
        <Text style={[ss.stepSub, { marginBottom: 24 }]}>The more detail, the smarter your plan</Text>

        {showWeightFields && (
          <View style={{ gap: 0 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              {(['kg', 'lb'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  onPress={() => { setUnits(u); setWeightError(null); }}
                  style={[ss.unitBtn, units === u && { backgroundColor: 'rgba(255,107,53,0.2)', borderColor: '#FF6B35' }]}
                >
                  <Text style={[ss.unitBtnText, units === u && { color: '#FF6B35' }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Field
              label="Current Weight"
              value={currentW}
              onChangeText={(v) => { setCurrentW(v); setWeightError(null); }}
              placeholder="e.g. 82"
              keyboardType="numeric"
              suffix={units}
            />
            <Field
              label="Target Weight"
              value={targetW}
              onChangeText={(v) => { setTargetW(v); setWeightError(null); }}
              placeholder="e.g. 72"
              keyboardType="numeric"
              suffix={units}
              error={weightError}
            />
          </View>
        )}

        {goalType === 'endurance' && (
          <View style={{ marginBottom: 16 }}>
            <Text style={ss.fieldLabel}>Training For</Text>
            <PickRow options={['5K', '10K', 'Half Marathon', 'Marathon', 'Cycling', 'General']} value={eventType} onSelect={setEventType} color="#00d4ff" />
          </View>
        )}

        <View style={{ marginBottom: 16 }}>
          <Text style={ss.fieldLabel}>Experience Level</Text>
          {LEVEL_OPTIONS.map((opt) => {
            const active = level === opt.id;
            return (
              <TouchableOpacity key={opt.id} onPress={() => setLevel(opt.id as any)} style={[ss.levelOption, active && { backgroundColor: goalColor + '15', borderColor: goalColor + '50' }]}>
                <View style={[ss.radio, active && { backgroundColor: goalColor, borderColor: goalColor }]}>
                  {active && <View style={ss.radioDot} />}
                </View>
                <View>
                  <Text style={[ss.levelTitle, active && { color: '#fff' }]}>{opt.label}</Text>
                  <Text style={ss.levelSub}>{opt.sub}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={ss.fieldLabel}>Any injuries or limitations?</Text>
          <View style={ss.textAreaWrap}>
            <TextInput
              style={ss.textArea}
              value={limitations}
              onChangeText={setLimitations}
              placeholder="e.g. bad knees, lower back issue..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
            />
          </View>
        </View>
      </View>
    );
  }

  function StepSchedule() {
    return (
      <View>
        <Text style={ss.stepTitle}>Your Schedule</Text>
        <Text style={[ss.stepSub, { marginBottom: 24 }]}>How you'll train each week</Text>

        <View style={{ marginBottom: 20 }}>
          <Text style={ss.fieldLabel}>Equipment Access</Text>
          {EQUIPMENT_OPTIONS.map((opt) => {
            const active = equipment === opt.id;
            return (
              <TouchableOpacity key={opt.id} onPress={() => setEquipment(opt.id as any)} style={[ss.levelOption, active && { backgroundColor: goalColor + '15', borderColor: goalColor + '50' }]}>
                <View style={[ss.radio, active && { backgroundColor: goalColor, borderColor: goalColor }]}>
                  {active && <View style={ss.radioDot} />}
                </View>
                <View>
                  <Text style={[ss.levelTitle, active && { color: '#fff' }]}>{opt.label}</Text>
                  <Text style={ss.levelSub}>{opt.sub}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={ss.fieldLabel}>Days Per Week</Text>
          <PickRow options={DAYS_OPTIONS} value={daysPerWeek} onSelect={setDaysPerWeek} labelFn={(v) => `${v} days`} color={goalColor} />
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={ss.fieldLabel}>Session Duration</Text>
          <PickRow options={DURATION_OPTIONS} value={sessionMins} onSelect={setSessionMins} labelFn={(v) => `${v}min`} color={goalColor} />
        </View>
      </View>
    );
  }

  function StepDuration() {
    return (
      <View>
        <Text style={ss.stepTitle}>Plan Duration</Text>
        <Text style={[ss.stepSub, { marginBottom: 24 }]}>How long do you want this roadmap?</Text>

        <View style={{ gap: 10, marginBottom: 24 }}>
          {DURATIONS.map((d) => {
            const active = durationDays === d.days;
            const end    = new Date();
            end.setDate(end.getDate() + d.days);
            return (
              <AnimatedPressable key={d.days} onPress={() => setDurationDays(d.days)} scaleDown={0.97}>
                <LinearGradient
                  colors={active ? [goalColor + '22', goalColor + '08'] : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']}
                  style={[ss.durationCard, active && { borderColor: goalColor + '60' }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[ss.durationLabel, active && { color: '#fff' }]}>{d.label}</Text>
                    <Text style={ss.durationEnd}>
                      Ends {end.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  {active && (
                    <View style={[ss.checkCircle, { backgroundColor: goalColor }]}>
                      <Check size={12} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </LinearGradient>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
    );
  }

  function StepReview() {
    const g = GOALS.find((x) => x.id === goalType)!;
    const { Icon } = g;
    const endD = new Date();
    endD.setDate(endD.getDate() + durationDays);

    return (
      <View>
        <Text style={ss.stepTitle}>Ready to generate</Text>
        <Text style={[ss.stepSub, { marginBottom: 20 }]}>Your personalized roadmap is moments away</Text>

        <LinearGradient colors={[g.color + '18', g.color + '06']} style={[ss.reviewCard, { borderColor: g.color + '30' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <View style={[ss.goalCardIcon, { backgroundColor: g.color + '20', borderColor: g.color + '40' }]}>
              <Icon size={24} color={g.color} strokeWidth={1.8} />
            </View>
            <View>
              <Text style={{ color: g.color, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>{g.label.toUpperCase()}</Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 }}>{durationDays / 7}-Week Roadmap</Text>
            </View>
          </View>

          {[
            ['Start Date', new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })],
            ['End Date', endD.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })],
            ['Training Days', `${daysPerWeek}x / week`],
            ['Session Length', `${sessionMins} minutes`],
            ['Equipment', EQUIPMENT_OPTIONS.find((e) => e.id === equipment)?.label ?? equipment],
            ['Level', level.charAt(0).toUpperCase() + level.slice(1)],
            ...(currentW && targetW ? [['Weight Goal', `${currentW} → ${targetW} ${units}`]] : []),
          ].map(([k, v]) => (
            <View key={k} style={ss.reviewRow}>
              <Text style={ss.reviewKey}>{k}</Text>
              <Text style={ss.reviewVal}>{v}</Text>
            </View>
          ))}
        </LinearGradient>
      </View>
    );
  }

  const STEPS = [StepGoal, StepGoalDetails, StepSchedule, StepDuration, StepReview];
  const StepComponent = STEPS[step];

  if (generating) {
    const g = GOALS.find((x) => x.id === goalType)!;
    return (
      <View style={[ss.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <LinearGradient colors={[g.color + '20', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator color={g.color} size="large" />
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 20 }}>Building Your Roadmap</Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          AI is generating your day-by-day plan. This takes 5-10 seconds.
        </Text>
      </View>
    );
  }

  return (
    <View style={ss.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Progress bar */}
        <View style={ss.topBar}>
          <TouchableOpacity onPress={() => step > 0 ? animateStep(step - 1) : navigation.goBack()} style={{ padding: 4 }}>
            <ChevronLeft size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
          <View style={ss.progressBarBg}>
            <Animated.View style={[ss.progressBarFill, {
              width: `${((step + 1) / TOTAL_STEPS) * 100}%` as any,
              backgroundColor: goalColor,
            }]} />
          </View>
          <Text style={ss.stepCounter}>{step + 1}/{TOTAL_STEPS}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            <StepComponent />
          </Animated.View>
        </ScrollView>

        {/* Bottom navigation */}
        <View style={ss.bottomBar}>
          {step < TOTAL_STEPS - 1 ? (
            <AnimatedPressable
              onPress={() => step === 1 ? validateAndProceed() : animateStep(step + 1)}
              scaleDown={0.96}
              haptic
              style={{ flex: 1 }}
            >
              <LinearGradient colors={[goalColor, goalColor + 'cc']} style={ss.nextBtn}>
                <Text style={ss.nextBtnText}>Continue</Text>
                <ChevronRight size={18} color="#fff" strokeWidth={2.5} />
              </LinearGradient>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable onPress={handleGenerate} scaleDown={0.96} haptic style={{ flex: 1 }}>
              <LinearGradient colors={['#FF6B35', '#ff2d55']} style={ss.nextBtn}>
                <Sparkles size={18} color="#fff" />
                <Text style={ss.nextBtnText}>Generate My Roadmap</Text>
              </LinearGradient>
            </AnimatedPressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  progressBarBg:   { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: 4, borderRadius: 2 },
  stepCounter:     { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '600', width: 28, textAlign: 'right' },

  scroll:   { padding: 24, paddingTop: 8, paddingBottom: 40 },
  bottomBar: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },

  stepTitle: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 },
  stepSub:   { color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 20 },

  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  goalCardIcon: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  goalCardTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '800' },
  goalCardSub:   { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
  checkCircle:   { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  fieldLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 16 },
  input:      { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', paddingVertical: 14 },
  inputSuffix: { color: '#FF6B35', fontWeight: '700', fontSize: 14 },

  unitBtn:     { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  unitBtnText: { color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 14 },

  levelOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 8 },
  radio:       { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  radioDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  levelTitle:  { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700' },
  levelSub:    { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 1 },

  textAreaWrap: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14 },
  textArea:     { color: '#fff', fontSize: 14, minHeight: 72, textAlignVertical: 'top' },

  pickOption: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 14, paddingVertical: 9 },
  pickText:   { fontSize: 13, fontWeight: '700' },

  durationCard:  { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  durationLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: '800' },
  durationEnd:   { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 2 },

  reviewCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
  reviewRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  reviewKey:  { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  reviewVal:  { color: '#fff', fontWeight: '700', fontSize: 13 },

  nextBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 18 },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
});
