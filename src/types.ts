export type Domain = 'mathematics' | 'python' | 'data-science';

export type Difficulty = 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced' | 'Mastery';

export interface Question {
  id: string;
  domain: Domain;
  difficulty: Difficulty;
  concept: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizResult {
  questionId: string;
  domain: Domain;
  difficulty: Difficulty;
  concept: string;
  correct: boolean;
  responseTimeMs: number;
  selectedIndex: number;
  timestamp: number;
}

export interface MicroLearningStep {
  title: string;
  description: string;
  resource: string;
}

export interface GapAnalysis {
  rootGap: string;
  weakConcept: string;
  microPlan: MicroLearningStep[];
  confidence: number;
}

export interface ReviewItem {
  questionId: string;
  domain: Domain;
  concept: string;
  difficulty: Difficulty;
  nextReviewAt: number;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface GeneratedQA {
  question: string;
  answer: string;
}

export interface DomainProgress {
  domain: Domain;
  completionPct: number;
  questionsAnswered: number;
  questionsCorrect: number;
  currentDifficulty: Difficulty;
  masteryLevel: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  activeDates: string[];
}

export interface CohortMetricPoint {
  week: string;
  adaptive: number;
  linear: number;
}

export interface CohortComparison {
  knowledgeRetention: CohortMetricPoint[];
  completionRate: CohortMetricPoint[];
  timeToMastery: CohortMetricPoint[];
}

export interface StudentTrendPoint {
  date: string;
  accuracy: number;
  questionsAnswered: number;
  mastery: number;
}

export type View = 'dashboard' | 'quiz' | 'tutor' | 'analytics';
export type Theme = 'light' | 'dark';
