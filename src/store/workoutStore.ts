import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutLog, Units } from '../types';

interface WorkoutState {
  logs: WorkoutLog[];
  units: Units;
  setLogs: (logs: WorkoutLog[]) => void;
  addLog: (log: WorkoutLog) => void;
  setUnits: (units: Units) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      logs: [],
      units: 'kg',
      setLogs: (logs) => set({ logs }),
      addLog: (log) => set((state) => ({ logs: [log, ...state.logs] })),
      setUnits: (units) => set({ units }),
    }),
    {
      name: 'fitforge-workout',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ units: state.units, logs: state.logs.slice(0, 90) }),
    }
  )
);
