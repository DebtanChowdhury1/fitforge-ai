import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, Switch, StyleSheet,
  TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LogOut, Trash2, Scale, Target, Zap, Dumbbell,
  Calendar, Clock, TrendingUp, Award, ChevronRight, Settings,
  Flame, Shield, Activity, Check, X, Camera, Pencil,
} from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useWorkoutStore } from '../store/workoutStore';
import { useProfileStore } from '../store/profileStore';
import { usePlanStore, isRoadmapPlan } from '../store/planStore';
import { FadeIn } from '../components/FadeIn';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { supabase } from '../lib/supabase';
import { Units, AnyPlanJson, UserPlan } from '../types';

// ── Avatar definitions ────────────────────────────────────────────────────────

const AVATARS = [
  { id: 'flame',    Icon: Flame,    colors: ['#FF6B35', '#ff2d55'] as [string, string] },
  { id: 'zap',      Icon: Zap,      colors: ['#bf5af2', '#5e5ce6'] as [string, string] },
  { id: 'dumbbell', Icon: Dumbbell, colors: ['#00d4ff', '#0084ff'] as [string, string] },
  { id: 'target',   Icon: Target,   colors: ['#34d399', '#059669'] as [string, string] },
  { id: 'shield',   Icon: Shield,   colors: ['#ff8c00', '#FF6B35'] as [string, string] },
  { id: 'activity', Icon: Activity, colors: ['#ff2d55', '#bf5af2'] as [string, string] },
];

function getAvatar(avatarId: string | null) {
  return AVATARS.find((a) => a.id === avatarId) ?? null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ value, label, color, icon }: {
  value: string; label: string; color: string; icon: React.ReactNode;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '18', borderColor: color + '30' }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
  );
}

const ALL_GOAL_LABELS: Record<string, string> = {
  muscle_gain:      'Build Muscle',
  fat_loss:         'Lose Fat',
  weight_loss:      'Weight Loss',
  endurance:        'Endurance',
  general_fitness:  'General Fitness',
};

const ALL_GOAL_COLORS: Record<string, string> = {
  muscle_gain:      '#FF6B35',
  fat_loss:         '#00d4ff',
  weight_loss:      '#00d4ff',
  endurance:        '#34d399',
  general_fitness:  '#bf5af2',
};

const LEVEL_COLORS: Record<string, string> = {
  beginner:     '#34d399',
  intermediate: '#ff8c00',
  advanced:     '#ff2d55',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  none:           'No Equipment',
  home_dumbbells: 'Home + Dumbbells',
  full_gym:       'Full Gym',
};

// ── Avatar Picker Modal ───────────────────────────────────────────────────────

function AvatarPickerModal({
  visible, currentId, onSelect, onClose,
}: {
  visible: boolean;
  currentId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Choose your avatar</Text>
          <Text style={styles.modalSub}>Pick an icon that represents your training identity</Text>

          <View style={styles.avatarGrid}>
            {AVATARS.map(({ id, Icon, colors }) => {
              const selected = id === currentId;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => onSelect(id)}
                  activeOpacity={0.75}
                  style={[styles.avatarOption, selected && styles.avatarOptionSelected]}
                >
                  <LinearGradient
                    colors={colors}
                    style={styles.avatarGradientBox}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon size={28} color="#fff" strokeWidth={1.8} />
                  </LinearGradient>
                  {selected && (
                    <View style={styles.avatarCheckBadge}>
                      <Check size={10} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Text style={styles.modalCloseBtnText}>Done</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Edit Field Modal ──────────────────────────────────────────────────────────

function EditFieldModal({
  visible, title, placeholder, value, onSave, onClose,
  autoCapitalize = 'words', maxLength = 40, statusNode,
  onChangeText,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  value: string;
  onSave: () => void;
  onClose: () => void;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  maxLength?: number;
  statusNode?: React.ReactNode;
  onChangeText: (t: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { paddingBottom: 30 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{title}</Text>

            <View style={styles.editFieldWrap}>
              <TextInput
                style={styles.editFieldInput}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="rgba(255,255,255,0.22)"
                autoFocus
                autoCapitalize={autoCapitalize}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={onSave}
                maxLength={maxLength}
                selectionColor="#FF6B35"
              />
              {statusNode && (
                <View style={{ marginTop: 8 }}>
                  {statusNode}
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, paddingHorizontal: 0 }}>
              <TouchableOpacity onPress={onClose} style={styles.editCancelBtn}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSave} style={styles.editSaveBtn}>
                <LinearGradient colors={['#FF6B35', '#ff2d55']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.editSaveBtnGrad}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Profile field row ─────────────────────────────────────────────────────────

function ProfileFieldRow({
  label, value, onEdit, subtext,
}: {
  label: string; value: string; onEdit: () => void; subtext?: string;
}) {
  return (
    <TouchableOpacity onPress={onEdit} activeOpacity={0.75} style={styles.fieldRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue} numberOfLines={1}>{value}</Text>
        {subtext && <Text style={styles.fieldSubtext}>{subtext}</Text>}
      </View>
      <View style={styles.fieldEditBtn}>
        <Pencil size={14} color="#FF6B35" strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { user } = useAuthStore();
  const { units, setUnits, logs } = useWorkoutStore();
  const { profile, setProfile } = useProfileStore();
  const { plans, activePlanId } = usePlanStore();
  const [notifs, setNotifs] = useState(true);

  // Avatar
  const avatarId: string | null = (user?.user_metadata?.avatar_id as string) ?? null;
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Name editing
  const [displayName, setDisplayName] = useState<string>(
    (user?.user_metadata?.display_name as string) ?? user?.email?.split('@')[0] ?? '',
  );
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Username editing
  const [username, setUsername] = useState<string>(
    (user?.user_metadata?.username as string) ?? '',
  );
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load profile from DB
  useEffect(() => {
    if (!user || profile) return;
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data as any); });
  }, [user]);

  // Active plan
  const activePlan = activePlanId
    ? plans.find((p) => p.id === activePlanId)
    : plans.find((p) => isRoadmapPlan(p.plan_json as AnyPlanJson));
  const activePlanJson = activePlan && isRoadmapPlan(activePlan.plan_json as AnyPlanJson)
    ? (activePlan.plan_json as UserPlan)
    : null;

  const derivedGoal  = activePlanJson?.goal_type ?? null;
  const derivedLevel = activePlanJson?.goal_details?.experience_level ?? null;
  const derivedEquip = activePlanJson?.goal_details?.equipment ?? null;
  const goalColor = derivedGoal ? (ALL_GOAL_COLORS[derivedGoal] ?? '#FF6B35') : '#FF6B35';

  // Stats
  const totalWorkouts = logs.length;
  const thisWeek = logs.filter(
    (l) => (Date.now() - new Date(l.date).getTime()) / 86400000 <= 7,
  ).length;
  const totalVolume = logs.reduce(
    (sum, log) =>
      sum + (log.exercises_json ?? []).reduce(
        (s: number, ex: any) => s + (ex.actual_sets ?? []).reduce(
          (ss: number, set: any) => ss + set.reps * set.weight, 0,
        ), 0,
      ), 0,
  );

  const sortedDates = [...new Set(logs.map((l) => l.date))].sort().reverse();
  let streak = 0;
  let cursor = new Date(); cursor.setHours(0, 0, 0, 0);
  for (const d of sortedDates) {
    const diff = Math.round((cursor.getTime() - new Date(d).getTime()) / 86400000);
    if (diff <= 1) { streak++; cursor = new Date(d); }
    else break;
  }

  const achievements = [
    { label: 'First Workout',  color: '#FF6B35', unlocked: totalWorkouts >= 1 },
    { label: '10 Sessions',    color: '#bf5af2', unlocked: totalWorkouts >= 10 },
    { label: '25 Sessions',    color: '#00d4ff', unlocked: totalWorkouts >= 25 },
    { label: 'Week Streak',    color: '#34d399', unlocked: streak >= 7 },
    { label: '50 Sessions',    color: '#ff8c00', unlocked: totalWorkouts >= 50 },
    { label: 'Iron Century',   color: '#ff2d55', unlocked: totalWorkouts >= 100 },
  ];

  // Training preferences — only from active plan
  const trainingDays   = activePlanJson?.goal_details?.days_per_week ?? null;
  const trainingMins   = activePlanJson?.goal_details?.session_duration ?? null;
  const trainingLimits = activePlanJson ? (profile?.limitations ?? null) : null;
  const hasTrainingPrefs = trainingDays !== null || trainingMins !== null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSelectAvatar(id: string) {
    setSavingAvatar(true);
    await supabase.auth.updateUser({ data: { avatar_id: id } });
    setSavingAvatar(false);
    setAvatarPickerOpen(false);
  }

  async function handleSaveName() {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setSavingName(true);
    await supabase.auth.updateUser({ data: { display_name: trimmed } });
    setSavingName(false);
    setEditingName(false);
  }

  function handleUsernameChange(text: string) {
    const clean = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(clean);
    setUsernameStatus('idle');
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (clean.length < 3) { setUsernameStatus(clean.length > 0 ? 'invalid' : 'idle'); return; }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles')
        .select('id').eq('username', clean).neq('id', user?.id ?? '').maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
  }

  async function handleSaveUsername() {
    if (usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking') return;
    const trimmed = username.trim();
    if (trimmed.length < 3) return;
    setSavingUsername(true);
    await Promise.all([
      supabase.auth.updateUser({ data: { username: trimmed } }),
      supabase.from('profiles').update({ username: trimmed }).eq('id', user?.id ?? ''),
    ]);
    setSavingUsername(false);
    setEditingUsername(false);
    setUsernameStatus('idle');
  }

  function handleSignOut() {
    Alert.alert('Sign out?', 'You will be logged out of FitForge AI.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  async function handleToggleNotifications(enabled: boolean) {
    if (enabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Enable notifications in your device Settings to receive workout reminders.',
        );
        return;
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time to forge',
          body: "Your workout is waiting. Let's make it count today.",
          sound: true,
        },
        trigger: { hour: 8, minute: 0, repeats: true } as any,
      });
      setNotifs(true);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotifs(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'Type DELETE below to confirm. All your plans, logs, and data will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete user data in order (RLS ensures user can only delete own rows)
              await Promise.all([
                supabase.from('workout_logs').delete().eq('user_id', user!.id),
                supabase.from('workout_plans').delete().eq('user_id', user!.id),
                supabase.from('progress_entries').delete().eq('user_id', user!.id),
                supabase.from('api_usage').delete().eq('user_id', user!.id),
              ]);
              await supabase.from('profiles').delete().eq('id', user!.id);
              await supabase.auth.signOut();
            } catch (err: any) {
              Alert.alert('Delete failed', 'Please try again or contact support.');
            }
          },
        },
      ],
    );
  }

  const selectedAvatar = getAvatar(avatarId);
  const nameToShow = (user?.user_metadata?.display_name as string) || user?.email?.split('@')[0] || 'Athlete';

  // Username status node for edit modal
  const usernameStatusNode = (() => {
    if (usernameStatus === 'checking') return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Checking availability...</Text>
      </View>
    );
    if (usernameStatus === 'available') return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Check size={14} color="#34d399" strokeWidth={2.5} />
        <Text style={{ color: '#34d399', fontSize: 12, fontWeight: '600' }}>Available</Text>
      </View>
    );
    if (usernameStatus === 'taken') return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <X size={14} color="#ff2d55" strokeWidth={2.5} />
        <Text style={{ color: '#ff2d55', fontSize: 12, fontWeight: '600' }}>Already taken</Text>
      </View>
    );
    if (usernameStatus === 'invalid') return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <X size={14} color="#ff8c00" strokeWidth={2.5} />
        <Text style={{ color: '#ff8c00', fontSize: 12 }}>Minimum 3 characters (a-z, 0-9, _)</Text>
      </View>
    );
    return null;
  })();

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Profile Card (Google-style) ── */}
          <FadeIn fromScale={0.97} fromY={0} duration={450}>
            <LinearGradient
              colors={[goalColor + '18', '#0a0a0f00']}
              style={styles.profileCard}
            >
              {/* Avatar row */}
              <View style={styles.avatarRow}>
                <TouchableOpacity onPress={() => setAvatarPickerOpen(true)} activeOpacity={0.8} style={styles.avatarWrap}>
                  <View style={[styles.avatar, { borderColor: goalColor + '55', shadowColor: goalColor }]}>
                    {selectedAvatar ? (
                      <LinearGradient
                        colors={selectedAvatar.colors}
                        style={styles.avatarGradientFull}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <selectedAvatar.Icon size={40} color="#fff" strokeWidth={1.6} />
                      </LinearGradient>
                    ) : (
                      <Text style={[styles.avatarText, { color: goalColor }]}>
                        {nameToShow[0].toUpperCase()}
                      </Text>
                    )}
                    {savingAvatar && (
                      <View style={styles.avatarSavingOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                  </View>
                  {/* Camera badge */}
                  <View style={[styles.cameraBadge, { backgroundColor: goalColor }]}>
                    <Camera size={12} color="#fff" strokeWidth={2} />
                  </View>
                </TouchableOpacity>

                {/* Name + username right of avatar */}
                <View style={{ flex: 1, marginLeft: 18, justifyContent: 'center' }}>
                  <Text style={styles.profileName} numberOfLines={1}>{nameToShow}</Text>
                  <Text style={styles.profileUsername} numberOfLines={1}>
                    {username ? `@${username}` : user?.email ?? ''}
                  </Text>
                  {derivedGoal && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                      <View style={[styles.badge, { backgroundColor: goalColor + '18', borderColor: goalColor + '35' }]}>
                        <Target size={11} color={goalColor} />
                        <Text style={[styles.badgeText, { color: goalColor }]}>
                          {ALL_GOAL_LABELS[derivedGoal] ?? derivedGoal}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Tap hint */}
              <TouchableOpacity onPress={() => setAvatarPickerOpen(true)} style={styles.changePhotoBtn}>
                <Camera size={13} color="rgba(255,255,255,0.45)" />
                <Text style={styles.changePhotoText}>Change profile photo</Text>
              </TouchableOpacity>
            </LinearGradient>
          </FadeIn>

          {/* ── Edit Profile Fields ── */}
          <FadeIn delay={100} style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <SectionHeader title="Profile Info" />
            <View style={styles.settingsCard}>
              <ProfileFieldRow
                label="Full Name"
                value={nameToShow}
                onEdit={() => { setDisplayName(nameToShow); setEditingName(true); }}
                subtext="Used as your display name across the app"
              />
              <View style={styles.divider} />
              <ProfileFieldRow
                label="Username"
                value={username ? `@${username}` : 'Not set — tap to add'}
                onEdit={() => { setEditingUsername(true); }}
                subtext={username ? 'Unique handle for your profile' : undefined}
              />
              <View style={styles.divider} />
              <View style={[styles.fieldRow, { opacity: 0.55 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <Text style={styles.fieldValue} numberOfLines={1}>{user?.email ?? ''}</Text>
                  <Text style={styles.fieldSubtext}>Managed by your account provider</Text>
                </View>
              </View>
            </View>
          </FadeIn>

          {/* ── Stats ── */}
          <FadeIn delay={160} style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <SectionHeader title="Training Stats" />
            <View style={styles.statsGrid}>
              <StatCard value={String(totalWorkouts)} label="Workouts" color="#FF6B35"
                icon={<TrendingUp size={18} color="#FF6B35" />} />
              <StatCard value={`${streak}d`} label="Streak" color="#00d4ff"
                icon={<Award size={18} color="#00d4ff" />} />
              <StatCard value={`${Math.round(totalVolume / 1000)}k`} label={`Volume (${units})`} color="#bf5af2"
                icon={<Zap size={18} color="#bf5af2" />} />
              <StatCard value={String(thisWeek)} label="This Week" color="#34d399"
                icon={<Calendar size={18} color="#34d399" />} />
            </View>
          </FadeIn>

          {/* ── Training Preferences — plan only ── */}
          {hasTrainingPrefs && (
            <FadeIn delay={210} style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <SectionHeader title="Training Preferences" />
              <View style={styles.prefCard}>
                {trainingDays !== null && (
                  <View style={styles.prefRow}>
                    <Calendar size={16} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.prefLabel}>Days per week</Text>
                    <Text style={styles.prefValue}>{trainingDays} days</Text>
                  </View>
                )}
                {trainingMins !== null && trainingDays !== null && (
                  <View style={styles.divider} />
                )}
                {trainingMins !== null && (
                  <View style={styles.prefRow}>
                    <Clock size={16} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.prefLabel}>Session duration</Text>
                    <Text style={styles.prefValue}>{trainingMins} min</Text>
                  </View>
                )}
                {trainingLimits ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.prefRow}>
                      <Settings size={16} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.prefLabel}>Limitations</Text>
                      <Text style={[styles.prefValue, { maxWidth: 160, textAlign: 'right' }]} numberOfLines={2}>
                        {trainingLimits}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11, marginTop: 8 }}>From your active training plan</Text>
            </FadeIn>
          )}

          {/* ── Goal badges ── */}
          {derivedGoal && (
            <FadeIn delay={255} style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <SectionHeader title="Active Plan Goals" />
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: goalColor + '18', borderColor: goalColor + '35' }]}>
                  <Target size={12} color={goalColor} />
                  <Text style={[styles.badgeText, { color: goalColor }]}>
                    {ALL_GOAL_LABELS[derivedGoal] ?? derivedGoal}
                  </Text>
                </View>
                {derivedLevel && (
                  <View style={[styles.badge, {
                    backgroundColor: (LEVEL_COLORS[derivedLevel] ?? '#fff') + '14',
                    borderColor: (LEVEL_COLORS[derivedLevel] ?? '#fff') + '30',
                  }]}>
                    <Zap size={12} color={LEVEL_COLORS[derivedLevel] ?? '#fff'} />
                    <Text style={[styles.badgeText, { color: LEVEL_COLORS[derivedLevel] ?? '#fff', textTransform: 'capitalize' }]}>
                      {derivedLevel}
                    </Text>
                  </View>
                )}
                {derivedEquip && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)' }]}>
                    <Dumbbell size={12} color="rgba(255,255,255,0.5)" />
                    <Text style={[styles.badgeText, { color: 'rgba(255,255,255,0.5)' }]}>
                      {EQUIPMENT_LABELS[derivedEquip] ?? derivedEquip}
                    </Text>
                  </View>
                )}
              </View>
            </FadeIn>
          )}

          {/* ── Achievements ── */}
          <FadeIn delay={295} style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <SectionHeader title="Achievements" />
            <View style={styles.achieveGrid}>
              {achievements.map((a, i) => (
                <View key={i} style={[styles.achieveChip, !a.unlocked && styles.achieveLocked]}>
                  <Award size={14} color={a.unlocked ? a.color : 'rgba(255,255,255,0.18)'} />
                  <Text style={[styles.achieveText, { color: a.unlocked ? a.color : 'rgba(255,255,255,0.2)' }]}>
                    {a.label}
                  </Text>
                </View>
              ))}
            </View>
          </FadeIn>

          {/* ── Preferences ── */}
          <FadeIn delay={335} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <SectionHeader title="Preferences" />
            <View style={styles.settingsCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <Scale size={17} color="rgba(255,255,255,0.5)" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Weight Units</Text>
                  <Text style={styles.settingSub}>Used across logs and volume tracking</Text>
                </View>
                <View style={styles.unitsToggle}>
                  {(['kg', 'lb'] as Units[]).map((u) => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setUnits(u)}
                      style={[styles.unitBtn, units === u && styles.unitBtnActive]}
                    >
                      <Text style={[styles.unitText, units === u && styles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <Award size={17} color="rgba(255,255,255,0.5)" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Workout Reminders</Text>
                  <Text style={styles.settingSub}>Daily push notifications</Text>
                </View>
                <Switch
                  value={notifs}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#FF6B35' }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </FadeIn>

          {/* ── About ── */}
          <FadeIn delay={370} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <SectionHeader title="About" />
            <View style={styles.settingsCard}>
              <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                <View style={styles.settingIcon}>
                  <Zap size={17} color="rgba(255,255,255,0.5)" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>FitForge AI</Text>
                  <Text style={styles.settingSub}>v2.4 — Ascend</Text>
                </View>
              </View>
            </View>
          </FadeIn>

          {/* ── Account ── */}
          <FadeIn delay={400} style={{ paddingHorizontal: 20 }}>
            <SectionHeader title="Account" />
            <View style={styles.settingsCard}>
              <AnimatedPressable onPress={handleSignOut} scaleDown={0.97}>
                <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.settingIcon}>
                    <LogOut size={17} color="rgba(255,255,255,0.5)" />
                  </View>
                  <Text style={styles.settingLabel}>Sign Out</Text>
                  <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
                </View>
              </AnimatedPressable>
            </View>

            <AnimatedPressable onPress={handleDeleteAccount} scaleDown={0.97} style={{ marginTop: 10 }}>
              <View style={[styles.settingsCard, { borderColor: 'rgba(255,45,85,0.18)' }]}>
                <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                  <View style={[styles.settingIcon, styles.settingIconDanger]}>
                    <Trash2 size={17} color="#ff2d55" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: '#ff2d55' }]}>Delete Account</Text>
                    <Text style={styles.settingSub}>Permanently removes all your data</Text>
                  </View>
                </View>
              </View>
            </AnimatedPressable>
          </FadeIn>

        </ScrollView>
      </SafeAreaView>

      {/* ── Avatar Picker ── */}
      <AvatarPickerModal
        visible={avatarPickerOpen}
        currentId={avatarId}
        onSelect={handleSelectAvatar}
        onClose={() => setAvatarPickerOpen(false)}
      />

      {/* ── Edit Name Modal ── */}
      <EditFieldModal
        visible={editingName}
        title="Edit Full Name"
        placeholder="Your display name"
        value={displayName}
        onChangeText={setDisplayName}
        onSave={handleSaveName}
        onClose={() => { setDisplayName(nameToShow); setEditingName(false); }}
        autoCapitalize="words"
      />

      {/* ── Edit Username Modal ── */}
      <EditFieldModal
        visible={editingUsername}
        title="Edit Username"
        placeholder="yourname"
        value={username}
        onChangeText={handleUsernameChange}
        onSave={handleSaveUsername}
        onClose={() => { setEditingUsername(false); setUsernameStatus('idle'); }}
        autoCapitalize="none"
        maxLength={20}
        statusNode={usernameStatusNode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },

  // Profile card (Google-style top section)
  profileCard: {
    paddingTop: 28, paddingBottom: 20, paddingHorizontal: 24,
    marginBottom: 8,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 3,
    backgroundColor: 'rgba(255,107,53,0.12)',
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 20,
    overflow: 'hidden',
  },
  avatarGradientFull: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 38, fontWeight: '900' },
  avatarSavingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#0a0a0f',
  },
  profileName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  profileUsername: { color: 'rgba(255,255,255,0.38)', fontSize: 13, marginTop: 3 },
  changePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, alignSelf: 'flex-start',
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  changePhotoText: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600' },

  // Section title
  sectionTitle: {
    color: 'rgba(255,255,255,0.3)', fontSize: 10.5, fontWeight: '800',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10,
  },

  // Profile field rows (Google-like)
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
  },
  fieldLabel: { color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  fieldValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  fieldSubtext: { color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 3 },
  fieldEditBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12,
  },

  // Edit modals
  editFieldWrap: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6,
  },
  editFieldInput: {
    color: '#fff', fontSize: 17, fontWeight: '600',
    paddingVertical: 10,
  },
  editCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  editSaveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  editSaveBtnGrad: { paddingVertical: 14, alignItems: 'center' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47.5%', backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18, padding: 16, alignItems: 'center', gap: 6,
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600' },

  // Prefs
  prefCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 18,
  },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  prefLabel: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  prefValue: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.06)' },

  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achieveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)',
  },
  achieveLocked: { opacity: 0.45 },
  achieveText: { fontSize: 12, fontWeight: '700' },

  settingsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 18,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  settingIconDanger: { backgroundColor: 'rgba(255,45,85,0.1)' },
  settingLabel: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  settingSub:   { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },

  unitsToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' },
  unitBtn:     { paddingHorizontal: 16, paddingVertical: 8 },
  unitBtnActive: { backgroundColor: '#FF6B35' },
  unitText:    { color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 13 },
  unitTextActive: { color: '#fff' },

  // Avatar picker modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  modalSheet: {
    backgroundColor: '#111120', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingBottom: 40, paddingHorizontal: 24,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  modalSub: { color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', marginBottom: 24 },

  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    justifyContent: 'center', marginBottom: 28,
  },
  avatarOption: { borderRadius: 20, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  avatarOptionSelected: { borderColor: '#FF6B35' },
  avatarGradientBox: {
    width: 72, height: 72, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarCheckBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FF6B35',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#111120',
  },

  modalCloseBtn: {
    backgroundColor: '#FF6B35', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalCloseBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
