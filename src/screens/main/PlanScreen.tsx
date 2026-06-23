import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Dimensions, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RefreshCw, Bot, ChevronDown, ChevronUp, ClipboardList, Wand2, Sparkles, Info } from 'lucide-react-native';
import { StaggerItem } from '../../components/StaggerList';
import { FocusInput } from '../../components/FocusInput';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FadeIn } from '../../components/FadeIn';
import { PulseView } from '../../components/PulseView';
import { WorkflowGL } from '../../components/gl/WorkflowGL';
import { PressButton } from '../../components/PressButton';
import { usePlanStore } from '../../store/planStore';
import { useProfileStore } from '../../store/profileStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { analytics } from '../../lib/analytics';
import { WorkoutDay, mapGoalToGoalType } from '../../types';

export function PlanScreen() {
  const { currentPlan, isGenerating, setCurrentPlan, setIsGenerating } = usePlanStore();
  const { profile } = useProfileStore();
  const { user } = useAuthStore();
  const [editText, setEditText]     = useState('');
  const [modifying, setModifying]   = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);

  async function handleRegenerate() {
    if (!user || !profile) return;
    Alert.alert('Regenerate plan?', 'This will create a fresh plan based on your profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        onPress: async () => {
          setIsGenerating(true);
          const planBody = {
            goal_type: mapGoalToGoalType(profile.goal),
            goal_details: {
              experience_level: profile.fitness_level,
              equipment: profile.equipment,
              days_per_week: profile.days_per_week,
              session_duration: profile.session_duration,
              limitations: profile.limitations || 'none',
              units: 'kg',
            },
          };
          const { data, error } = await supabase.functions.invoke('generate-plan', { body: planBody });
          setIsGenerating(false);
          if (error || !data?.plan) { Alert.alert('Error', 'Failed to generate plan.'); return; }
          const { data: planRow, error: dbErr } = await supabase
            .from('workout_plans').insert({ user_id: user.id, plan_json: data.plan }).select().single();
          if (dbErr) { Alert.alert('Save failed', 'Plan generated but could not be saved. Try again.'); return; }
          if (planRow) {
            setCurrentPlan(planRow);
            analytics.track('plan_regenerated', { goal_type: planBody.goal_type });
          }
        },
      },
    ]);
  }

  async function handleModify() {
    if (!editText.trim() || !currentPlan || !user) return;
    setModifying(true);
    const { data, error } = await supabase.functions.invoke('modify-plan', {
      body: { current_plan: currentPlan.plan_json, instruction: editText.trim() },
    });
    setModifying(false);
    if (error || !data?.plan) { Alert.alert('Error', 'Failed to modify plan.'); return; }
    const { data: planRow } = await supabase
      .from('workout_plans').insert({ user_id: user.id, plan_json: data.plan }).select().single();
    if (planRow) { setCurrentPlan(planRow); setEditText(''); }
  }

  const { width: screenW, height: screenH } = Dimensions.get('window');

  const GLBg = () => (
    <>
      <WorkflowGL width={screenW} height={screenH} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.50)' }]} pointerEvents="none" />
    </>
  );

  if (isGenerating) {
    return (
      <View style={{ flex: 1 }}>
        <GLBg />
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
          <PulseView minScale={0.85} maxScale={1.15} duration={700}>
            <ActivityIndicator color="#FF6B35" size="large" />
          </PulseView>
          <FadeIn delay={200}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, fontSize: 14 }}>Generating your plan...</Text>
          </FadeIn>
        </View>
      </View>
    );
  }

  if (!currentPlan) {
    return (
      <View style={{ flex: 1 }}>
        <GLBg />
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
          <PulseView minScale={0.88} maxScale={1.12} duration={1800} pulseOpacity>
            <ClipboardList size={60} color="rgba(255,255,255,0.25)" strokeWidth={1.2} />
          </PulseView>
          <FadeIn delay={150}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 20, marginBottom: 8, textAlign: 'center' }}>No Plan Yet</Text>
          </FadeIn>
          <FadeIn delay={250}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' }}>
              Complete your profile to generate a personalized workout plan.
            </Text>
          </FadeIn>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GLBg />
      <View style={StyleSheet.absoluteFillObject}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

          {/* Header */}
          <FadeIn delay={0} fromY={-18}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}>Your Plan</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,107,53,0.15)', borderWidth: 1, borderColor: 'rgba(255,107,53,0.3)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Sparkles size={10} color="#FF6B35" />
                    <Text style={{ color: '#FF6B35', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>AI GENERATED</Text>
                  </View>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 }}>
                  {(currentPlan.plan_json as any).weeks ?? 4} weeks · {(currentPlan.plan_json as any).schedule?.length ?? 0} days/week
                  {currentPlan.created_at ? ` · Created ${new Date(currentPlan.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}
                </Text>
              </View>
              <AnimatedPressable onPress={handleRegenerate} scaleDown={0.9}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
                }}>
                  <PulseView minScale={0.8} maxScale={1.2} duration={1200}>
                    <RefreshCw size={13} color="#FF6B35" />
                  </PulseView>
                  <Text style={{ color: '#FF6B35', fontSize: 12, fontWeight: '700' }}>Regenerate</Text>
                </View>
              </AnimatedPressable>
            </View>
          </FadeIn>

          {/* Origin banner */}
          <FadeIn delay={80}>
            <View style={{
              marginHorizontal: 20, marginBottom: 4,
              flexDirection: 'row', alignItems: 'flex-start', gap: 10,
              backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14,
            }}>
              <Info size={15} color="rgba(255,255,255,0.3)" style={{ marginTop: 1 }} />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 19, flex: 1 }}>
                This plan was built by ForgeAI using the goal, level, and equipment you set during onboarding. Use "Modify with AI" below to adjust it, or tap Regenerate for a fresh plan.
              </Text>
            </View>
          </FadeIn>

          {/* AI Modify box */}
          <FadeIn delay={140}>
            <View style={{
              marginHorizontal: 20, marginVertical: 12,
              backgroundColor: 'rgba(255,107,53,0.07)', borderWidth: 1,
              borderColor: 'rgba(255,107,53,0.2)', borderRadius: 20, padding: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <PulseView minScale={0.88} maxScale={1.12} duration={1100}>
                  <Bot size={18} color="#FF6B35" />
                </PulseView>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Modify with AI</Text>
              </View>
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, marginBottom: 12,
              }}>
                <TextInput
                  style={{ color: '#fff', fontSize: 14, minHeight: 60, textAlignVertical: 'top' }}
                  placeholder={'"Make Tuesday lower intensity" or "Add more cardio"'}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                />
              </View>
              <PressButton
                title={modifying ? 'Applying...' : 'Apply Changes'}
                onPress={handleModify}
                loading={modifying}
                disabled={!editText.trim() || modifying}
                icon={<Wand2 size={16} color="#fff" />}
              />
            </View>
          </FadeIn>

          {/* Day accordion */}
          <View style={{ paddingHorizontal: 20, gap: 8, marginTop: 8 }}>
            {(currentPlan.plan_json as any).schedule?.map((day: WorkoutDay, i: number) => (
              <FadeIn key={i} delay={200 + i * 60} fromX={20} fromY={0}>
                <AnimatedPressable onPress={() => setExpandedDay(expandedDay === i ? null : i)} scaleDown={0.97}>
                  <View style={{
                    backgroundColor: expandedDay === i ? 'rgba(255,107,53,0.10)' : 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: expandedDay === i ? 'rgba(255,107,53,0.28)' : 'rgba(255,255,255,0.08)',
                    borderRadius: 18, overflow: 'hidden',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FF6B35', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                          {day.day}
                        </Text>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginTop: 2 }}>{day.focus}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 }}>
                          {day.exercises.length} exercises
                        </Text>
                      </View>
                      {expandedDay === i
                        ? <ChevronUp size={18} color="rgba(255,255,255,0.35)" />
                        : <ChevronDown size={18} color="rgba(255,255,255,0.35)" />
                      }
                    </View>

                    {expandedDay === i && (
                      <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', padding: 16, gap: 14 }}>
                        {day.exercises.map((ex, j: number) => (
                          <FadeIn key={j} delay={j * 45} fromX={16} fromY={0}>
                            <View style={{ flexDirection: 'row' }}>
                              <View style={{
                                width: 26, height: 26, borderRadius: 8,
                                backgroundColor: 'rgba(255,107,53,0.18)',
                                borderWidth: 1, borderColor: 'rgba(255,107,53,0.3)',
                                alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 1,
                              }}>
                                <Text style={{ color: '#FF6B35', fontSize: 11, fontWeight: '800' }}>{j + 1}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{ex.name}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 }}>
                                  {ex.sets} sets × {ex.reps} reps · {ex.rest_seconds}s rest
                                </Text>
                                {ex.notes && (
                                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>
                                    {ex.notes}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </FadeIn>
                        ))}
                      </View>
                    )}
                  </View>
                </AnimatedPressable>
              </FadeIn>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
      </View>
    </View>
  );
}
