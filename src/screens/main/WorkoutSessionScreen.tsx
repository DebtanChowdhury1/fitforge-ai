import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  Animated, Dimensions, Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { usePlanStore } from '../../store/planStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, X, Lightbulb, Zap, Trophy, Check, Flame } from 'lucide-react-native';
import { MuscleMap, getMuscleGroups } from '../../components/MuscleMap';
import { AnimatedRing } from '../../components/AnimatedRing';
import { HomeStackParamList, LoggedExercise } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'WorkoutSession'>;
const { width, height } = Dimensions.get('window');

interface SetData { reps: number; weight: number; done: boolean; }

export function WorkoutSessionScreen({ navigation, route }: Props) {
  const { dayIndex } = route.params;
  const { currentPlan } = usePlanStore();
  const { addLog, units } = useWorkoutStore();
  const { user } = useAuthStore();

  const schedule = (currentPlan?.plan_json as any)?.schedule ?? [];
  const workout = schedule[dayIndex % Math.max(schedule.length, 1)];

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [sets, setSets] = useState<SetData[]>([]);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [loggedExercises, setLoggedExercises] = useState<LoggedExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const restScaleAnim = useRef(new Animated.Value(1)).current;

  const currentEx = workout?.exercises[exerciseIndex];
  const muscles = currentEx ? getMuscleGroups(currentEx.name) : [];

  const animateIn = useCallback(() => {
    slideAnim.setValue(60);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  useEffect(() => {
    if (!currentEx) return;
    setSets(Array.from({ length: currentEx.sets }, () => ({ reps: 0, weight: 0, done: false })));
    animateIn();
  }, [exerciseIndex, currentEx, animateIn]);

  useEffect(() => {
    if (!isResting) { if (timerRef.current) clearInterval(timerRef.current); return; }
    Animated.loop(
      Animated.sequence([
        Animated.timing(restScaleAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(restScaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
    timerRef.current = setInterval(() => {
      setRestSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setIsResting(false);
          restScaleAnim.setValue(1);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isResting]);

  function startRest(seconds: number) {
    setRestTotal(seconds);
    setRestSeconds(seconds);
    setIsResting(true);
  }

  function markSetDone(i: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();
    setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, done: true } : s));
    if (i < currentEx!.sets - 1) startRest(currentEx!.rest_seconds);
  }

  function updateSet(i: number, field: 'reps' | 'weight', value: string) {
    const num = parseFloat(value) || 0;
    setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: num } : s));
  }

  function finishExercise() {
    const logged: LoggedExercise = {
      name: currentEx!.name,
      planned_sets: currentEx!.sets,
      planned_reps: currentEx!.reps,
      actual_sets: sets.map((s) => ({ reps: s.reps, weight: s.weight })),
    };
    const all = [...loggedExercises, logged];
    setLoggedExercises(all);
    if (exerciseIndex < workout.exercises.length - 1) {
      setExerciseIndex((i) => i + 1);
      setIsResting(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      finishWorkout(all);
    }
  }

  async function finishWorkout(allLogged: LoggedExercise[]) {
    if (!user || !currentPlan) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('workout_logs')
      .insert({ user_id: user.id, plan_id: currentPlan.id, date: today, exercises_json: allLogged })
      .select().single();
    setSaving(false);
    if (error) {
      Alert.alert(
        'Save failed',
        'Your workout could not be saved. Check your connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (data) addLog(data);
    setShowComplete(true);
  }

  const doneSets = sets.filter((s) => s.done).length;
  const allSetsDone = doneSets === sets.length && sets.length > 0;
  const overallProgress = workout ? exerciseIndex / workout.exercises.length : 0;

  if (!workout || !currentEx) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 20 }}>No workout found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
          <ChevronLeft size={18} color="#ff5500" />
          <Text style={{ color: '#ff5500' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity onPress={() => {
              Alert.alert('Exit workout?', 'Progress will be lost.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() },
              ]);
            }} style={{ padding: 4 }}>
              <X size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{workout.focus}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                {exerciseIndex + 1} / {workout.exercises.length}
              </Text>
            </View>
            <AnimatedRing
              progress={overallProgress}
              size={44} strokeWidth={5}
              color="#ff5500" color2="#ff8c00"
              value={`${Math.round(overallProgress * 100)}%`}
              gradientId="session_ring"
            />
          </View>

          {/* Progress bar */}
          <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
            <Animated.View style={{
              height: 3, borderRadius: 2, backgroundColor: '#ff5500',
              width: `${overallProgress * 100}%`,
            }} />
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Exercise + Muscle Map */}
          <Animated.View style={{
            paddingHorizontal: 20, marginBottom: 16,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#ff8c00', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 }}>
                  {currentEx.muscle_group ?? muscles[0] ?? 'exercise'}
                </Text>
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, lineHeight: 32 }}>
                  {currentEx.name}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {[
                    `${currentEx.sets} sets`,
                    `${currentEx.reps} reps`,
                    `${currentEx.rest_seconds}s rest`,
                  ].map((tag, i) => (
                    <View key={i} style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
                    }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{tag}</Text>
                    </View>
                  ))}
                </View>
                {currentEx.notes && (
                  <View style={{
                    backgroundColor: 'rgba(0,212,255,0.06)', borderWidth: 1,
                    borderColor: 'rgba(0,212,255,0.15)', borderRadius: 10, padding: 10, marginTop: 10,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                      <Lightbulb size={13} color="#00d4ff" style={{ marginTop: 1 }} />
                      <Text style={{ color: '#00d4ff', fontSize: 12, flex: 1 }}>{currentEx.notes}</Text>
                    </View>
                  </View>
                )}
              </View>
              <MuscleMap active={muscles} size={90} />
            </View>
          </Animated.View>

          {/* Rest Timer — full width ring */}
          {isResting && (
            <Animated.View style={{
              marginHorizontal: 20, marginBottom: 16,
              transform: [{ scale: restScaleAnim }],
            }}>
              <View style={{
                backgroundColor: 'rgba(255,85,0,0.08)', borderWidth: 1,
                borderColor: 'rgba(255,85,0,0.2)', borderRadius: 24,
                padding: 24, alignItems: 'center',
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                  Rest Timer
                </Text>
                <AnimatedRing
                  progress={restTotal > 0 ? restSeconds / restTotal : 0}
                  size={120} strokeWidth={12}
                  color="#ff5500" color2="#ff8c00"
                  value={`${restSeconds}s`}
                  gradientId="rest_ring"
                />
                <TouchableOpacity
                  onPress={() => { setIsResting(false); if (timerRef.current) clearInterval(timerRef.current); }}
                  style={{ marginTop: 16 }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Skip rest</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Sets */}
          <Animated.View style={{ paddingHorizontal: 20, marginBottom: 12, transform: [{ scale: scaleAnim }] }}>
            {/* Column headers */}
            <View style={{ flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, width: 32, letterSpacing: 1 }}>SET</Text>
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, flex: 1, textAlign: 'center', letterSpacing: 1 }}>
                KG
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, flex: 1, textAlign: 'center', letterSpacing: 1 }}>
                REPS
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, width: 60, textAlign: 'center', letterSpacing: 1 }}>
                DONE
              </Text>
            </View>

            {sets.map((s, i) => (
              <Animated.View key={i} style={{
                flexDirection: 'row', alignItems: 'center', marginBottom: 8,
                backgroundColor: s.done ? 'rgba(255,85,0,0.1)' : 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: s.done ? 'rgba(255,85,0,0.3)' : 'rgba(255,255,255,0.06)',
                borderRadius: 14, padding: 12,
              }}>
                <Text style={{ color: s.done ? '#ff8c00' : 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '700', width: 32 }}>
                  {i + 1}
                </Text>
                <TextInput
                  style={{ flex: 1, color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: '800' }}
                  keyboardType="numeric" value={s.weight > 0 ? String(s.weight) : ''}
                  onChangeText={(v) => updateSet(i, 'weight', v)}
                  placeholder="0" placeholderTextColor="rgba(255,255,255,0.15)"
                  editable={!s.done}
                />
                <TextInput
                  style={{ flex: 1, color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: '800' }}
                  keyboardType="numeric" value={s.reps > 0 ? String(s.reps) : ''}
                  onChangeText={(v) => updateSet(i, 'reps', v)}
                  placeholder={currentEx.reps.split('-')[0] ?? '0'}
                  placeholderTextColor="rgba(255,255,255,0.15)"
                  editable={!s.done}
                />
                <TouchableOpacity
                  onPress={() => !s.done && markSetDone(i)}
                  disabled={s.done}
                  style={{ width: 60, alignItems: 'center' }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: s.done ? '#ff5500' : 'rgba(255,255,255,0.06)',
                    borderWidth: 1, borderColor: s.done ? '#ff5500' : 'rgba(255,255,255,0.1)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {s.done
                      ? <Check size={16} color="#fff" strokeWidth={3} />
                      : <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
                    }
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Set progress dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            {sets.map((s, i) => (
              <View key={i} style={{
                width: s.done ? 20 : 8, height: 8, borderRadius: 4,
                backgroundColor: s.done ? '#ff5500' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </View>

          {/* Next exercise preview */}
          {exerciseIndex < workout.exercises.length - 1 && (
            <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14,
                flexDirection: 'row', alignItems: 'center',
              }}>
                <View style={{
                  backgroundColor: 'rgba(191,90,242,0.12)', borderRadius: 8,
                  padding: 6, marginRight: 12,
                }}>
                  <Zap size={16} color="#bf5af2" />
                </View>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>Up Next</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 14 }}>
                    {workout.exercises[exerciseIndex + 1].name}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* CTA button */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
          <TouchableOpacity
            onPress={finishExercise}
            disabled={!allSetsDone || saving}
            activeOpacity={0.85}
            style={{ borderRadius: 18, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={allSetsDone ? ['#ff5500', '#ff2d55'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 18, alignItems: 'center' }}
            >
              <Text style={{ color: allSetsDone ? '#fff' : 'rgba(255,255,255,0.25)', fontWeight: '800', fontSize: 17, letterSpacing: 0.3 }}>
                {exerciseIndex < workout.exercises.length - 1
                  ? allSetsDone ? 'Next Exercise →' : `Complete All Sets (${doneSets}/${sets.length})`
                  : allSetsDone ? 'Finish Workout' : `Complete All Sets (${doneSets}/${sets.length})`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Completion Modal */}
      <Modal visible={showComplete} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <LinearGradient
            colors={['#1a0a00', '#2a0800']}
            style={{ borderRadius: 28, padding: 32, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: 'rgba(255,85,0,0.3)' }}
          >
            <Trophy size={64} color="#ff8c00" strokeWidth={1.2} style={{ marginBottom: 8 }} />
            <Text style={{ color: '#ff8c00', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' }}>
              Workout Complete
            </Text>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 }}>
              You crushed it!
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
              {workout.exercises.length} exercises · {sets.length * workout.exercises.length} total sets
            </Text>
            <View style={{ flexDirection: 'row', gap: 24, marginBottom: 24 }}>
              <Flame size={32} color="#ff5500" />
              <Zap   size={32} color="#ff8c00" />
              <Trophy size={32} color="#ff2d55" />
            </View>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ borderRadius: 16, overflow: 'hidden', width: '100%' }}
            >
              <LinearGradient
                colors={['#ff5500', '#ff2d55']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>Back to Home</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}
