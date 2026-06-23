import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles, Bot } from 'lucide-react-native';
import { PressButton } from '../../components/PressButton';
import { StaggerItem } from '../../components/StaggerList';
import { useProfileStore } from '../../store/profileStore';
import { usePlanStore } from '../../store/planStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { OnboardingStackParamList } from '../../types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Limitations'>;

export function LimitationsScreen({ navigation }: Props) {
  const { onboardingDraft, setOnboardingField, setProfile } = useProfileStore();
  const { setCurrentPlan, setIsGenerating } = usePlanStore();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    try {
      const profileData = {
        id: user.id,
        goal: onboardingDraft.goal!,
        fitness_level: onboardingDraft.fitness_level!,
        equipment: onboardingDraft.equipment!,
        days_per_week: onboardingDraft.days_per_week,
        session_duration: onboardingDraft.session_duration,
        limitations: onboardingDraft.limitations,
      };

      const { error: profileError } = await supabase.from('profiles').upsert(profileData);
      if (profileError) throw profileError;

      setProfile({ ...profileData, created_at: new Date().toISOString() });
      setIsGenerating(true);

      const { data, error: fnError } = await supabase.functions.invoke('generate-plan', { body: profileData });
      setIsGenerating(false);

      if (fnError) throw fnError;
      if (data?.plan) {
        const { data: planRow, error: planError } = await supabase
          .from('workout_plans')
          .insert({ user_id: user.id, plan_json: data.plan })
          .select()
          .single();
        if (!planError && planRow) setCurrentPlan(planRow);
      }
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error', err.message ?? 'Something went wrong. Try again.');
      return;
    }
    setSaving(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 16 }} showsVerticalScrollIndicator={false}>

          <StaggerItem index={0}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <ChevronLeft size={20} color="rgba(255,255,255,0.4)" />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginLeft: 4 }}>Back</Text>
            </TouchableOpacity>
          </StaggerItem>

          <StaggerItem index={1}>
            <View style={{ marginBottom: 28 }}>
              <Text style={{ color: '#FF6B35', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 }}>
                Step 5 of 5
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
                {[0,1,2,3,4].map((i) => (
                  <View key={i} style={{ height: 3, flex: 2, borderRadius: 2, backgroundColor: '#FF6B35' }} />
                ))}
              </View>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 }}>
                Any injuries or{'\n'}limitations?
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                Optional — we'll program around them.
              </Text>
            </View>
          </StaggerItem>

          <StaggerItem index={2}>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 20,
            }}>
              <TextInput
                style={{ color: '#fff', fontSize: 15, minHeight: 100, textAlignVertical: 'top' }}
                placeholder="e.g. lower back pain, bad knees, avoid overhead pressing..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={onboardingDraft.limitations}
                onChangeText={(t) => setOnboardingField('limitations', t)}
                multiline
              />
            </View>
          </StaggerItem>

          <StaggerItem index={3}>
            <View style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 12,
              backgroundColor: 'rgba(255,107,53,0.08)', borderWidth: 1,
              borderColor: 'rgba(255,107,53,0.2)', borderRadius: 16, padding: 16, marginBottom: 32,
            }}>
              <Bot size={20} color="#FF6B35" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FF6B35', fontWeight: '700', fontSize: 14, marginBottom: 4 }}>
                  AI Plan Generation
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 19 }}>
                  Tap below to generate your personalized 4-week training plan with Llama 3.3 70B. Takes about 5 seconds.
                </Text>
              </View>
            </View>
          </StaggerItem>

          <StaggerItem index={4}>
            {saving ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ActivityIndicator color="#FF6B35" size="large" />
                <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 14, fontSize: 14 }}>
                  Generating your plan...
                </Text>
              </View>
            ) : (
              <PressButton
                title="Generate My Plan"
                onPress={handleFinish}
                icon={<Sparkles size={18} color="#fff" />}
              />
            )}
          </StaggerItem>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
