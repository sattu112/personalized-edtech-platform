import type { Difficulty } from '../types';
import { DIFFICULTY_META } from '../data/domains';

const COLOR_MAP: Record<string, string> = {
  success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  accent: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
  error: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400',
};

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  showLevel?: boolean;
}

export function DifficultyBadge({ difficulty, showLevel = true }: DifficultyBadgeProps) {
  const safeDifficulty: Difficulty =
    DIFFICULTY_META[difficulty] ? difficulty : 'Beginner';
  const meta = DIFFICULTY_META[safeDifficulty];
  const colorClass = COLOR_MAP[meta.color] ?? COLOR_MAP.primary;

  return (
    <span className={`badge ${colorClass}`}>
      <span className="flex h-1.5 w-1.5 rounded-full bg-current" />
      {safeDifficulty}
      {showLevel && <span className="opacity-60">· Lv{meta.level}</span>}
    </span>
  );
}
