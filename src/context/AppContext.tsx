import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type {
  View, Theme, Domain, Difficulty, QuizResult, ReviewItem,
  DomainProgress, StreakData, GapAnalysis, ChatMessage, StudentTrendPoint,
} from '../types';
import { loadState, saveState } from '../utils/storage';
import { DIFFICULTIES, difficultyFromLevel, levelFromDifficulty } from '../data/domains';
import { QUESTION_BANK } from '../data/questionBank';

interface AppContextValue {
  // Navigation
  view: View;
  setView: (v: View) => void;
  activeDomain: Domain;
  setActiveDomain: (d: Domain) => void;

  // Theme
  theme: Theme;
  toggleTheme: () => void;

  // Progress
  domainProgress: Record<Domain, DomainProgress>;
  streak: StreakData;
  quizHistory: QuizResult[];
  reviewQueue: ReviewItem[];
  trends: StudentTrendPoint[];
  lastGapAnalysis: GapAnalysis | null;

  // Quiz actions
  recordQuizResult: (result: QuizResult) => void;
  adjustDifficulty: (domain: Domain, accuracy: number) => void;
  setGapAnalysis: (g: GapAnalysis | null) => void;
  completeReviewItem: (questionId: string) => void;

  // Chat
  chatHistory: ChatMessage[];
  addChatMessage: (m: ChatMessage) => void;
  clearChat: () => void;

  // Stats
  totalAnswered: number;
  totalCorrect: number;
  overallAccuracy: number;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_DOMAIN_PROGRESS: Record<Domain, DomainProgress> = {
  mathematics: { domain: 'mathematics', completionPct: 0, questionsAnswered: 0, questionsCorrect: 0, currentDifficulty: 'Beginner', masteryLevel: 1 },
  python: { domain: 'python', completionPct: 0, questionsAnswered: 0, questionsCorrect: 0, currentDifficulty: 'Beginner', masteryLevel: 1 },
  'data-science': { domain: 'data-science', completionPct: 0, questionsAnswered: 0, questionsCorrect: 0, currentDifficulty: 'Beginner', masteryLevel: 1 },
};

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  activeDates: [],
};

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>(() => loadState('view', 'dashboard' as View));
  const [activeDomain, setActiveDomain] = useState<Domain>(() => loadState('activeDomain', 'mathematics' as Domain));
  const [theme, setTheme] = useState<Theme>(() => loadState('theme', 'dark' as Theme));

  const [domainProgress, setDomainProgress] = useState<Record<Domain, DomainProgress>>(() =>
    loadState('domainProgress', DEFAULT_DOMAIN_PROGRESS));
  const [streak, setStreak] = useState<StreakData>(() => loadState('streak', DEFAULT_STREAK));
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>(() => loadState('quizHistory', []));
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>(() => loadState('reviewQueue', []));
  const [trends, setTrends] = useState<StudentTrendPoint[]>(() => loadState('trends', []));
  const [lastGapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(() => loadState('lastGapAnalysis', null));
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => loadState('chatHistory', []));

  // Persist state
  useEffect(() => { saveState('view', view); }, [view]);
  useEffect(() => { saveState('activeDomain', activeDomain); }, [activeDomain]);
  useEffect(() => { saveState('domainProgress', domainProgress); }, [domainProgress]);
  useEffect(() => { saveState('streak', streak); }, [streak]);
  useEffect(() => { saveState('quizHistory', quizHistory); }, [quizHistory]);
  useEffect(() => { saveState('reviewQueue', reviewQueue); }, [reviewQueue]);
  useEffect(() => { saveState('trends', trends); }, [trends]);
  useEffect(() => { saveState('lastGapAnalysis', lastGapAnalysis); }, [lastGapAnalysis]);
  useEffect(() => { saveState('chatHistory', chatHistory); }, [chatHistory]);

  // Theme: apply class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      saveState('theme', next);
      return next;
    });
  }, []);

  const updateStreak = useCallback(() => {
    const today = todayStr();
    setStreak(prev => {
      if (prev.lastActiveDate === today) return prev;

      const newDates = [...prev.activeDates];
      if (!newDates.includes(today)) newDates.push(today);

      let newCurrent = 1;
      if (prev.lastActiveDate) {
        const gap = daysBetween(prev.lastActiveDate, today);
        if (gap === 1) newCurrent = prev.currentStreak + 1;
        else if (gap === 0) newCurrent = prev.currentStreak;
      }

      return {
        currentStreak: newCurrent,
        longestStreak: Math.max(prev.longestStreak, newCurrent),
        lastActiveDate: today,
        activeDates: newDates,
      };
    });
  }, []);

  const recordQuizResult = useCallback((result: QuizResult) => {
    setQuizHistory(prev => [...prev, result]);

    setDomainProgress(prev => {
      const dp = { ...prev[result.domain] };
      dp.questionsAnswered += 1;
      if (result.correct) dp.questionsCorrect += 1;

      const domainQuestions = QUESTION_BANK.filter(q => q.domain === result.domain);
      const totalQuestions = domainQuestions.length;
      const answeredConcepts = new Set(
        [...quizHistory.filter(r => r.domain === result.domain), result].map(r => r.concept)
      );
      const totalConcepts = new Set(domainQuestions.map(q => q.concept)).size;
      dp.completionPct = Math.min(100, Math.round((answeredConcepts.size / totalConcepts) * 100));

      if (result.correct) {
        const recentDomainResults = [...quizHistory.filter(r => r.domain === result.domain), result].slice(-5);
        const recentAcc = recentDomainResults.filter(r => r.correct).length / recentDomainResults.length;
        if (recentAcc > 0.8 && dp.masteryLevel < 5) {
          dp.masteryLevel = Math.min(5, dp.masteryLevel + 1);
          dp.currentDifficulty = difficultyFromLevel(dp.masteryLevel);
        }
      }

      return { ...prev, [result.domain]: dp };
    });

    // Add to spaced repetition review queue if wrong
    if (!result.correct) {
      setReviewQueue(prev => {
        const existing = prev.find(r => r.questionId === result.questionId);
        if (existing) {
          return prev.map(r =>
            r.questionId === result.questionId
              ? { ...r, nextReviewAt: Date.now() + 3600000, interval: 1, easeFactor: Math.max(1.3, r.easeFactor - 0.2) }
              : r
          );
        }
        return [...prev, {
          questionId: result.questionId,
          domain: result.domain,
          concept: result.concept,
          difficulty: result.difficulty,
          nextReviewAt: Date.now() + 3600000,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
        }];
      });
    }

    // Update streak
    updateStreak();

    // Update trends
    setTrends(prev => {
      const today = todayStr();
      const existing = prev.find(t => t.date === today);
      const allResults = [...quizHistory, result];
      const todayResults = allResults.filter(r => new Date(r.timestamp).toISOString().split('T')[0] === today);
      const accuracy = todayResults.length > 0
        ? Math.round((todayResults.filter(r => r.correct).length / todayResults.length) * 100)
        : 0;

      if (existing) {
        return prev.map(t => t.date === today
          ? { ...t, accuracy, questionsAnswered: todayResults.length }
          : t
        );
      }
      return [...prev, { date: today, accuracy, questionsAnswered: todayResults.length, mastery: 0 }];
    });
  }, [quizHistory, updateStreak]);

  const adjustDifficulty = useCallback((domain: Domain, accuracy: number) => {
    setDomainProgress(prev => {
      const dp = { ...prev[domain] };
      const currentLevel = levelFromDifficulty(dp.currentDifficulty);

      if (accuracy > 80 && currentLevel < 5) {
        dp.masteryLevel = currentLevel + 1;
        dp.currentDifficulty = difficultyFromLevel(dp.masteryLevel);
      } else if (accuracy < 50 && currentLevel > 1) {
        dp.masteryLevel = currentLevel - 1;
        dp.currentDifficulty = difficultyFromLevel(dp.masteryLevel);
      }

      return { ...prev, [domain]: dp };
    });
  }, []);

  const completeReviewItem = useCallback((questionId: string) => {
    setReviewQueue(prev => {
      const item = prev.find(r => r.questionId === questionId);
      if (!item) return prev;
      const newInterval = item.interval * 2;
      return prev.map(r =>
        r.questionId === questionId
          ? {
            ...r,
            nextReviewAt: Date.now() + newInterval * 3600000,
            interval: newInterval,
            easeFactor: Math.min(2.8, r.easeFactor + 0.1),
            repetitions: r.repetitions + 1,
          }
          : r
      ).filter(r => r.repetitions < 3 || Date.now() < r.nextReviewAt);
    });
  }, []);

  const addChatMessage = useCallback((m: ChatMessage) => {
    setChatHistory(prev => [...prev, m]);
  }, []);

  const clearChat = useCallback(() => setChatHistory([]), []);

  const totalAnswered = quizHistory.length;
  const totalCorrect = quizHistory.filter(r => r.correct).length;
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const value: AppContextValue = {
    view, setView, activeDomain, setActiveDomain,
    theme, toggleTheme,
    domainProgress, streak, quizHistory, reviewQueue, trends, lastGapAnalysis,
    recordQuizResult, adjustDifficulty, setGapAnalysis, completeReviewItem,
    chatHistory, addChatMessage, clearChat,
    totalAnswered, totalCorrect, overallAccuracy,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { DIFFICULTIES };
