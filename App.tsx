import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, LogBox } from 'react-native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { initMonitoring } from './src/lib/monitoring';
import { analytics } from './src/lib/analytics';

// Install crash reporter before any renders
initMonitoring();

// To plug in a real analytics provider (e.g. PostHog):
//   import PostHog from 'posthog-react-native';
//   analytics.init((event, props) => PostHog.capture(event, props));
void analytics;

// react-native-svg 15.x warns about unsupported filter primitives at init time
// even when none are used — suppress the noise
LogBox.ignoreLogs(['Some of the used filters are not yet supported']);

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { supabase } from './src/lib/supabase';
import { useAuthStore } from './src/store/authStore';
import { useProfileStore } from './src/store/profileStore';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { OnboardingNavigator } from './src/navigation/OnboardingNavigator';
import { MainNavigator } from './src/navigation/MainNavigator';
import { SplashSequence } from './src/components/SplashSequence';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { RootStackParamList } from './src/types';

// Configure how incoming notifications are handled while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { session, isLoading } = useAuthStore();
  const { hasCompletedOnboarding } = useProfileStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#f97316" size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!session ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !hasCompletedOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
}

async function fetchProfile(userId: string, setProfile: (p: any) => void) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('[App] profile fetch failed:', error.message);
    return;
  }
  if (data) setProfile(data);
}

export default function App() {
  const { setSession, setLoading } = useAuthStore();
  const { setProfile } = useProfileStore();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) await fetchProfile(session.user.id, setProfile);
      setLoading(false);
    }).catch((err) => {
      console.error('[App] getSession failed:', err);
      setLoading(false);
    });

    // Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Skip profile refetch on routine token refreshes — profile hasn't changed
      if (_event === 'TOKEN_REFRESHED') return;

      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user.id, setProfile);
      } else {
        setProfile(null);
      }
    });

    // Handle deep links for password reset (fitforge://reset-password#access_token=...&refresh_token=...)
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      if (url.includes('access_token') && url.includes('refresh_token')) {
        const fragment = url.split('#')[1] ?? '';
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, [setSession, setLoading, setProfile]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
          {!splashDone && <SplashSequence onFinish={() => setSplashDone(true)} />}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
