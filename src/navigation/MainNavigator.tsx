import React, { useRef, useEffect } from 'react';
import { View, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Calendar, Bot, BookOpen, TrendingUp } from 'lucide-react-native';

import { HomeScreen }            from '../screens/main/HomeScreen';
import { HealthInsightsScreen }  from '../screens/main/HealthInsightsScreen';
import { WorkoutSessionScreen }  from '../screens/main/WorkoutSessionScreen';
import { StoryScreen }           from '../screens/StoryScreen';
import { LandingVideoScreen }    from '../screens/LandingVideoScreen';
import { WatchDemoScreen }       from '../screens/WatchDemoScreen';
import { ProfileScreen }         from '../screens/ProfileScreen';
import { ProgressScreen }        from '../screens/main/ProgressScreen';
import { ReportDetailScreen }    from '../screens/main/ReportDetailScreen';
import { AICoachScreen }         from '../screens/main/AICoachScreen';
import { ChatHistoryScreen }     from '../screens/main/ChatHistoryScreen';
import { ExerciseLibraryScreen } from '../screens/main/ExerciseLibraryScreen';

// Plan stack screens
import { PlanListScreen }   from '../screens/plan/PlanListScreen';
import { PlanWizardScreen } from '../screens/plan/PlanWizardScreen';
import { PlanDetailScreen } from '../screens/plan/PlanDetailScreen';
import { DayLogScreen }     from '../screens/plan/DayLogScreen';

import { HomeStackParamList, ForgeAIStackParamList, PlanStackParamList, ProgressStackParamList } from '../types';

const Tab            = createBottomTabNavigator();
const HomeStack      = createNativeStackNavigator<HomeStackParamList>();
const PlanStack      = createNativeStackNavigator<PlanStackParamList>();
const ForgeAIStack   = createNativeStackNavigator<ForgeAIStackParamList>();
const ProgressStack  = createNativeStackNavigator<ProgressStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard" component={HomeScreen} />
      <HomeStack.Screen name="WorkoutSession" component={WorkoutSessionScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <HomeStack.Screen name="Story" component={StoryScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <HomeStack.Screen name="LandingVideo" component={LandingVideoScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <HomeStack.Screen name="WatchDemo" component={WatchDemoScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <HomeStack.Screen name="Profile" component={ProfileScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <HomeStack.Screen name="HealthInsights" component={HealthInsightsScreen}
        options={{ animation: 'slide_from_right' }} />
    </HomeStack.Navigator>
  );
}

function PlanStackNavigator() {
  return (
    <PlanStack.Navigator screenOptions={{ headerShown: false }}>
      <PlanStack.Screen name="PlanList"   component={PlanListScreen}   />
      <PlanStack.Screen name="PlanWizard" component={PlanWizardScreen} options={{ animation: 'slide_from_right' }} />
      <PlanStack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ animation: 'slide_from_right' }} />
      <PlanStack.Screen name="DayLog"     component={DayLogScreen}     options={{ animation: 'slide_from_right' }} />
    </PlanStack.Navigator>
  );
}

function ProgressStackNavigator() {
  return (
    <ProgressStack.Navigator screenOptions={{ headerShown: false }}>
      <ProgressStack.Screen name="ProgressDashboard" component={ProgressScreen} />
      <ProgressStack.Screen name="ReportDetail" component={ReportDetailScreen}
        options={{ animation: 'slide_from_right' }} />
    </ProgressStack.Navigator>
  );
}

function ForgeAIStackNavigator() {
  return (
    <ForgeAIStack.Navigator screenOptions={{ headerShown: false }}>
      <ForgeAIStack.Screen name="ChatHistory" component={ChatHistoryScreen} />
      <ForgeAIStack.Screen name="ChatSession" component={AICoachScreen}
        options={{ animation: 'slide_from_right' }} />
    </ForgeAIStack.Navigator>
  );
}

function TabIcon({ Icon, focused }: { Icon: any; focused: boolean }) {
  const scale  = useRef(new Animated.Value(1)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.spring(bounce, { toValue: -5, tension: 420, friction: 5, useNativeDriver: true } as any),
        Animated.spring(bounce, { toValue: 0,  tension: 200, friction: 8, useNativeDriver: true } as any),
      ] as any).start();
    }
    Animated.spring(scale, { toValue: focused ? 1.18 : 1, tension: 220, friction: 7, useNativeDriver: true } as any).start();
  }, [focused]);

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY: bounce }] }}>
      <Animated.View style={{
        alignItems: 'center', justifyContent: 'center',
        width: 44, height: 36, borderRadius: 12,
        transform: [{ scale }],
        shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 0 },
        shadowRadius: 10, shadowOpacity: focused ? 0.6 : 0,
        backgroundColor: focused ? 'rgba(255,107,53,0.14)' : 'transparent',
      }}>
        <Icon size={22} color={focused ? '#FF6B35' : 'rgba(255,255,255,0.28)'} strokeWidth={focused ? 2.5 : 1.8} />
      </Animated.View>
      <View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 2, backgroundColor: focused ? '#FF6B35' : 'transparent' }} />
    </Animated.View>
  );
}

const TABS = [
  { name: 'Home',     component: HomeStackNavigator,    Icon: Home      },
  { name: 'Plan',     component: PlanStackNavigator,    Icon: Calendar  },
  { name: 'ForgeAI',  component: ForgeAIStackNavigator, Icon: Bot       },
  { name: 'Library',  component: ExerciseLibraryScreen, Icon: BookOpen  },
  { name: 'Progress', component: ProgressStackNavigator, Icon: TrendingUp },
];

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f0f1a',
          borderTopColor: 'rgba(255,255,255,0.05)',
          borderTopWidth: 1,
          paddingBottom: 10, paddingTop: 8, height: 70,
        },
        tabBarActiveTintColor:   '#FF6B35',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.25)',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find((t) => t.name === route.name)!;
          return <TabIcon Icon={tab.Icon} focused={focused} />;
        },
      })}
    >
      {TABS.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}
