import { create } from 'zustand'

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface FileStat {
  name: string;
  rows: number;
  cols: number;
}

interface StatsData {
  files_processed: number;
  total_rows: number;
  file_stats: FileStat[];
  top_districts?: any[];
}

interface AppState {
  messages: ChatMessage[];
  stats: StatsData | null;
  addMessage: (msg: ChatMessage) => void;
  setStats: (stats: StatsData) => void;
}

export const useStore = create<AppState>((set) => ({
  messages: [],
  stats: null,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setStats: (stats) => set({ stats }),
}))
