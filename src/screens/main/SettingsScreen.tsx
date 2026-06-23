import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Trash2, Scale, Info, Cpu, Database, ChevronRight, User } from 'lucide-react-native';
import { StaggerItem } from '../../components/StaggerList';
import { PressButton } from '../../components/PressButton';
import { useAuthStore } from '../../store/authStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useProfileStore } from '../../store/profileStore';
import { supabase } from '../../lib/supabase';
import { Units } from '../../types';

const GOAL_LABELS: Record<string, string> = {
  muscle_gain: 'Build Muscle',
  fat_loss: 'Lose Fat',
  endurance: 'Improve Endurance',
  general_fitness: 'General Fitness',
};

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '700',
      letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 28, marginBottom: 8, paddingHorizontal: 4,
    }}>
      {title}
    </Text>
  );
}

function SettingRow({
  icon, label, sub, right, onPress, danger = false,
}: { icon: React.ReactNode; label: string; sub?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: danger ? 'rgba(255,45,85,0.1)' : 'rgba(255,255,255,0.06)',
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? '#ff2d55' : '#fff', fontSize: 15, fontWeight: '600' }}>{label}</Text>
        {sub && <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 }}>{sub}</Text>}
      </View>
      {right ?? (onPress ? <ChevronRight size={16} color="rgba(255,255,255,0.2)" /> : null)}
    </TouchableOpacity>
  );
}

export function SettingsScreen() {
  const { user } = useAuthStore();
  const { units, setUnits } = useWorkoutStore();
  const { profile } = useProfileStore();

  function handleSignOut() {
    Alert.alert('Sign out?', 'You will be logged out of FitForge AI.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'All your data will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await Promise.all([
                supabase.from('workout_logs').delete().eq('user_id', user.id),
                supabase.from('workout_plans').delete().eq('user_id', user.id),
                supabase.from('progress_entries').delete().eq('user_id', user.id),
                supabase.from('api_usage').delete().eq('user_id', user.id),
                supabase.from('reports').delete().eq('user_id', user.id),
              ]);
              await supabase.from('profiles').delete().eq('id', user.id);
              await supabase.auth.signOut();
            } catch {
              Alert.alert('Delete failed', 'Could not delete your account. Please contact support.');
            }
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          <StaggerItem index={0}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, paddingTop: 16, marginBottom: 4 }}>
              Settings
            </Text>
          </StaggerItem>

          {/* Profile card */}
          <StaggerItem index={1}>
            <LinearGradient
              colors={['rgba(255,107,53,0.12)', 'rgba(255,107,53,0.04)']}
              style={{ borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)', marginTop: 16 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{
                  width: 52, height: 52, borderRadius: 16,
                  backgroundColor: 'rgba(255,107,53,0.2)', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User size={24} color="#FF6B35" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>Signed in as</Text>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, marginTop: 2 }}>{user?.email}</Text>
                </View>
              </View>
              {profile && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                  <View style={{ backgroundColor: 'rgba(255,107,53,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)' }}>
                    <Text style={{ color: '#FF6B35', fontSize: 12, fontWeight: '600' }}>{GOAL_LABELS[profile.goal] ?? profile.goal}</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>{profile.fitness_level}</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' }}>{profile.days_per_week}× / week</Text>
                  </View>
                </View>
              )}
            </LinearGradient>
          </StaggerItem>

          <StaggerItem index={2}>
            <SectionHeader title="Preferences" />
            <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, paddingHorizontal: 16 }}>
              <SettingRow
                icon={<Scale size={18} color="rgba(255,255,255,0.5)" />}
                label="Weight Units"
                sub="Used for logging and volume tracking"
                right={
                  <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                    {(['kg', 'lb'] as Units[]).map((u) => (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setUnits(u)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 7,
                          backgroundColor: units === u ? '#FF6B35' : 'transparent',
                        }}
                      >
                        <Text style={{ color: units === u ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 13 }}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                }
              />
            </View>
          </StaggerItem>

          <StaggerItem index={3}>
            <SectionHeader title="About" />
            <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, paddingHorizontal: 16 }}>
              <SettingRow icon={<Info size={18} color="rgba(255,255,255,0.5)" />} label="FitForge AI" sub="Version 1.0.0" />
              <SettingRow icon={<Cpu size={18} color="rgba(255,255,255,0.5)" />} label="AI Provider" sub="Groq (Llama 3.3 70B) + Gemini fallback" />
              <SettingRow icon={<Database size={18} color="rgba(255,255,255,0.5)" />} label="Data Storage" sub="Supabase — your data stays private" />
            </View>
          </StaggerItem>

          <StaggerItem index={4}>
            <SectionHeader title="Account" />
            <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, paddingHorizontal: 16, marginBottom: 16 }}>
              <SettingRow
                icon={<LogOut size={18} color="rgba(255,255,255,0.5)" />}
                label="Sign Out"
                onPress={handleSignOut}
              />
              <SettingRow
                icon={<Trash2 size={18} color="#ff2d55" />}
                label="Delete Account"
                sub="Permanently removes all your data"
                onPress={handleDeleteAccount}
                danger
              />
            </View>
          </StaggerItem>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
