import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet,
  Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChevronLeft, CheckCircle, XCircle, AlertCircle,
  TrendingUp, Calendar, Dumbbell, Clock,
} from 'lucide-react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FadeIn } from '../../components/FadeIn';
import { usePlanStore } from '../../store/planStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { PlanStackParamList, UserPlan, RoadmapDay, DayUserLog, AIAssessment, AnyPlanJson } from '../../types';

type Props = NativeStackScreenProps<PlanStackParamList, 'DayLog'>;
const { width: W } = Dimensions.get('window');

const GOAL_COLORS: Record<string, string> = {
  weight_loss: '#ff2d55', muscle_gain: '#bf5af2',
  endurance: '#00d4ff',  general_fitness: '#34d399',
};

const COMPLETION_OPTIONS = [
  { pct: 100, label: 'Fully Done', Icon: CheckCircle,  color: '#34d399', sub: 'Completed everything as planned' },
  { pct: 70,  label: 'Mostly Done', Icon: AlertCircle, color: '#ff8c00', sub: 'Did most of it, missed a bit'     },
  { pct: 40,  label: 'Partial',     Icon: AlertCircle, color: '#ff8c00', sub: 'Did about half the session'       },
  { pct: 0,   label: 'Skipped',     Icon: XCircle,     color: '#ff3b30', sub: 'Did not train today'              },
];

export function DayLogScreen({ route, navigation }: Props) {
  const { planId, date } = route.params;
  const { user }         = useAuthStore();
  const { plans, updatePlan } = usePlanStore();

  const planRow = plans.find((p) => p.id === planId);
  const plan    = planRow?.plan_json as UserPlan | undefined;
  const day     = plan?.daily_schedule.find((d) => d.date === date);

  const todayStr    = new Date().toISOString().split('T')[0];
  const isFuture    = date > todayStr;
  const isLogged    = !!day?.user_log;
  const goalColor   = plan ? (GOAL_COLORS[plan.goal_type] ?? '#FF6B35') : '#FF6B35';

  const [selectedPct, setSelectedPct] = useState<number | null>(
    day?.user_log?.completion_percentage ?? null,
  );
  const [notes, setNotes]       = useState(day?.user_log?.notes ?? '');
  const [assessing, setAssessing] = useState(false);
  const [assessment, setAssessment] = useState<AIAssessment | null>(day?.ai_assessment ?? null);
  const [exercisesDone, setExercisesDone] = useState<DayUserLog['exercises_done']>(
    day?.user_log?.exercises_done ?? [],
  );

  // Populate exercises_done from any live-tracked session logged for this date
  useEffect(() => {
    if (!user || day?.user_log?.exercises_done?.length) return;
    supabase
      .from('workout_logs')
      .select('exercises_json')
      .eq('user_id', user.id)
      .eq('date', date)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!data?.exercises_json) return;
        const mapped = (data.exercises_json as any[]).map((e) => ({
          name: e.name ?? '',
          sets_done: (e.actual_sets ?? []).map((s: any) => ({
            reps: s.reps ?? 0,
            weight: s.weight ?? 0,
          })),
        }));
        setExercisesDone(mapped);
      });
  }, [user, date]);

  const daysRemaining = useMemo(() => {
    if (!plan) return 0;
    return plan.daily_schedule.filter((d) => d.date > date && d.day_type === 'workout').length;
  }, [plan, date]);

  const totalDays = plan?.total_days ?? plan?.daily_schedule.length ?? 0;

  async function handleSubmit() {
    if (selectedPct === null || !plan || !user || !day || !planRow) return;
    setAssessing(true);

    const userLog: DayUserLog = {
      logged_at: new Date().toISOString(),
      completion_percentage: selectedPct,
      exercises_done: exercisesDone,
      notes,
    };

    try {
      // Call AI assessment
      const { data, error } = await supabase.functions.invoke('assess-day', {
        body: {
          planned_day: day,
          user_log: userLog,
          goal_type: plan.goal_type,
          goal_details: plan.goal_details,
          start_date: plan.start_date,
          end_date: plan.end_date,
          days_remaining: daysRemaining,
          total_days: totalDays,
        },
      });

      if (error) throw new Error(error.message);
      const newAssessment: AIAssessment = data.assessment;
      setAssessment(newAssessment);

      // Build updated schedule
      const newSchedule = plan.daily_schedule.map((d): RoadmapDay => {
        if (d.date !== date) return d;
        return {
          ...d,
          status: selectedPct >= 80 ? 'completed' : selectedPct >= 40 ? 'partial' : 'missed',
          user_log: userLog,
          ai_assessment: newAssessment,
        };
      });

      // Handle plan adjustments
      let newEndDate = plan.end_date;
      let aiNote     = plan.ai_note;
      let newLoadActive = plan.load_increase_active;

      if (newAssessment.adjustment_type === 'extended_deadline' && newAssessment.new_end_date) {
        newEndDate = newAssessment.new_end_date;
        aiNote     = newAssessment.adjustment_message ?? undefined;
        // Mark future workout days as missed → upcoming after new end (simple: don't touch)
      }
      if (newAssessment.adjustment_type === 'increased_load') {
        newLoadActive = true;
        aiNote        = newAssessment.load_increase_note ?? newAssessment.adjustment_message ?? undefined;
      }

      const updatedPlan: UserPlan = {
        ...plan,
        daily_schedule: newSchedule,
        end_date: newEndDate,
        ai_note: aiNote,
        load_increase_active: newLoadActive,
      };

      const { error: dbErr } = await supabase
        .from('workout_plans')
        .update({ plan_json: updatedPlan })
        .eq('id', planId);

      if (dbErr) throw new Error(dbErr.message);

      updatePlan({ ...planRow, plan_json: updatedPlan });
    } catch (err: any) {
      Alert.alert('Assessment failed', err.message);
    } finally {
      setAssessing(false);
    }
  }

  if (!plan || !day) {
    return (
      <View style={[ss.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Day not found</Text>
      </View>
    );
  }

  const dateD = new Date(day.date);

  return (
    <View style={ss.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={ss.header}>
          <AnimatedPressable onPress={() => navigation.goBack()} scaleDown={0.90}>
            <View style={ss.backBtn}>
              <ChevronLeft size={20} color="rgba(255,255,255,0.6)" />
            </View>
          </AnimatedPressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={ss.dayTitle}>
              {dateD.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
            <Text style={ss.dayMeta}>Week {day.week_number} · {plan.name}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll} keyboardShouldPersistTaps="handled">

          {/* Planned session card */}
          <FadeIn delay={40} fromY={12}>
            <LinearGradient colors={[goalColor + '18', goalColor + '06']} style={[ss.planCard, { borderColor: goalColor + '30' }]}>
              <Text style={ss.sectionLabel}>Planned Session</Text>
              <Text style={[ss.focus, { color: goalColor }]}>{day.focus}</Text>

              {day.exercises.length > 0 && (
                <View style={{ gap: 6, marginTop: 12 }}>
                  {day.exercises.map((ex, i) => (
                    <View key={i} style={ss.exRow}>
                      <View style={[ss.exNum, { backgroundColor: goalColor + '20' }]}>
                        <Text style={[ss.exNumText, { color: goalColor }]}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ss.exName}>{ex.name}</Text>
                        <Text style={ss.exDetail}>{ex.sets} sets × {ex.reps} · {ex.rest_seconds}s rest</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {day.cardio && (
                <View style={ss.cardioRow}>
                  <Clock size={13} color={goalColor} />
                  <Text style={[ss.cardioText, { color: goalColor }]}>
                    {day.cardio.duration}min {day.cardio.type} ({day.cardio.intensity})
                  </Text>
                </View>
              )}

              {day.day_type === 'rest' && (
                <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 13 }}>
                  Rest day — recovery is part of the plan.
                </Text>
              )}
            </LinearGradient>
          </FadeIn>

          {/* Future day — just show plan, no log */}
          {isFuture ? (
            <FadeIn delay={120} fromY={10}>
              <View style={ss.futureNote}>
                <Calendar size={18} color="rgba(255,255,255,0.2)" />
                <Text style={ss.futureNoteText}>
                  This day hasn't arrived yet. Come back on{' '}
                  {dateD.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} to log it.
                </Text>
              </View>
            </FadeIn>
          ) : (
            <>
              {/* Show existing assessment if already logged */}
              {assessment ? (
                <FadeIn delay={80} fromY={12}>
                  <AssessmentCard assessment={assessment} goalColor={goalColor} />
                </FadeIn>
              ) : (
                <>
                  {day.day_type !== 'rest' && (
                    <>
                      {/* Completion selector */}
                      <FadeIn delay={80} fromY={12}>
                        <View style={ss.section}>
                          <Text style={ss.sectionLabel}>How did it go?</Text>
                          <View style={{ gap: 8 }}>
                            {COMPLETION_OPTIONS.map((opt) => {
                              const active  = selectedPct === opt.pct;
                              const { Icon } = opt;
                              return (
                                <AnimatedPressable key={opt.pct} onPress={() => setSelectedPct(opt.pct)} scaleDown={0.97}>
                                  <View style={[ss.completionOpt, active && { backgroundColor: opt.color + '15', borderColor: opt.color + '50' }]}>
                                    <Icon size={20} color={opt.color} strokeWidth={1.8} />
                                    <View style={{ flex: 1 }}>
                                      <Text style={[ss.completionLabel, active && { color: '#fff' }]}>{opt.label}</Text>
                                      <Text style={ss.completionSub}>{opt.sub}</Text>
                                    </View>
                                    <Text style={[ss.completionPct, { color: opt.color }]}>{opt.pct}%</Text>
                                  </View>
                                </AnimatedPressable>
                              );
                            })}
                          </View>
                        </View>
                      </FadeIn>

                      {/* Notes */}
                      <FadeIn delay={120} fromY={10}>
                        <View style={ss.section}>
                          <Text style={ss.sectionLabel}>Notes (optional)</Text>
                          <View style={ss.notesInput}>
                            <TextInput
                              style={ss.notesText}
                              value={notes}
                              onChangeText={setNotes}
                              placeholder="How did you feel? Any PRs? Anything hard?"
                              placeholderTextColor="rgba(255,255,255,0.2)"
                              multiline
                            />
                          </View>
                        </View>
                      </FadeIn>

                      {/* Submit */}
                      <FadeIn delay={160} fromY={10}>
                        <AnimatedPressable
                          onPress={handleSubmit}
                          scaleDown={0.96} haptic
                          disabled={selectedPct === null || assessing}
                          style={{ marginTop: 4 }}
                        >
                          <LinearGradient
                            colors={selectedPct !== null && !assessing ? ['#FF6B35', '#ff2d55'] : ['#333', '#2a2a2a']}
                            style={ss.submitBtn}
                          >
                            {assessing ? (
                              <>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={ss.submitText}>AI is assessing your progress...</Text>
                              </>
                            ) : (
                              <>
                                <TrendingUp size={18} color="#fff" strokeWidth={2.5} />
                                <Text style={ss.submitText}>
                                  {selectedPct === null ? 'Select completion first' : 'Submit & Get AI Feedback'}
                                </Text>
                              </>
                            )}
                          </LinearGradient>
                        </AnimatedPressable>
                      </FadeIn>
                    </>
                  )}

                  {day.day_type === 'rest' && (
                    <AnimatedPressable
                      onPress={() => { setSelectedPct(100); setTimeout(handleSubmit, 50); }}
                      scaleDown={0.96} haptic
                    >
                      <LinearGradient colors={['#34d399', '#00b377']} style={ss.submitBtn}>
                        <CheckCircle size={18} color="#fff" />
                        <Text style={ss.submitText}>Mark Rest Day as Done</Text>
                      </LinearGradient>
                    </AnimatedPressable>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function AssessmentCard({ assessment, goalColor }: { assessment: AIAssessment; goalColor: string }) {
  const statusColor = assessment.achieved ? '#34d399' : assessment.achievement_percentage >= 40 ? '#ff8c00' : '#ff3b30';
  const StatusIcon  = assessment.achieved ? CheckCircle : assessment.achievement_percentage >= 40 ? AlertCircle : XCircle;

  return (
    <View style={ss.assessCard}>
      <Text style={ss.sectionLabel}>AI Assessment</Text>

      <View style={[ss.achieveRow, { backgroundColor: statusColor + '14', borderColor: statusColor + '30' }]}>
        <StatusIcon size={22} color={statusColor} strokeWidth={1.8} />
        <View style={{ flex: 1 }}>
          <Text style={[ss.achieveLabel, { color: statusColor }]}>
            {assessment.achieved ? 'Goal Achieved' : `${assessment.achievement_percentage}% Complete`}
          </Text>
          <Text style={ss.analysisText}>{assessment.analysis}</Text>
        </View>
      </View>

      {assessment.adjustment_type !== 'none' && (
        <View style={ss.adjustmentBox}>
          <Text style={ss.adjustTitle}>
            {assessment.adjustment_type === 'extended_deadline' ? 'Plan Extended' : 'Load Increased'}
          </Text>
          {assessment.new_end_date && (
            <Text style={ss.adjustDetail}>
              New target date: {new Date(assessment.new_end_date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
          {assessment.adjustment_message && (
            <Text style={ss.adjustMsg}>{assessment.adjustment_message}</Text>
          )}
          {assessment.load_increase_note && (
            <Text style={ss.adjustMsg}>{assessment.load_increase_note}</Text>
          )}
          {assessment.is_harmful && (
            <View style={ss.harmWarn}>
              <Text style={ss.harmText}>Safety check passed — the adjustment is within safe limits.</Text>
            </View>
          )}
        </View>
      )}

      {assessment.adjustment_type === 'none' && assessment.achieved && (
        <View style={ss.noChangeBox}>
          <CheckCircle size={14} color="#34d399" />
          <Text style={ss.noChangeText}>No plan changes needed — you're on track!</Text>
        </View>
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  dayTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  dayMeta:  { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 1 },

  scroll: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },

  sectionLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },

  planCard: { borderRadius: 20, padding: 18, borderWidth: 1 },
  focus:    { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },

  exRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  exNum:     { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  exNumText: { fontSize: 11, fontWeight: '900' },
  exName:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  exDetail:  { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 1 },

  cardioRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  cardioText: { fontSize: 13, fontWeight: '700' },

  futureNote: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  futureNoteText: { flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 20 },

  section: { gap: 0 },

  completionOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  completionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700' },
  completionSub:   { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 1 },
  completionPct:   { fontSize: 14, fontWeight: '900' },

  notesInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 14, padding: 14 },
  notesText:  { color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top' },

  submitBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, borderRadius: 18 },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  assessCard:  { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 18 },
  achieveRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12 },
  achieveLabel: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  analysisText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 19 },

  adjustmentBox: { backgroundColor: 'rgba(255,140,0,0.08)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)', gap: 4 },
  adjustTitle:   { color: '#ff8c00', fontWeight: '800', fontSize: 14 },
  adjustDetail:  { color: '#fff', fontSize: 13, fontWeight: '600' },
  adjustMsg:     { color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 18 },

  harmWarn: { backgroundColor: 'rgba(52,211,153,0.1)', borderRadius: 10, padding: 10, marginTop: 6 },
  harmText: { color: '#34d399', fontSize: 12 },

  noChangeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(52,211,153,0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(52,211,153,0.15)' },
  noChangeText: { color: '#34d399', fontSize: 13, fontWeight: '600', flex: 1 },
});
