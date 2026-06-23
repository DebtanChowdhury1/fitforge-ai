export type Goal = 'muscle_gain' | 'fat_loss' | 'endurance' | 'general_fitness';
export type GoalType = 'weight_loss' | 'muscle_gain' | 'endurance' | 'general_fitness';

/** Convert a profile Goal to the GoalType expected by edge functions. */
export function mapGoalToGoalType(goal: Goal): GoalType {
  if (goal === 'fat_loss') return 'weight_loss';
  return goal as GoalType;
}

export interface GoalDetails {
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  equipment: 'none' | 'home_dumbbells' | 'full_gym';
  days_per_week: number;
  session_duration: number;
  limitations: string;
  units: 'kg' | 'lb';
  current_weight?: number;
  target_weight?: number;
  event_type?: string;
  dietary_note?: string;
}

export interface CardioTarget {
  type: string;
  duration: number;
  intensity: 'low' | 'moderate' | 'high';
}

export interface DayUserLog {
  logged_at: string;
  completion_percentage: number;
  exercises_done: { name: string; sets_done: { reps: number; weight: number }[] }[];
  notes: string;
  cardio_done?: { duration: number; intensity: string };
}

export interface AIAssessment {
  achieved: boolean;
  achievement_percentage: number;
  analysis: string;
  adjustment_type: 'none' | 'increased_load' | 'extended_deadline';
  adjustment_message: string | null;
  new_end_date: string | null;
  is_harmful: boolean;
  load_increase_note: string | null;
}

export interface RoadmapDay {
  date: string;
  day_of_week: string;
  week_number: number;
  day_type: 'workout' | 'rest' | 'active_recovery';
  focus: string;
  exercises: Exercise[];
  cardio?: CardioTarget | null;
  status: 'upcoming' | 'completed' | 'partial' | 'missed';
  user_log?: DayUserLog;
  ai_assessment?: AIAssessment;
}

export interface AIRoadmapPhase {
  name: string;
  week_range: [number, number];
  theme: string;
  weekly_template: {
    day_of_week: string;
    day_type: 'workout' | 'rest' | 'active_recovery';
    focus: string;
    exercises: Exercise[];
    cardio: CardioTarget | null;
  }[];
}

export interface UserPlan {
  plan_type: 'roadmap';
  name: string;
  goal_type: GoalType;
  goal_details: GoalDetails;
  start_date: string;
  end_date: string;
  original_end_date: string;
  total_days: number;
  status: 'active' | 'completed' | 'paused';
  daily_schedule: RoadmapDay[];
  ai_note?: string;
  nutrition_note?: string;
  load_increase_active?: boolean;
}

export type AnyPlanJson = WorkoutPlan | UserPlan;
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'none' | 'home_dumbbells' | 'full_gym';
export type Units = 'kg' | 'lb';

export interface Profile {
  id: string;
  goal: Goal;
  fitness_level: FitnessLevel;
  equipment: Equipment;
  days_per_week: number;
  session_duration: number;
  limitations: string;
  created_at: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
  muscle_group?: string;
}

export interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  weeks: number;
  schedule: WorkoutDay[];
  notes?: string;
}

export interface WorkoutPlanRow {
  id: string;
  user_id: string;
  created_at: string;
  plan_json: AnyPlanJson;
}

export interface LoggedExercise {
  name: string;
  planned_sets: number;
  planned_reps: string;
  actual_sets: { reps: number; weight: number }[];
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  plan_id: string;
  date: string;
  exercises_json: LoggedExercise[];
}

export interface ProgressEntry {
  id: string;
  user_id: string;
  date: string;
  body_weight: number | null;
  measurements_json: Record<string, number>;
}

// ── Coach / discovery types ────────────────────────────────────────────────────

export type ValidationSeverity = 'ok' | 'warning' | 'error';

export interface ProfileSoFar {
  goal: GoalType | null;
  currentWeightKg: number | null;
  goalWeightKg: number | null;
  timeframeWeeks: number | null;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  dietPattern: string | null;
  constraints: string[];
  daysPerWeek: number | null;
  sessionDurationMins: number | null;
  equipment: 'none' | 'home_dumbbells' | 'full_gym' | null;
  experience: 'beginner' | 'intermediate' | 'advanced' | null;
  eventType: string | null;
  units: 'kg' | 'lb';
}

export const EMPTY_PROFILE_SO_FAR: ProfileSoFar = {
  goal: null,
  currentWeightKg: null,
  goalWeightKg: null,
  timeframeWeeks: null,
  activityLevel: null,
  dietPattern: null,
  constraints: [],
  daysPerWeek: null,
  sessionDurationMins: null,
  equipment: null,
  experience: null,
  eventType: null,
  units: 'kg',
};

export type CoachPhase = 'discovery' | 'ready_for_plan' | 'qa';

export interface CoachAction {
  type: string;
  label: string;
  description: string;
  data?: Record<string, unknown>;
}

// ── Navigation param lists ─────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type OnboardingStackParamList = {
  Goal: undefined;
  FitnessLevel: undefined;
  Equipment: undefined;
  Schedule: undefined;
  Limitations: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Plan: undefined;
  Progress: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  Dashboard: undefined;
  WorkoutSession: { dayIndex: number };
  Story: undefined;
  LandingVideo: undefined;
  WatchDemo: undefined;
  Profile: undefined;
  HealthInsights: undefined;
};

export type PlanStackParamList = {
  PlanList: undefined;
  PlanWizard: { prefill?: ProfileSoFar } | undefined;
  PlanDetail: { planId: string };
  DayLog: { planId: string; date: string };
};

export interface ReportSection {
  id: string;
  title: string;
  content: string;
}

export interface Report {
  id: string;
  user_id: string;
  type: 'daily' | 'custom';
  title: string;
  content: { sections: ReportSection[] };
  created_at: string;
  expires_at: string;
}

export type ProgressStackParamList = {
  ProgressDashboard: undefined;
  ReportDetail: { report: Report };
};

export type ForgeAIStackParamList = {
  ChatHistory: undefined;
  ChatSession: { sessionId: string; isNew: boolean };
};
