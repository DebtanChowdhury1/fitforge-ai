import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoalScreen } from '../screens/onboarding/GoalScreen';
import { FitnessLevelScreen } from '../screens/onboarding/FitnessLevelScreen';
import { EquipmentScreen } from '../screens/onboarding/EquipmentScreen';
import { ScheduleScreen } from '../screens/onboarding/ScheduleScreen';
import { LimitationsScreen } from '../screens/onboarding/LimitationsScreen';
import { OnboardingStackParamList } from '../types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Goal" component={GoalScreen} />
      <Stack.Screen name="FitnessLevel" component={FitnessLevelScreen} />
      <Stack.Screen name="Equipment" component={EquipmentScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Limitations" component={LimitationsScreen} />
    </Stack.Navigator>
  );
}
