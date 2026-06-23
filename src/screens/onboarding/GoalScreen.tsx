import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Target, Flame, Wind, Activity } from 'lucide-react-native';
import { PressButton } from '../../components/PressButton';
import { OnboardingOption } from '../../components/OnboardingOption';
import { StaggerItem } from '../../components/StaggerList';
import { useProfileStore } from '../../store/profileStore';
import { OnboardingStackParamList, Goal } from '../../types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Goal'>;

const GOALS: { value: Goal; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'muscle_gain',     label: 'Build Muscle',       description: 'Hypertrophy, strength, size', icon: <Target size={26} color="#FF6B35" /> },
  { value: 'fat_loss',        label: 'Lose Fat',           description: 'Burn fat, preserve muscle',   icon: <Flame  size={26} color="#FF6B35" /> },
  { value: 'endurance',       label: 'Build Endurance',    description: 'Stamina, cardio, VO2 max',    icon: <Wind   size={26} color="#FF6B35" /> },
  { value: 'general_fitness', label: 'General Fitness',    description: 'Health, energy, mobility',    icon: <Activity size={26} color="#FF6B35" /> },
];

export function GoalScreen({ navigation }: Props) {
  const { onboardingDraft, setOnboardingField } = useProfileStore();

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 16 }} showsVerticalScrollIndicator={false}>

          <StaggerItem index={0}>
            <View style={{ marginBottom: 28 }}>
              <Text style={{ color: '#FF6B35', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 }}>
                Step 1 of 5
              </Text>
              {/* Step progress dots */}
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
                {[0,1,2,3,4].map((i) => (
                  <View key={i} style={{
                    height: 3, flex: i === 0 ? 2 : 1, borderRadius: 2,
                    backgroundColor: i === 0 ? '#FF6B35' : 'rgba(255,255,255,0.1)',
                  }} />
                ))}
              </View>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 }}>
                What's your{'\n'}primary goal?
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                Your AI plan is engineered around this.
              </Text>
            </View>
          </StaggerItem>

          {GOALS.map((g, i) => (
            <StaggerItem key={g.value} index={i + 1} delay={70}>
              <OnboardingOption
                label={g.label}
                description={g.description}
                icon={g.icon}
                selected={onboardingDraft.goal === g.value}
                onPress={() => setOnboardingField('goal', g.value)}
              />
            </StaggerItem>
          ))}

          <StaggerItem index={6} delay={70}>
            <View style={{ marginTop: 16 }}>
              <PressButton
                title="Continue"
                onPress={() => navigation.navigate('FitnessLevel')}
                disabled={!onboardingDraft.goal}
              />
            </View>
          </StaggerItem>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
