import type { Difficulty, Domain } from '../types';

export const DOMAINS: { id: Domain; label: string; icon: string; description: string; color: string }[] = [
  { id: 'mathematics', label: 'Mathematics', icon: 'Calculator', description: 'Algebra, calculus, statistics & more', color: 'primary' },
  { id: 'python', label: 'Python Programming', icon: 'Code2', description: 'Syntax, data structures, OOP', color: 'accent' },
  { id: 'data-science', label: 'Data Science', icon: 'BarChart3', description: 'Pandas, ML, visualization', color: 'success' },
];

export const DIFFICULTIES: Difficulty[] = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Mastery'];

export const DIFFICULTY_META: Record<Difficulty, { color: string; level: number; description: string }> = {
  Beginner: { color: 'success', level: 1, description: 'Foundational concepts' },
  Novice: { color: 'accent', level: 2, description: 'Building blocks' },
  Intermediate: { color: 'primary', level: 3, description: 'Applied understanding' },
  Advanced: { color: 'warning', level: 4, description: 'Complex problem-solving' },
  Mastery: { color: 'error', level: 5, description: 'Expert-level synthesis' },
};

export function difficultyFromLevel(level: number): Difficulty {
  const clamped = Math.max(0, Math.min(4, level - 1));
  return DIFFICULTIES[clamped];
}

export function levelFromDifficulty(d: Difficulty): number {
  return DIFFICULTIES.indexOf(d) + 1;
}
