import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, Goal, FitnessLevel, Equipment } from '../types';

interface OnboardingDraft {
  goal: Goal | null;
  fitness_level: FitnessLevel | null;
  equipment: Equipment | null;
  days_per_week: number;
  session_duration: number;
  limitations: string;
}

interface ProfileState {
  profile: Profile | null;
  onboardingDraft: OnboardingDraft;
  hasCompletedOnboarding: boolean;
  setProfile: (profile: Profile | null) => void;
  setOnboardingField: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
  setHasCompletedOnboarding: (val: boolean) => void;
  resetDraft: () => void;
}

const defaultDraft: OnboardingDraft = {
  goal: null,
  fitness_level: null,
  equipment: null,
  days_per_week: 4,
  session_duration: 45,
  limitations: '',
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      onboardingDraft: defaultDraft,
      hasCompletedOnboarding: false,
      setProfile: (profile) => set({ profile, hasCompletedOnboarding: !!profile }),
      setOnboardingField: (key, value) =>
        set((state) => ({ onboardingDraft: { ...state.onboardingDraft, [key]: value } })),
      setHasCompletedOnboarding: (val) => set({ hasCompletedOnboarding: val }),
      resetDraft: () => set({ onboardingDraft: defaultDraft }),
    }),
    {
      name: 'fitforge-profile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);
