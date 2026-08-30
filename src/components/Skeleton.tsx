interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  lines?: number;
  circle?: boolean;
}

export function Skeleton({ className = '', width, height, lines = 1, circle = false }: SkeletonProps) {
  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`skeleton ${circle ? 'rounded-full' : ''}`}
            style={{
              width: width ?? (i === lines - 1 ? '60%' : '100%'),
              height: height ?? '14px',
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={`skeleton ${circle ? 'rounded-full' : ''} ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? '14px',
      }}
    />
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="flex gap-2.5 max-w-[85%]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex-shrink-0 opacity-70" />
        <div className="space-y-2 min-w-[180px]">
          <Skeleton width={220} height={12} />
          <Skeleton width={180} height={12} />
          <Skeleton width={120} height={12} />
        </div>
      </div>
    </div>
  );
}

export function DiagnosticSkeleton() {
  return (
    <div className="card p-6 space-y-4 quiz-result-enter">
      <div className="flex items-center gap-3">
        <div className="skeleton w-5 h-5 rounded-full" />
        <Skeleton width={180} height={16} />
      </div>
      <div className="space-y-2">
        <Skeleton lines={3} height={12} />
      </div>
      <div className="space-y-2 pt-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 p-3 rounded-xl border border-ink-200 dark:border-ink-800">
            <Skeleton width={28} height={28} circle className="flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton width="70%" height={14} />
              <Skeleton width="90%" height={12} />
              <Skeleton width="45%" height={10} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
