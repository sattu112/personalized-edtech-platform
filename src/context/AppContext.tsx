import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import type {
  View, Theme, Domain, Difficulty, QuizResult, ReviewItem,
  DomainProgress, StreakData, GapAnalysis, ChatMessage, StudentTrendPoint, Student, DailyActivity,
} from '../types';
import { loadState, saveState } from '../utils/storage';
import { DIFFICULTIES, difficultyFromLevel, levelFromDifficulty, DOMAINS } from '../data/domains';
import { QUESTION_BANK } from '../data/questionBank';

interface AuthState {
  currentStudent: Student | null;
  signup: (params: { name: string; email: string; grade?: string }) => { ok: true; student: Student } | { ok: false; error: string };
  login: (email: string) => { ok: true; student: Student } | { ok: false; error: string };
  logout: () => void;
  listStudents: () => Student[];
}

interface AppContextValue extends AuthState {
  view: View;
  setView: (v: View) => void;
  activeDomain: Domain;
  setActiveDomain: (d: Domain) => void;
  theme: Theme;
  toggleTheme: () => void;
  domainProgress: Record<Domain, DomainProgress>;
  streak: StreakData;
  quizHistory: QuizResult[];
  reviewQueue: ReviewItem[];
  trends: StudentTrendPoint[];
  lastGapAnalysis: GapAnalysis | null;
  dailyActivity: Record<string, DailyActivity>;
  recordQuizResult: (result: QuizResult) => void;
  adjustDifficulty: (domain: Domain, accuracy: number) => void;
  setGapAnalysis: (g: GapAnalysis | null) => void;
  completeReviewItem: (questionId: string) => void;
  chatHistory: ChatMessage[];
  addChatMessage: (m: ChatMessage) => void;
  clearChat: () => void;
  totalAnswered: number;
  totalCorrect: number;
  overallAccuracy: number;
}

const AppContext = createContext<AppContextValue | null>(null);

const STUDENTS_KEY = 'students';
const SESSION_KEY = 'currentStudentId';

const ALL_DOMAIN_IDS: Domain[] = DOMAINS.map(d => d.id) as Domain[];

function makeDefaultDomainProgress(): Record<Domain, DomainProgress> {
  const obj = {} as Record<Domain, DomainProgress>;
  for (const id of ALL_DOMAIN_IDS) {
    obj[id] = {
      domain: id,
      completionPct: 0,
      questionsAnswered: 0,
      questionsCorrect: 0,
      currentDifficulty: 'Beginner',
      masteryLevel: 1,
    };
  }
  return obj;
}

const DEFAULT_DOMAIN_PROGRESS: Record<Domain, DomainProgress> = makeDefaultDomainProgress();

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  activeDates: [],
};

function todayStr(d: number = Date.now()): string {
  return new Date(d).toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function studentScopedKey(studentId: string | null, key: string): string {
  return studentId ? `u_${studentId}__${key}` : key;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function studentIdFromEmail(email: string): string {
  const norm = normalizeEmail(email);
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  return 's_' + Math.abs(hash).toString(36) + '_' + norm.slice(0, 6).replace(/[^a-z0-9]/g, 'x');
}

function makeInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

function loadScoped<T>(studentId: string | null, key: string, fallback: T): T {
  return loadState<T>(studentScopedKey(studentId, key), fallback);
}

function saveScoped<T>(studentId: string | null, key: string, value: T): void {
  saveState<T>(studentScopedKey(studentId, key), value);
}

function mergeDomainProgress(existing: Partial<Record<Domain, DomainProgress>> | null | undefined): Record<Domain, DomainProgress> {
  const merged = makeDefaultDomainProgress();
  if (!existing) return merged;
  for (const id of ALL_DOMAIN_IDS) {
    const e = existing[id];
    if (e) merged[id] = { ...merged[id], ...e };
  }
  return merged;
}

function emptyDailyActivity(date: string): DailyActivity {
  return { date, answered: 0, correct: 0, wrong: 0, timeSpentMs: 0, domainsPartial: {} };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>(() => loadState<Student[]>(STUDENTS_KEY, []));
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(() => loadState<string | null>(SESSION_KEY, null));

  const currentStudent = useMemo<Student | null>(() => {
    if (!currentStudentId) return null;
    return students.find(s => s.id === currentStudentId) ?? null;
  }, [students, currentStudentId]);

  const sid = currentStudent?.id ?? null;

  const [view, setViewRaw] = useState<View>(() => loadScoped<View>(sid, 'view', 'dashboard'));
  const [activeDomain, setActiveDomainRaw] = useState<Domain>(() => loadScoped<Domain>(sid, 'activeDomain', 'mathematics'));
  const [theme, setTheme] = useState<Theme>(() => loadState<Theme>('theme', 'dark'));

  const [domainProgress, setDomainProgress] = useState<Record<Domain, DomainProgress>>(() =>
    mergeDomainProgress(loadScoped<Partial<Record<Domain, DomainProgress>> | null>(sid, 'domainProgress', null)));
  const [streak, setStreak] = useState<StreakData>(() => loadScoped(sid, 'streak', DEFAULT_STREAK));
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>(() => loadScoped(sid, 'quizHistory', []));
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>(() => loadScoped(sid, 'reviewQueue', []));
  const [trends, setTrends] = useState<StudentTrendPoint[]>(() => loadScoped(sid, 'trends', []));
  const [lastGapAnalysis, setGapAnalysisRaw] = useState<GapAnalysis | null>(() => loadScoped(sid, 'lastGapAnalysis', null));
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => loadScoped(sid, 'chatHistory', []));
  const [dailyActivity, setDailyActivity] = useState<Record<string, DailyActivity>>(() =>
    loadScoped<Record<string, DailyActivity>>(sid, 'dailyActivity', {}));

  const setView = useCallback((v: View) => { setViewRaw(v); saveScoped(sid, 'view', v); }, [sid]);
  const setActiveDomain = useCallback((d: Domain) => { setActiveDomainRaw(d); saveScoped(sid, 'activeDomain', d); }, [sid]);
  const setGapAnalysis = useCallback((g: GapAnalysis | null) => { setGapAnalysisRaw(g); saveScoped(sid, 'lastGapAnalysis', g); }, [sid]);

  useEffect(() => { saveState(STUDENTS_KEY, students); }, [students]);
  useEffect(() => { saveState(SESSION_KEY, currentStudentId); }, [currentStudentId]);

  useEffect(() => { saveScoped(sid, 'view', view); }, [sid, view]);
  useEffect(() => { saveScoped(sid, 'activeDomain', activeDomain); }, [sid, activeDomain]);
  useEffect(() => { saveScoped(sid, 'domainProgress', domainProgress); }, [sid, domainProgress]);
  useEffect(() => { saveScoped(sid, 'streak', streak); }, [sid, streak]);
  useEffect(() => { saveScoped(sid, 'quizHistory', quizHistory); }, [sid, quizHistory]);
  useEffect(() => { saveScoped(sid, 'reviewQueue', reviewQueue); }, [sid, reviewQueue]);
  useEffect(() => { saveScoped(sid, 'trends', trends); }, [sid, trends]);
  useEffect(() => { saveScoped(sid, 'lastGapAnalysis', lastGapAnalysis); }, [sid, lastGapAnalysis]);
  useEffect(() => { saveScoped(sid, 'chatHistory', chatHistory); }, [sid, chatHistory]);
  useEffect(() => { saveScoped(sid, 'dailyActivity', dailyActivity); }, [sid, dailyActivity]);

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

  const signup = useCallback((params: { name: string; email: string; grade?: string }): { ok: true; student: Student } | { ok: false; error: string } => {
    const name = params.name.trim();
    const email = normalizeEmail(params.email);
    if (name.length < 2) return { ok: false, error: 'Please enter your full name (2+ characters).' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };

    let updated = [...students];
    const existingIdx = updated.findIndex(s => s.email === email);
    if (existingIdx >= 0) return { ok: false, error: 'An account with this email already exists. Click Sign In instead.' };

    const id = studentIdFromEmail(email);
    const now = Date.now();
    const student: Student = {
      id,
      name,
      email,
      grade: params.grade,
      createdAt: now,
      lastLoginAt: now,
      avatarInitial: makeInitial(name),
    };
    updated = [...updated, student];
    setStudents(updated);
    setCurrentStudentId(id);
    setViewRaw('dashboard');
    setActiveDomainRaw('mathematics');
    setDomainProgress(DEFAULT_DOMAIN_PROGRESS);
    setStreak(DEFAULT_STREAK);
    setQuizHistory([]);
    setReviewQueue([]);
    setTrends([]);
    setGapAnalysisRaw(null);
    setChatHistory([]);
    setDailyActivity({});
    return { ok: true, student };
  }, [students]);

  const login = useCallback((email: string): { ok: true; student: Student } | { ok: false; error: string } => {
    const normalized = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return { ok: false, error: 'Please enter a valid email address.' };
    const found = students.find(s => s.email === normalized);
    if (!found) {
      return { ok: false, error: 'No student found with this email. Create an account on the Sign Up tab.' };
    }
    const updated = students.map(s => s.id === found.id ? { ...s, lastLoginAt: Date.now() } : s);
    setStudents(updated);
    setCurrentStudentId(found.id);
    const sid = found.id;
    setViewRaw(loadScoped<View>(sid, 'view', 'dashboard'));
    setActiveDomainRaw(loadScoped<Domain>(sid, 'activeDomain', 'mathematics'));
    setDomainProgress(mergeDomainProgress(loadScoped<Partial<Record<Domain, DomainProgress>> | null>(sid, 'domainProgress', null)));
    setStreak(loadScoped(sid, 'streak', DEFAULT_STREAK));
    setQuizHistory(loadScoped(sid, 'quizHistory', []));
    setReviewQueue(loadScoped(sid, 'reviewQueue', []));
    setTrends(loadScoped(sid, 'trends', []));
    setGapAnalysisRaw(loadScoped(sid, 'lastGapAnalysis', null));
    setChatHistory(loadScoped(sid, 'chatHistory', []));
    setDailyActivity(loadScoped<Record<string, DailyActivity>>(sid, 'dailyActivity', {}));
    return { ok: true, student: { ...found, lastLoginAt: Date.now() } };
  }, [students]);

  const logout = useCallback(() => {
    setCurrentStudentId(null);
  }, []);

  const listStudents = useCallback(() => students, [students]);

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
      const answeredConcepts = new Set(
        [...quizHistory.filter(r => r.domain === result.domain), result].map(r => r.concept)
      );
      const totalConcepts = Math.max(1, new Set(domainQuestions.map(q => q.concept)).size);
      const newConcepts = answeredConcepts.size > 0 ? answeredConcepts.size : dp.questionsAnswered;
      dp.completionPct = Math.min(100, Math.max(dp.completionPct, Math.round((newConcepts / totalConcepts) * 100)));

      if (result.correct) {
        const recentDomainResults = [...quizHistory.filter(r => r.domain === result.domain), result].slice(-5);
        const recentAcc = recentDomainResults.filter(r => r.correct).length / Math.max(1, recentDomainResults.length);
        const currentLevel = levelFromDifficulty(dp.currentDifficulty);
        if (recentAcc > 0.8 && currentLevel < 3) {
          dp.masteryLevel = Math.min(3, currentLevel + 1);
          dp.currentDifficulty = difficultyFromLevel(dp.masteryLevel);
        }
      }

      return { ...prev, [result.domain]: dp };
    });

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

    updateStreak();

    const today = todayStr(result.timestamp);
    setDailyActivity(prev => {
      const cur = prev[today] ?? emptyDailyActivity(today);
      const next: DailyActivity = {
        ...cur,
        answered: cur.answered + 1,
        correct: cur.correct + (result.correct ? 1 : 0),
        wrong: cur.wrong + (result.correct ? 0 : 1),
        timeSpentMs: cur.timeSpentMs + Math.max(0, result.responseTimeMs),
        domainsPartial: {
          ...cur.domainsPartial,
          [result.domain]: (cur.domainsPartial[result.domain] ?? 0) + 1,
        },
      };
      return { ...prev, [today]: next };
    });

    setTrends(prev => {
      const existing = prev.find(t => t.date === today);
      const allResults = [...quizHistory, result];
      const todayResults = allResults.filter(r => todayStr(r.timestamp) === today);
      const accuracy = todayResults.length > 0
        ? Math.round((todayResults.filter(r => r.correct).length / todayResults.length) * 100)
        : 0;

      if (existing) {
        return prev.map(t => t.date === today
          ? { ...t, accuracy, questionsAnswered: todayResults.length, mastery: Math.round(todayResults.filter(r => r.correct).length / Math.max(1, todayResults.length) * 100) }
          : t
        );
      }
      return [...prev, { date: today, accuracy, questionsAnswered: todayResults.length, mastery: accuracy }];
    });
  }, [quizHistory, updateStreak]);

  const adjustDifficulty = useCallback((domain: Domain, accuracy: number) => {
    setDomainProgress(prev => {
      const dp = { ...prev[domain] };
      const currentLevel = levelFromDifficulty(dp.currentDifficulty);
      if (accuracy > 80 && currentLevel < 3) {
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
    domainProgress, streak, quizHistory, reviewQueue, trends, lastGapAnalysis, dailyActivity,
    recordQuizResult, adjustDifficulty, setGapAnalysis, completeReviewItem,
    chatHistory, addChatMessage, clearChat,
    totalAnswered, totalCorrect, overallAccuracy,
    currentStudent, signup, login, logout, listStudents,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { DIFFICULTIES };
