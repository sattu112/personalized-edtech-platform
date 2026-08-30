import { Flame } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function StreakCounter() {
  const { streak } = useApp();

  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-warning-500 to-error-500 px-3.5 py-2.5 text-white shadow-sm">
      <Flame size={20} className={streak.currentStreak > 0 ? 'fill-white/20' : 'opacity-50'} />
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-bold">{streak.currentStreak}</span>
        <span className="text-[10px] font-medium text-white/80 uppercase tracking-wide">
          {streak.currentStreak === 1 ? 'Day Streak' : 'Day Streak'}
        </span>
      </div>
      {streak.longestStreak > streak.currentStreak && (
        <div className="ml-auto text-right leading-tight">
          <span className="text-xs font-semibold text-white/90">Best: {streak.longestStreak}</span>
        </div>
      )}
    </div>
  );
}
