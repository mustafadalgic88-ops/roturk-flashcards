
export interface Word {
  id: string;
  romanian: string;
  pronunciation: string; // Phonetic pronunciation
  turkish: string;
  exampleRo: string;
  exampleTr: string;
  emoji: string; // Faster visual representation
  imageUrl?: string; // Kept for backward compatibility or future use
  audioBase64?: string; // Optional/Deprecated
  exampleAudioBase64?: string; // Optional/Deprecated
  isLearned: boolean;
  needsReview: boolean; // Marked for frequent review
  reviewCount: number;
  lastReviewDate?: number;
}

export enum AppView {
  FLASHCARDS = 'FLASHCARDS',
  LEARNED_LIST = 'LEARNED_LIST',
  DIFFICULT_LIST = 'DIFFICULT_LIST',
  QUIZ = 'QUIZ',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  BRAIN_STATS = 'BRAIN_STATS',
  ACTIVITY_LOG = 'ACTIVITY_LOG'
}

export interface QuizQuestion {
  wordId: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export type LoadingState = 'idle' | 'loading' | 'error' | 'success';

export interface UserStats {
  totalLearned: number;
  quizScore: number; // Cumulative correct answers
  currentStreak: number;
  bestStreak: number;
  achievements: string[]; // IDs of unlocked achievements
  targetWordCount: number; // User set goal
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: UserStats) => boolean;
}

export interface BackupData {
  version: number;
  timestamp: number;
  words: Word[];
  userStats: UserStats;
}

export interface SessionLog {
  id: string;
  userName: string;
  deviceModel: string;
  loginTime: number; // Timestamp
  lastActiveTime: number; // To calculate if still active (in a real backend scenario) or session duration
  wordsLearnedInSession: number;
  isActive: boolean; // Current session marker
}
