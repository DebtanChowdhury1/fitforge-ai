import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, Alert, Dimensions, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { PenSquare, Trash2, MessageSquare, ChevronRight } from 'lucide-react-native';
import { useChatStore, ChatSession } from '../../store/chatStore';
import { useProfileStore } from '../../store/profileStore';
import { ForgeOrbGL } from '../../components/gl/ForgeOrbGL';
import { WorkflowGL } from '../../components/gl/WorkflowGL';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { FadeIn } from '../../components/FadeIn';
import { PulseView } from '../../components/PulseView';
import { ForgeAIStackParamList } from '../../types';

type Props = NativeStackScreenProps<ForgeAIStackParamList, 'ChatHistory'>;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function SessionCard({ session, index, onPress, onDelete }: {
  session: ChatSession;
  index: number;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <FadeIn delay={index * 60} fromX={24} fromY={0} style={{ marginBottom: 10 }}>
      <AnimatedPressable onPress={onPress} scaleDown={0.96}>
        <View style={{
          backgroundColor: 'rgba(22,22,31,0.9)',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}>
          <PulseView minScale={0.92} maxScale={1.08} duration={1800 + index * 150}>
            <View style={{
              width: 42, height: 42, borderRadius: 12,
              backgroundColor: 'rgba(191,90,242,0.14)',
              borderWidth: 1, borderColor: 'rgba(191,90,242,0.25)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquare size={18} color="#bf5af2" />
            </View>
          </PulseView>

          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 3 }} numberOfLines={1}>
              {session.title}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 18 }} numberOfLines={1}>
              {session.preview}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{relativeTime(session.updatedAt)}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.12)', fontSize: 11 }}> · </Text>
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
                {session.messageCount} {session.messageCount === 1 ? 'message' : 'messages'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AnimatedPressable onPress={onDelete} scaleDown={0.85} haptic>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,59,48,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={15} color="#ff3b30" />
              </View>
            </AnimatedPressable>
            <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
          </View>
        </View>
      </AnimatedPressable>
    </FadeIn>
  );
}

export function ChatHistoryScreen({ navigation }: Props) {
  const { sessions, loadSessions, createSession, deleteSession } = useChatStore();
  const { profile } = useProfileStore();
  const { width: screenW, height: screenH } = Dimensions.get('window');

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadSessions);
    return unsub;
  }, [navigation]);

  const GOAL_LABELS: Record<string, string> = {
    muscle_gain: 'Build Muscle', fat_loss: 'Lose Fat',
    endurance: 'Improve Endurance', general_fitness: 'General Fitness',
  };

  const startNewChat = useCallback(() => {
    const goalLabel = profile?.goal ? GOAL_LABELS[profile.goal] : null;
    const levelLabel = profile?.fitness_level
      ? profile.fitness_level.charAt(0).toUpperCase() + profile.fitness_level.slice(1)
      : null;
    const context = goalLabel && levelLabel
      ? ` I have your profile — ${levelLabel} level, goal: ${goalLabel}.`
      : '';
    const welcome = {
      role: 'assistant' as const,
      content: `Hey! I'm ForgeAI, your personal fitness coach powered by AI.${context} Ask me anything about training, nutrition, recovery, or form.`,
      timestamp: new Date().toISOString(),
    };
    const session = createSession(welcome);
    navigation.navigate('ChatSession', { sessionId: session.id, isNew: true });
  }, [profile, createSession, navigation]);

  const confirmDelete = useCallback((session: ChatSession) => {
    Alert.alert(
      'Delete conversation',
      `Delete "${session.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSession(session.id) },
      ]
    );
  }, [deleteSession]);

  return (
    <View style={{ flex: 1 }}>
      <WorkflowGL width={screenW} height={screenH} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.52)' }]} pointerEvents="none" />

      <View style={StyleSheet.absoluteFillObject}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Header */}
          <FadeIn delay={0} fromY={-18}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 20, paddingVertical: 8,
              borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <PulseView minScale={0.94} maxScale={1.06} duration={2000}>
                  <ForgeOrbGL size={52} />
                </PulseView>
                <View>
                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>ForgeAI</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                    {sessions.length} {sessions.length === 1 ? 'conversation' : 'conversations'}
                  </Text>
                </View>
              </View>

              <AnimatedPressable onPress={startNewChat} scaleDown={0.90}>
                <LinearGradient
                  colors={['#FF6B35', '#ff2d55']}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF6B35', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 }}
                >
                  <PenSquare size={15} color="#fff" strokeWidth={2.5} />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>New chat</Text>
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </FadeIn>

          {sessions.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
              <FadeIn delay={100} fromScale={0.6} fromY={0}>
                <PulseView minScale={0.95} maxScale={1.05} duration={2200}>
                  <ForgeOrbGL size={120} />
                </PulseView>
              </FadeIn>
              <FadeIn delay={220}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8, marginTop: 16 }}>
                  No conversations yet
                </Text>
              </FadeIn>
              <FadeIn delay={320}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                  Start a conversation with ForgeAI about training, nutrition, or recovery.
                </Text>
              </FadeIn>
              <FadeIn delay={420} fromScale={0.85} fromY={0}>
                <AnimatedPressable onPress={startNewChat}>
                  <LinearGradient
                    colors={['#FF6B35', '#ff2d55']}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20 }}
                  >
                    <PenSquare size={18} color="#fff" strokeWidth={2.5} />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Start a conversation</Text>
                  </LinearGradient>
                </AnimatedPressable>
              </FadeIn>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(s) => s.id}
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <SessionCard
                  session={item}
                  index={index}
                  onPress={() => navigation.navigate('ChatSession', { sessionId: item.id, isNew: false })}
                  onDelete={() => confirmDelete(item)}
                />
              )}
            />
          )}
        </SafeAreaView>
      </View>
    </View>
  );
}
