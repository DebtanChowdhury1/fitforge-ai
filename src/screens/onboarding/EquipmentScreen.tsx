import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Home, Dumbbell, Zap } from 'lucide-react-native';
import { PressButton } from '../../components/PressButton';
import { OnboardingOption } from '../../components/OnboardingOption';
import { StaggerItem } from '../../components/StaggerList';
import { DumbbellGL } from '../../components/gl/DumbbellGL';
import { useProfileStore } from '../../store/profileStore';
import { OnboardingStackParamList, Equipment } from '../../types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Equipment'>;

const EQUIPMENT: { value: Equipment; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'none',           label: 'No Equipment',    description: 'Bodyweight training, anywhere',         icon: <Home     size={26} color="#FF6B35" /> },
  { value: 'home_dumbbells', label: 'Home Setup',      description: 'Dumbbells, bands, maybe a bench',       icon: <Dumbbell size={26} color="#FF6B35" /> },
  { value: 'full_gym',       label: 'Full Gym Access', description: 'Barbells, cables, machines — all of it', icon: <Zap      size={26} color="#FF6B35" /> },
];

export function EquipmentScreen({ navigation }: Props) {
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

          {/* True 3D WebGL dumbbell */}
          <StaggerItem index={1}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <DumbbellGL width={320} height={160} autoSpin />
              <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 4, letterSpacing: 1.5 }}>
                TRUE 3D · WEBGL
              </Text>
            </View>
          </StaggerItem>

          <StaggerItem index={2}>
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#FF6B35', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 }}>
                Step 3 of 5
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
                {[0,1,2,3,4].map((i) => (
                  <View key={i} style={{
                    height: 3, flex: i <= 2 ? 2 : 1, borderRadius: 2,
                    backgroundColor: i <= 2 ? '#FF6B35' : 'rgba(255,255,255,0.1)',
                  }} />
                ))}
              </View>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 }}>
                Equipment{'\n'}available?
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                Your plan only uses what you have.
              </Text>
            </View>
          </StaggerItem>

          {EQUIPMENT.map((e, i) => (
            <StaggerItem key={e.value} index={i + 3} delay={70}>
              <OnboardingOption
                label={e.label}
                description={e.description}
                icon={e.icon}
                selected={onboardingDraft.equipment === e.value}
                onPress={() => setOnboardingField('equipment', e.value)}
              />
            </StaggerItem>
          ))}

          <StaggerItem index={7} delay={70}>
            <View style={{ marginTop: 16 }}>
              <PressButton
                title="Continue"
                onPress={() => navigation.navigate('Schedule')}
                disabled={!onboardingDraft.equipment}
              />
            </View>
          </StaggerItem>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
