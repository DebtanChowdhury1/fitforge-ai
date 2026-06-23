import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { PressButton } from '../../components/PressButton';
import { StaggerItem } from '../../components/StaggerList';
import { useProfileStore } from '../../store/profileStore';
import { OnboardingStackParamList } from '../../types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Schedule'>;

const DAYS      = [2, 3, 4, 5, 6];
const DURATIONS = [20, 30, 45, 60, 75, 90];

function SelectChip({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn()  { Animated.spring(scale, { toValue: 0.93, tension: 300, friction: 10, useNativeDriver: true } as any).start(); }
  function pressOut() { Animated.spring(scale, { toValue: 1,    tension: 200, friction: 8,  useNativeDriver: true } as any).start(); onPress(); }

  return (
    <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
      <Animated.View style={{
        paddingHorizontal: 18, paddingVertical: 12,
        borderRadius: 14, borderWidth: 1,
        transform: [{ scale }],
        borderColor: selected ? '#FF6B35' : 'rgba(255,255,255,0.08)',
        backgroundColor: selected ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.03)',
      }}>
        <Text style={{ color: selected ? '#FF6B35' : 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 15 }}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function ScheduleScreen({ navigation }: Props) {
  const { onboardingDraft, setOnboardingField } = useProfileStore();
  const ready = onboardingDraft.days_per_week && onboardingDraft.session_duration;

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
                Step 4 of 5
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
                {[0,1,2,3,4].map((i) => (
                  <View key={i} style={{
                    height: 3, flex: i <= 3 ? 2 : 1, borderRadius: 2,
                    backgroundColor: i <= 3 ? '#FF6B35' : 'rgba(255,255,255,0.1)',
                  }} />
                ))}
              </View>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 }}>
                Your schedule
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                How many days and how long per session?
              </Text>
            </View>
          </StaggerItem>

          <StaggerItem index={2}>
            <View style={{ marginBottom: 28 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Days per week
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DAYS.map((d) => (
                  <SelectChip
                    key={d}
                    label={`${d}×`}
                    selected={onboardingDraft.days_per_week === d}
                    onPress={() => setOnboardingField('days_per_week', d)}
                  />
                ))}
              </View>
            </View>
          </StaggerItem>

          <StaggerItem index={3}>
            <View style={{ marginBottom: 32 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Session duration
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DURATIONS.map((d) => (
                  <SelectChip
                    key={d}
                    label={`${d} min`}
                    selected={onboardingDraft.session_duration === d}
                    onPress={() => setOnboardingField('session_duration', d)}
                  />
                ))}
              </View>
            </View>
          </StaggerItem>

          <StaggerItem index={4}>
            <PressButton
              title="Continue"
              onPress={() => navigation.navigate('Limitations')}
              disabled={!ready}
            />
          </StaggerItem>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
