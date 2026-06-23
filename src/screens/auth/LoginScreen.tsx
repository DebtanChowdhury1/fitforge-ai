import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, LogIn } from 'lucide-react-native';
import { ForgeLogo } from '../../components/ForgeLogo';
import { FocusInput } from '../../components/FocusInput';
import { PressButton } from '../../components/PressButton';
import { StaggerItem } from '../../components/StaggerList';
import { supabase } from '../../lib/supabase';
import { AuthStackParamList } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) { Alert.alert('Missing fields', 'Enter your email and password.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
    setLoading(false);
    if (error) Alert.alert('Sign in failed', error.message);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Logo lockup */}
            <StaggerItem index={0} delay={80}>
              <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <ForgeLogo size={72} variant="icon" animate />
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 16 }}>
                  FitForge AI
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, letterSpacing: 2, marginTop: 4, textTransform: 'uppercase' }}>
                  Forge your limits
                </Text>
              </View>
            </StaggerItem>

            <StaggerItem index={1} delay={80}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 }}>Welcome back</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 28 }}>
                Sign in to continue your journey
              </Text>
            </StaggerItem>

            <StaggerItem index={2} delay={80}>
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

            <StaggerItem index={3} delay={80}>
              <FocusInput
                label="Password"
                placeholder="Your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                icon={<Lock size={16} color="rgba(255,255,255,0.3)" />}
              />
            </StaggerItem>

            <StaggerItem index={4} delay={80}>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginBottom: 24 }}>
                <Text style={{ color: '#FF6B35', fontSize: 13, fontWeight: '600' }}>Forgot password?</Text>
              </TouchableOpacity>
            </StaggerItem>

            <StaggerItem index={5} delay={80}>
              <PressButton
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                icon={<LogIn size={18} color="#fff" />}
              />
            </StaggerItem>

            <StaggerItem index={6} delay={80}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 28 }}>
                <Text style={{ color: 'rgba(255,255,255,0.35)' }}>No account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                  <Text style={{ color: '#FF6B35', fontWeight: '700' }}>Sign up free</Text>
                </TouchableOpacity>
              </View>
            </StaggerItem>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
