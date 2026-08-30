import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DIFFICULTIES, DIFFICULTY_META } from '../data/domains';
import type { Domain, Difficulty } from '../types';

const DOMAIN_COLORS: Record<Domain, string> = {
  mathematics: '#6366f1',
  python: '#06b6d4',
  'data-science': '#22c55e',
};

export function LearningPath({ domain }: { domain: Domain }) {
  const { domainProgress } = useApp();
  const dp = domainProgress[domain];
  const currentLevel = dp.masteryLevel;
  const color = DOMAIN_COLORS[domain];

  const nodes = useMemo(() => DIFFICULTIES.map((d: Difficulty, i: number) => ({
    difficulty: d,
    level: i + 1,
    meta: DIFFICULTY_META[d],
    isCurrent: i + 1 === currentLevel,
    isCompleted: i + 1 < currentLevel,
    isLocked: i + 1 > currentLevel,
  })), [currentLevel]);

  return (
    <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
      {nodes.map((node, idx) => (
        <div key={node.difficulty} className="flex items-center flex-1 min-w-0">
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${
                node.isCompleted
                  ? 'text-white shadow-md'
                  : node.isCurrent
                  ? 'text-white shadow-lg ring-4 ring-offset-2 ring-offset-white dark:ring-offset-ink-900'
                  : 'border-ink-200 dark:border-ink-700 text-ink-300 dark:text-ink-600 bg-transparent'
              }`}
              style={
                node.isCompleted || node.isCurrent
                  ? { backgroundColor: color, borderColor: color, boxShadow: node.isCurrent ? `0 0 0 2px ${color}40` : undefined }
                  : undefined
              }
            >
              {node.isCompleted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="text-sm font-bold">{node.level}</span>
              )}
            </div>
            <span className={`text-[10px] font-medium whitespace-nowrap ${node.isCurrent ? 'text-ink-900 dark:text-ink-100' : 'text-ink-400 dark:text-ink-500'}`}>
              {node.difficulty}
            </span>
          </div>
          {idx < nodes.length - 1 && (
            <div className="flex-1 h-0.5 mx-1 rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-ink-200 dark:bg-ink-700" />
              <div
                className="absolute inset-0 transition-all duration-700"
                style={{ width: node.isCompleted ? '100%' : '0%', backgroundColor: color }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
