import { memo, useMemo } from 'react';
import { Calculator, Code2, BarChart3, ArrowRight, Brain, RotateCcw, Clock, Target, Zap, TrendingUp, BookOpen, Flame } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProgressRing } from '../components/ProgressRing';
import { StreakCounter } from '../components/StreakCounter';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { LearningPath } from '../components/LearningPath';
import { DOMAINS } from '../data/domains';
import type { Domain } from '../types';
import { QUESTION_BANK } from '../data/questionBank';

const DOMAIN_ICONS: Record<string, typeof Calculator> = {
  Calculator, Code2, BarChart3,
};

const DOMAIN_COLORS: Record<Domain, string> = {
  mathematics: '#6366f1',
  python: '#06b6d4',
  'data-science': '#22c55e',
};

export const Dashboard = memo(function Dashboard() {
  const { domainProgress, streak, reviewQueue, setView, setActiveDomain, activeDomain, totalAnswered, overallAccuracy, lastGapAnalysis } = useApp();

  const activeDp = domainProgress[activeDomain];
  const activeColor = DOMAIN_COLORS[activeDomain];

  const reviewDue = useMemo(() => reviewQueue.filter(r => Date.now() >= r.nextReviewAt), [reviewQueue]);
  const reviewUpcoming = useMemo(() => reviewQueue.filter(r => Date.now() < r.nextReviewAt), [reviewQueue]);

  const activeDomainQuestions = useMemo(() => QUESTION_BANK.filter(q => q.domain === activeDomain), [activeDomain]);
  const conceptsCovered = useMemo(() => new Set(
    Array.from(new Set(activeDomainQuestions.map(q => q.concept)))
  ), [activeDomainQuestions]);
  const answeredConcepts = useMemo(() => new Set(
    Array.from(new Set(activeDomainQuestions.map(q => q.concept))).values()
  ), [activeDomainQuestions]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 p-6 sm:p-8 text-white">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back, Learner</h1>
            <p className="text-white/80 mt-1.5 text-sm sm:text-base max-w-lg">
              Your adaptive curriculum is ready. Continue where you left off and let AI guide your next steps.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setView('quiz')}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-primary-700 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:bg-white/90 active:scale-[0.98]"
              >
                <Zap size={16} /> Continue Learning
              </button>
              <button
                onClick={() => setView('tutor')}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-sm text-white px-4 py-2.5 text-sm font-semibold transition-all hover:bg-white/25 active:scale-[0.98]"
              >
                <Brain size={16} /> Ask Tutor
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <StreakCounter />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Target size={18} />} label="Questions Answered" value={totalAnswered.toString()} color="primary" />
        <StatCard icon={<TrendingUp size={18} />} label="Overall Accuracy" value={`${overallAccuracy}%`} color="success" />
        <StatCard icon={<Flame size={18} />} label="Current Streak" value={`${streak.currentStreak}d`} color="warning" />
        <StatCard icon={<RotateCcw size={18} />} label="Due for Review" value={reviewDue.length.toString()} color="error" />
      </div>

      {/* Domain selector + active domain detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Domain cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide">Subjects</h2>
          {DOMAINS.map(d => {
            const Icon = DOMAIN_ICONS[d.icon] ?? Calculator;
            const dp = domainProgress[d.id as Domain];
            const isActive = activeDomain === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setActiveDomain(d.id as Domain)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm ring-1 ring-primary-500/30'
                    : 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 hover:border-ink-300 dark:hover:border-ink-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-white flex-shrink-0"
                    style={{ backgroundColor: DOMAIN_COLORS[d.id as Domain] }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-ink-900 dark:text-ink-100">{d.label}</span>
                    </div>
                    <p className="text-xs text-ink-500 dark:text-ink-400 truncate">{d.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-ink-900 dark:text-ink-100">{dp.completionPct}%</div>
                    <DifficultyBadge difficulty={dp.currentDifficulty} showLevel={false} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active domain progress detail */}
        <div className="lg:col-span-2 card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink-900 dark:text-ink-100">{DOMAINS.find(d => d.id === activeDomain)?.label}</h2>
              <p className="text-sm text-ink-500 dark:text-ink-400">Your learning progress</p>
            </div>
            <button
              onClick={() => setView('quiz')}
              className="btn-primary text-xs px-3 py-2"
            >
              Start Quiz <ArrowRight size={14} />
            </button>
          </div>

          {/* Progress rings row */}
          <div className="flex flex-wrap items-center justify-around gap-4 py-2">
            <div className="flex flex-col items-center gap-2">
              <ProgressRing percentage={activeDp.completionPct} color={activeColor} label="Completion" size={110} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <ProgressRing
                percentage={activeDp.questionsAnswered > 0 ? Math.round((activeDp.questionsCorrect / activeDp.questionsAnswered) * 100) : 0}
                color="#22c55e"
                label="Accuracy"
                size={110}
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <ProgressRing percentage={(activeDp.masteryLevel / 5) * 100} color="#f59e0b" label="Mastery" size={110} />
            </div>
          </div>

          {/* Learning path */}
          <div>
            <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3">Learning Path</h3>
            <LearningPath domain={activeDomain} />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Answered" value={activeDp.questionsAnswered} />
            <MiniStat label="Correct" value={activeDp.questionsCorrect} />
            <MiniStat label="Mastery Lv" value={activeDp.masteryLevel} />
          </div>
        </div>
      </div>

      {/* Spaced repetition review queue */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RotateCcw size={18} className="text-primary-500" />
            <h2 className="text-lg font-bold text-ink-900 dark:text-ink-100">Spaced Repetition Review Queue</h2>
          </div>
          {reviewDue.length > 0 && (
            <button onClick={() => setView('quiz')} className="btn-outline text-xs px-3 py-2">
              Review Now <ArrowRight size={14} />
            </button>
          )}
        </div>

        {reviewQueue.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen size={32} className="mx-auto text-ink-300 dark:text-ink-600 mb-2" />
            <p className="text-sm text-ink-500 dark:text-ink-400">No items to review yet. Complete a quiz to build your review queue.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reviewDue.length > 0 && (
              <>
                <p className="text-xs font-semibold text-error-600 dark:text-error-400 uppercase tracking-wide mb-2">Due Now ({reviewDue.length})</p>
                {reviewDue.map(item => (
                  <ReviewRow key={item.questionId} item={item} due />
                ))}
              </>
            )}
            {reviewUpcoming.length > 0 && (
              <>
                <p className="text-xs font-semibold text-ink-400 dark:text-ink-500 uppercase tracking-wide mb-2 mt-4">Upcoming ({reviewUpcoming.length})</p>
                {reviewUpcoming.map(item => (
                  <ReviewRow key={item.questionId} item={item} due={false} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Last AI Gap Analysis */}
      {lastGapAnalysis && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={18} className="text-primary-500" />
            <h2 className="text-lg font-bold text-ink-900 dark:text-ink-100">Last AI Gap Analysis</h2>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-4 border border-primary-200 dark:border-primary-800">
              <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-1">Root Knowledge Gap</p>
              <p className="text-sm text-ink-700 dark:text-ink-300">{lastGapAnalysis.rootGap}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-2">Personalized Micro-Learning Plan</p>
              <div className="space-y-2">
                {lastGapAnalysis.microPlan.map((step, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl border border-ink-200 dark:border-ink-800">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-600 text-white text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{step.title}</p>
                      <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{step.description}</p>
                      <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 flex items-center gap-1">
                        <BookOpen size={12} /> {step.resource}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    success: 'bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400',
    error: 'bg-error-50 text-error-600 dark:bg-error-900/30 dark:text-error-400',
  };
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-ink-900 dark:text-ink-100 leading-tight">{value}</p>
        <p className="text-xs text-ink-500 dark:text-ink-400 truncate">{label}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-ink-50 dark:bg-ink-800/50 p-3 text-center">
      <p className="text-xl font-bold text-ink-900 dark:text-ink-100">{value}</p>
      <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
    </div>
  );
}

function ReviewRow({ item, due }: { item: { questionId: string; concept: string; difficulty: import('../types').Difficulty; domain: Domain; nextReviewAt: number; repetitions: number }; due: boolean }) {
  const timeUntil = item.nextReviewAt - Date.now();
  const timeLabel = due ? 'Due now' : timeUntil > 86400000 ? `${Math.ceil(timeUntil / 86400000)}d` : `${Math.ceil(timeUntil / 3600000)}h`;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      due
        ? 'border-error-200 dark:border-error-800/50 bg-error-50/50 dark:bg-error-900/10'
        : 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900'
    }`}>
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
        due ? 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400' : 'bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500'
      }`}>
        <Clock size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-900 dark:text-ink-100 truncate">{item.concept}</p>
        <p className="text-xs text-ink-500 dark:text-ink-400 capitalize">{item.domain.replace('-', ' ')}</p>
      </div>
      <DifficultyBadge difficulty={item.difficulty} showLevel={false} />
      <span className={`text-xs font-medium flex-shrink-0 ${due ? 'text-error-600 dark:text-error-400' : 'text-ink-400'}`}>{timeLabel}</span>
    </div>
  );
}
