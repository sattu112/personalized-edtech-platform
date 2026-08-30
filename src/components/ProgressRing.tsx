import { useEffect, useState } from 'react';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = '#6366f1',
  label,
  sublabel,
}: ProgressRingProps) {
  const [animatedPct, setAnimatedPct] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPct / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPct(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-ink-200 dark:stroke-ink-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-ink-900 dark:text-ink-100">
          {Math.round(animatedPct)}%
        </span>
        {label && <span className="text-xs font-medium text-ink-500 dark:text-ink-400 mt-0.5">{label}</span>}
        {sublabel && <span className="text-[10px] text-ink-400 dark:text-ink-500">{sublabel}</span>}
      </div>
    </div>
  );
}
