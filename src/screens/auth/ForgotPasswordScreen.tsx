import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ChevronLeft, CheckCircle } from 'lucide-react-native';
import { FocusInput } from '../../components/FocusInput';
import { PressButton } from '../../components/PressButton';
import { StaggerItem } from '../../components/StaggerList';
import { supabase } from '../../lib/supabase';
import { AuthStackParamList } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);

  async function handleReset() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { Alert.alert('Enter your email'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) { Alert.alert('Invalid email', 'Please enter a valid email address.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: 'fitforge://reset-password',
    });
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setSent(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} keyboardShouldPersistTaps="handled">

            <StaggerItem index={0} delay={60}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }}>
                <ChevronLeft size={20} color="rgba(255,255,255,0.4)" />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginLeft: 4 }}>Back</Text>
              </TouchableOpacity>
            </StaggerItem>

            {sent ? (
              <StaggerItem index={0} delay={60}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                  <CheckCircle size={64} color="#FF6B35" />
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 24, marginBottom: 10 }}>
                    Email sent
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, textAlign: 'center' }}>
                    Check your inbox for a password reset link.
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 32 }}>
                    <Text style={{ color: '#FF6B35', fontWeight: '700', fontSize: 15 }}>Back to sign in</Text>
                  </TouchableOpacity>
                </View>
              </StaggerItem>
            ) : (
              <>
                <StaggerItem index={1} delay={60}>
                  <View style={{ marginBottom: 32 }}>
                    <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>Reset password</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginTop: 6 }}>
                      Enter your email and we'll send a reset link.
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
                  <View style={{ marginTop: 12 }}>
                    <PressButton
                      title="Send Reset Link"
                      onPress={handleReset}
                      loading={loading}
                      disabled={loading}
                    />
                  </View>
                </StaggerItem>
              </>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
