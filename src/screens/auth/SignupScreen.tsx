import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, UserPlus, ChevronLeft } from 'lucide-react-native';
import { FocusInput } from '../../components/FocusInput';
import { PressButton } from '../../components/PressButton';
import { StaggerItem } from '../../components/StaggerList';
import { supabase } from '../../lib/supabase';
import { AuthStackParamList } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSignup() {
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !password) { Alert.alert('Missing fields', 'Enter your email and password.'); return; }
    if (!emailRegex.test(trimmedEmail)) { Alert.alert('Invalid email', 'Enter a valid email address.'); return; }
    if (password !== confirm) { Alert.alert('Passwords do not match'); return; }
    if (password.length < 8) { Alert.alert('Weak password', 'Password must be at least 8 characters.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: trimmedEmail, password });
    setLoading(false);
    if (error) { Alert.alert('Sign up failed', error.message); return; }
    Alert.alert('Account created', 'Sign in to start your journey.');
    navigation.navigate('Login');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <StaggerItem index={0} delay={60}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
                <ChevronLeft size={20} color="rgba(255,255,255,0.4)" />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginLeft: 4 }}>Back</Text>
              </TouchableOpacity>
            </StaggerItem>

            <StaggerItem index={1} delay={60}>
              <View style={{ marginBottom: 36 }}>
                <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>Create account</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginTop: 6 }}>
                  Start your AI-powered training journey
                </Text>
              </View>
            </StaggerItem>

            <StaggerItem index={2} delay={60}>
              <FocusInput
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon={<Mail size={16} color="rgba(255,255,255,0.3)" />}
              />
            </StaggerItem>

            <StaggerItem index={3} delay={60}>
              <FocusInput
                label="Password"
                placeholder="At least 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                icon={<Lock size={16} color="rgba(255,255,255,0.3)" />}
              />
            </StaggerItem>

            <StaggerItem index={4} delay={60}>
              <FocusInput
                label="Confirm password"
                placeholder="Repeat your password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                icon={<Lock size={16} color="rgba(255,255,255,0.3)" />}
              />
            </StaggerItem>

            <StaggerItem index={5} delay={60}>
              <View style={{ marginTop: 12, marginBottom: 28 }}>
                <PressButton
                  title="Create Account"
                  onPress={handleSignup}
                  loading={loading}
                  disabled={loading}
                  icon={<UserPlus size={18} color="#fff" />}
                />
              </View>
            </StaggerItem>

            <StaggerItem index={6} delay={60}>
              <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.35)' }}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={{ color: '#FF6B35', fontWeight: '700' }}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </StaggerItem>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
