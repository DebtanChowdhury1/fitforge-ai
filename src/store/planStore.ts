import { create } from 'zustand';
import { WorkoutPlanRow, UserPlan, RoadmapDay, AIRoadmapPhase, AnyPlanJson } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isRoadmapPlan(plan: AnyPlanJson): plan is UserPlan {
  return (plan as UserPlan).plan_type === 'roadmap';
}

export function expandRoadmap(
  phases: AIRoadmapPhase[],
  startDate: string,
  endDate: string,
): RoadmapDay[] {
  const schedule: RoadmapDay[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const todayStr = new Date().toISOString().split('T')[0];
  let current = new Date(start);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.toLocaleDateString('en-US', { weekday: 'long' });
    const daysSinceStart = Math.floor((current.getTime() - start.getTime()) / 86400000);
    const weekNumber = Math.floor(daysSinceStart / 7) + 1;

    // Find matching phase
    const phase = phases.find(
      (p) => weekNumber >= p.week_range[0] && weekNumber <= p.week_range[1],
    ) ?? phases[phases.length - 1];

    const template = phase?.weekly_template?.find((t) => t.day_of_week === dayOfWeek);

    schedule.push({
      date: dateStr,
      day_of_week: dayOfWeek,
      week_number: weekNumber,
      day_type: template?.day_type ?? 'rest',
      focus: template?.focus ?? 'Rest Day',
      exercises: template?.exercises ?? [],
      cardio: template?.cardio ?? null,
      status: dateStr < todayStr ? 'missed' : 'upcoming',
    });

    current.setDate(current.getDate() + 1);
  }

  return schedule;
}

export function getTodayEntry(plan: UserPlan): RoadmapDay | null {
  const today = new Date().toISOString().split('T')[0];
  return plan.daily_schedule.find((d) => d.date === today) ?? null;
}

export function getWeekEntries(plan: UserPlan, offsetWeeks = 0): RoadmapDay[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startStr = monday.toISOString().split('T')[0];
  const endStr   = sunday.toISOString().split('T')[0];

  return plan.daily_schedule.filter((d) => d.date >= startStr && d.date <= endStr);
}

export function getPlanProgress(plan: UserPlan): { done: number; missed: number; total: number; pct: number } {
  const workout = plan.daily_schedule.filter((d) => d.day_type === 'workout');
  const done    = workout.filter((d) => d.status === 'completed' || d.status === 'partial').length;
  const missed  = workout.filter((d) => d.status === 'missed').length;
  const total   = workout.length;
  return { done, missed, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface PlanState {
  // Legacy weekly plan support
  currentPlan: WorkoutPlanRow | null;
  isGenerating: boolean;
  setCurrentPlan: (plan: WorkoutPlanRow | null) => void;
  setIsGenerating: (val: boolean) => void;

  // Roadmap multi-plan system
  plans: WorkoutPlanRow[];          // all plans from Supabase
  activePlanId: string | null;      // ID of the currently selected/active plan
  setPlans: (plans: WorkoutPlanRow[]) => void;
  addPlan: (plan: WorkoutPlanRow) => void;
  updatePlan: (plan: WorkoutPlanRow) => void;
  removePlan: (id: string) => void;
  setActivePlanId: (id: string | null) => void;

  // Computed helpers (call directly — not reactive)
  getActivePlan: () => WorkoutPlanRow | null;
  getActiveRoadmap: () => UserPlan | null;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  currentPlan: null,
  isGenerating: false,
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  setIsGenerating: (val) => set({ isGenerating: val }),

  plans: [],
  activePlanId: null,
  setPlans: (plans) => {
    set({ plans });
    // Auto-select first active roadmap plan if none selected
    const { activePlanId } = get();
    if (!activePlanId) {
      const firstRoadmap = plans.find((p) => isRoadmapPlan(p.plan_json as AnyPlanJson) && (p.plan_json as UserPlan).status === 'active');
      if (firstRoadmap) set({ activePlanId: firstRoadmap.id });
    }
  },
  addPlan: (plan) => {
    set((s) => ({ plans: [plan, ...s.plans] }));
    // Auto-activate new roadmap plans
    if (isRoadmapPlan(plan.plan_json as AnyPlanJson)) {
      set({ activePlanId: plan.id });
    }
  },
  updatePlan: (plan) =>
    set((s) => ({ plans: s.plans.map((p) => (p.id === plan.id ? plan : p)) })),
  removePlan: (id) =>
    set((s) => ({
      plans: s.plans.filter((p) => p.id !== id),
      activePlanId: s.activePlanId === id ? null : s.activePlanId,
    })),
  setActivePlanId: (id) => set({ activePlanId: id }),

  getActivePlan: () => {
    const { plans, activePlanId } = get();
    if (activePlanId) return plans.find((p) => p.id === activePlanId) ?? null;
    return plans[0] ?? null;
  },
  getActiveRoadmap: () => {
    const plan = get().getActivePlan();
    if (!plan) return null;
    const json = plan.plan_json as AnyPlanJson;
    if (!isRoadmapPlan(json)) return null;
    return json.status === 'active' ? json : null;
  },
}));
