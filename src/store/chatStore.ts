import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

const SESSIONS_KEY = 'forgeai_sessions';
const msgKey     = (id: string) => `forgeai_msgs_${id}`;
const profileKey = (id: string) => `forgeai_profile_${id}`;

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function sessionTitle(): string {
  const now = new Date();
  const h = now.getHours();
  const timeOfDay = h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 20 ? 'Evening' : 'Night';
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${timeOfDay} · ${date} ${time}`;
}

interface ChatStore {
  sessions: ChatSession[];
  loadSessions: () => Promise<void>;
  createSession: (welcomeMessage: ChatMessage) => ChatSession;
  updateSession: (id: string, patch: Partial<ChatSession>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  saveMessages: (sessionId: string, messages: ChatMessage[]) => Promise<void>;
  loadMessages: (sessionId: string) => Promise<ChatMessage[]>;
  saveSessionProfile: (sessionId: string, profile: Record<string, unknown>) => Promise<void>;
  loadSessionProfile: (sessionId: string) => Promise<Record<string, unknown> | null>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],

  loadSessions: async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSIONS_KEY);
      const sessions: ChatSession[] = raw ? JSON.parse(raw) : [];
      set({ sessions: sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
    } catch {}
  },

  createSession: (welcomeMessage) => {
    const session: ChatSession = {
      id: genId(),
      title: sessionTitle(),
      preview: welcomeMessage.content.slice(0, 80),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 1,
    };
    const updated = [session, ...get().sessions];
    set({ sessions: updated });
    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)).catch(() => {});
    return session;
  },

  updateSession: async (id, patch) => {
    const updated = get().sessions.map((s) =>
      s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s
    ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    set({ sessions: updated });
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  },

  deleteSession: async (id) => {
    const updated = get().sessions.filter((s) => s.id !== id);
    set({ sessions: updated });
    await Promise.all([
      AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)),
      AsyncStorage.removeItem(msgKey(id)),
      AsyncStorage.removeItem(profileKey(id)),
    ]);
  },

  saveMessages: async (sessionId, messages) => {
    await AsyncStorage.setItem(msgKey(sessionId), JSON.stringify(messages));
  },

  loadMessages: async (sessionId) => {
    try {
      const raw = await AsyncStorage.getItem(msgKey(sessionId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveSessionProfile: async (sessionId, profile) => {
    await AsyncStorage.setItem(profileKey(sessionId), JSON.stringify(profile));
  },

  loadSessionProfile: async (sessionId) => {
    try {
      const raw = await AsyncStorage.getItem(profileKey(sessionId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
}));
