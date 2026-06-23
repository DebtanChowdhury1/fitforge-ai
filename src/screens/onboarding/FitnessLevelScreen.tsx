import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Leaf, TrendingUp, Trophy } from 'lucide-react-native';
import { PressButton } from '../../components/PressButton';
import { OnboardingOption } from '../../components/OnboardingOption';
import { StaggerItem } from '../../components/StaggerList';
import { useProfileStore } from '../../store/profileStore';
import { OnboardingStackParamList, FitnessLevel } from '../../types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'FitnessLevel'>;

const LEVELS: { value: FitnessLevel; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'beginner',     label: 'Beginner',     description: 'Less than 1 year of consistent training', icon: <Leaf       size={26} color="#FF6B35" /> },
  { value: 'intermediate', label: 'Intermediate', description: '1–3 years, solid movement foundation',     icon: <TrendingUp size={26} color="#FF6B35" /> },
  { value: 'advanced',     label: 'Advanced',     description: '3+ years, comfortable with complex lifts', icon: <Trophy     size={26} color="#FF6B35" /> },
];

export function FitnessLevelScreen({ navigation }: Props) {
  const { onboardingDraft, setOnboardingField } = useProfileStore();

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
                Step 2 of 5
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
                {[0,1,2,3,4].map((i) => (
                  <View key={i} style={{
                    height: 3, flex: i <= 1 ? 2 : 1, borderRadius: 2,
                    backgroundColor: i <= 1 ? '#FF6B35' : 'rgba(255,255,255,0.1)',
                  }} />
                ))}
              </View>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 }}>
                Your fitness{'\n'}level?
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                Be honest — we calibrate the difficulty accordingly.
              </Text>
            </View>
          </StaggerItem>

          {LEVELS.map((l, i) => (
            <StaggerItem key={l.value} index={i + 2} delay={70}>
              <OnboardingOption
                label={l.label}
                description={l.description}
                icon={l.icon}
                selected={onboardingDraft.fitness_level === l.value}
                onPress={() => setOnboardingField('fitness_level', l.value)}
              />
            </StaggerItem>
          ))}

          <StaggerItem index={6} delay={70}>
            <View style={{ marginTop: 16 }}>
              <PressButton
                title="Continue"
                onPress={() => navigation.navigate('Equipment')}
                disabled={!onboardingDraft.fitness_level}
              />
            </View>
          </StaggerItem>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
