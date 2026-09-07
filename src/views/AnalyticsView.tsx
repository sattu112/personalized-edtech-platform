import { useState, useMemo, memo } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, RadarChart, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { TrendingUp, Users, FlaskConical, GraduationCap, BarChart3, Clock, Target, Zap, Award, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DOMAINS } from '../data/domains';
import type { CohortMetricPoint, CohortComparison, StudentTrendPoint } from '../types';

// Mock cohort comparison data
const COHORT_DATA: CohortComparison = {
  knowledgeRetention: [
    { week: 'W1', adaptive: 45, linear: 42 },
    { week: 'W2', adaptive: 58, linear: 48 },
    { week: 'W3', adaptive: 68, linear: 51 },
    { week: 'W4', adaptive: 76, linear: 53 },
    { week: 'W5', adaptive: 82, linear: 54 },
    { week: 'W6', adaptive: 87, linear: 55 },
    { week: 'W7', adaptive: 91, linear: 56 },
    { week: 'W8', adaptive: 94, linear: 56 },
  ],
  completionRate: [
    { week: 'W1', adaptive: 88, linear: 82 },
    { week: 'W2', adaptive: 85, linear: 76 },
    { week: 'W3', adaptive: 83, linear: 68 },
    { week: 'W4', adaptive: 81, linear: 60 },
    { week: 'W5', adaptive: 79, linear: 52 },
    { week: 'W6', adaptive: 78, linear: 45 },
    { week: 'W7', adaptive: 77, linear: 40 },
    { week: 'W8', adaptive: 76, linear: 38 },
  ],
  timeToMastery: [
    { week: 'W1', adaptive: 42, linear: 38 },
    { week: 'W2', adaptive: 35, linear: 40 },
    { week: 'W3', adaptive: 28, linear: 45 },
    { week: 'W4', adaptive: 22, linear: 50 },
    { week: 'W5', adaptive: 18, linear: 55 },
    { week: 'W6', adaptive: 15, linear: 58 },
    { week: 'W7', adaptive: 12, linear: 62 },
    { week: 'W8', adaptive: 10, linear: 65 },
  ],
};

// Mock cohort size and demographics
const COHORT_SIZES = { adaptive: 127, linear: 131 };

function buildStudentTrends(realTrends: StudentTrendPoint[]): StudentTrendPoint[] {
  if (realTrends.length >= 4) return realTrends;
  const mockBase: StudentTrendPoint[] = [
    { date: '2026-08-01', accuracy: 60, questionsAnswered: 8, mastery: 1 },
    { date: '2026-08-08', accuracy: 65, questionsAnswered: 12, mastery: 1 },
    { date: '2026-08-15', accuracy: 72, questionsAnswered: 18, mastery: 2 },
    { date: '2026-08-22', accuracy: 78, questionsAnswered: 25, mastery: 2 },
  ];
  return [...mockBase, ...realTrends].slice(-10);
}

function buildDynamicCohort(
  realTrends: StudentTrendPoint[],
  baseCohort: CohortComparison,
  overallAccuracy: number
): CohortComparison {
  if (realTrends.length === 0) return baseCohort;
  const realAcc = overallAccuracy > 0 ? overallAccuracy : 70;
  const weekCount = Math.min(8, Math.max(4, Math.ceil(realTrends.length / 1.5)));
  const boost = Math.max(-10, Math.min(18, realAcc - 68));

  const blendRetention: CohortMetricPoint[] = baseCohort.knowledgeRetention.slice(0, weekCount).map((pt, i) => {
    const progress = i / Math.max(1, weekCount - 1);
    const adaptiveBoost = Math.round(boost * progress);
    return {
      week: pt.week,
      adaptive: Math.min(99, Math.max(40, pt.adaptive + adaptiveBoost)),
      linear: pt.linear,
    };
  });
  while (blendRetention.length < 8) {
    const last = blendRetention[blendRetention.length - 1];
    const orig = baseCohort.knowledgeRetention[blendRetention.length];
    blendRetention.push({
      week: orig.week,
      adaptive: Math.min(99, last.adaptive + Math.max(1, 97 - last.adaptive - (orig.adaptive - last.adaptive > 0 ? 0 : 1))),
      linear: orig.linear,
    });
  }

  const blendCompletion: CohortMetricPoint[] = baseCohort.completionRate.map((pt, i) => ({
    week: pt.week,
    adaptive: Math.min(99, Math.max(50, pt.adaptive + (i < 4 ? Math.round(boost * 0.3) : 0))),
    linear: pt.linear,
  }));
  const blendMastery: CohortMetricPoint[] = baseCohort.timeToMastery.map((pt, i) => ({
    week: pt.week,
    adaptive: Math.max(5, Math.min(70, pt.adaptive - Math.round(boost * 0.4))),
    linear: pt.linear,
  }));

  return {
    knowledgeRetention: blendRetention,
    completionRate: blendCompletion,
    timeToMastery: blendMastery,
  };
}

type ChartTab = 'performance' | 'cohort';
type MetricTab = 'retention' | 'completion' | 'mastery';

export const AnalyticsView = memo(function AnalyticsView() {
  const { domainProgress, quizHistory, trends, totalAnswered, overallAccuracy, streak, dailyActivity } = useApp();
  const [chartTab, setChartTab] = useState<ChartTab>('performance');
  const [metricTab, setMetricTab] = useState<MetricTab>('retention');
  const [isAdminView, setIsAdminView] = useState(true);

  const studentTrends = useMemo(() => buildStudentTrends(trends), [trends]);
  const cohortData = useMemo(() => buildDynamicCohort(trends, COHORT_DATA, overallAccuracy), [trends, overallAccuracy]);

  const dailyChartData = useMemo(() => {
    const dates = Object.keys(dailyActivity).sort().slice(-14);
    if (dates.length === 0) {
      return studentTrends.map(t => ({
        date: t.date,
        answered: t.questionsAnswered,
        correct: Math.round((t.accuracy / 100) * t.questionsAnswered),
        wrong: Math.max(0, t.questionsAnswered - Math.round((t.accuracy / 100) * t.questionsAnswered)),
      }));
    }
    return dates.map(d => ({
      date: d,
      answered: dailyActivity[d]!.answered,
      correct: dailyActivity[d]!.correct,
      wrong: dailyActivity[d]!.wrong,
    }));
  }, [dailyActivity, studentTrends]);

  const domainRadarData = useMemo(() => {
    return DOMAINS.map(d => {
      const dp = domainProgress[d.id as keyof typeof domainProgress];
      return {
        subject: d.label.replace(' Programming', '').replace('Data Science', 'Data Sci'),
        completion: dp.completionPct,
        accuracy: dp.questionsAnswered > 0 ? Math.round((dp.questionsCorrect / dp.questionsAnswered) * 100) : 0,
        mastery: (dp.masteryLevel / 3) * 100,
      };
    });
  }, [domainProgress]);

  const currentMetric: CohortMetricPoint[] = useMemo(() => {
    if (metricTab === 'retention') return cohortData.knowledgeRetention;
    if (metricTab === 'completion') return cohortData.completionRate;
    return cohortData.timeToMastery;
  }, [metricTab, cohortData]);

  const metricConfig = {
    retention: { label: 'Knowledge Retention %', color: '#6366f1', yLabel: 'Retention %', domain: [0, 100] },
    completion: { label: 'Completion Rate %', color: '#22c55e', yLabel: 'Completion %', domain: [0, 100] },
    mastery: { label: 'Time to Mastery (days)', color: '#f59e0b', yLabel: 'Days', domain: [0, 70] },
  };

  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor = isDark ? '#64748b' : '#94a3b8';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#1e293b' : '#e2e8f0';

  // Final summary metrics for A/B
  const finalAdaptive = currentMetric[currentMetric.length - 1]?.adaptive ?? 0;
  const finalLinear = currentMetric[currentMetric.length - 1]?.linear ?? 0;
  const improvement = Math.round(((finalAdaptive - finalLinear) / finalLinear) * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-ink-100">Analytics & Insights</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Track performance and compare learning approaches</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-ink-200 dark:border-ink-800 p-1 bg-white dark:bg-ink-900">
          <button
            onClick={() => setIsAdminView(false)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              !isAdminView ? 'bg-primary-600 text-white' : 'text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800'
            }`}
          >
            <GraduationCap size={14} className="inline mr-1" /> Student View
          </button>
          <button
            onClick={() => setIsAdminView(true)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              isAdminView ? 'bg-primary-600 text-white' : 'text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800'
            }`}
          >
            <Users size={14} className="inline mr-1" /> Teacher View
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<Target size={18} />} label="Total Questions" value={totalAnswered.toString()} color="primary" />
        <SummaryCard icon={<Activity size={18} />} label="Avg Accuracy" value={`${overallAccuracy}%`} color="success" />
        <SummaryCard icon={<Award size={18} />} label="Best Streak" value={`${streak.longestStreak}d`} color="warning" />
        <SummaryCard icon={<Zap size={18} />} label="Active Days" value={streak.activeDates.length.toString()} color="accent" />
      </div>

      {/* Chart tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-ink-200 dark:border-ink-800 p-1 bg-white dark:bg-ink-900 w-fit">
        <button
          onClick={() => setChartTab('performance')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
            chartTab === 'performance' ? 'bg-primary-600 text-white' : 'text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800'
          }`}
        >
          <TrendingUp size={15} /> Performance Trends
        </button>
        {isAdminView && (
          <button
            onClick={() => setChartTab('cohort')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
              chartTab === 'cohort' ? 'bg-primary-600 text-white' : 'text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800'
            }`}
          >
            <FlaskConical size={15} /> A/B Testing
          </button>
        )}
      </div>

      {/* Performance trends */}
      {chartTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accuracy over time */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-semibold text-sm text-ink-900 dark:text-ink-100 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary-500" /> Accuracy Over Time
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={studentTrends} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis stroke={axisColor} fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={2.5} fill="url(#accuracyGradient)" name="Accuracy %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Domain radar */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-ink-900 dark:text-ink-100 mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-accent-500" /> Domain Mastery
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={domainRadarData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <PolarGrid stroke={gridColor} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: axisColor, fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: axisColor, fontSize: 10 }} />
                <Radar name="Completion" dataKey="completion" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Accuracy" dataKey="accuracy" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Mastery" dataKey="mastery" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Questions per day */}
          <div className="card p-5 lg:col-span-3">
            <h3 className="font-semibold text-sm text-ink-900 dark:text-ink-100 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-success-500" /> Daily Activity
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis stroke={axisColor} fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="answered" fill="#22c55e" radius={[6, 6, 0, 0]} name="Answered" stackId="a" />
                <Bar dataKey="wrong" fill="#ef4444" radius={[6, 6, 0, 0]} name="Incorrect" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* A/B Testing */}
      {chartTab === 'cohort' && isAdminView && (
        <div className="space-y-6">
          {/* Cohort info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-5 border-2 border-primary-200 dark:border-primary-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary-500" />
                    <h3 className="font-bold text-sm text-ink-900 dark:text-ink-100">Adaptive Learning Cohort</h3>
                  </div>
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">AI-driven curriculum, spaced repetition, Socratic tutoring</p>
                </div>
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{COHORT_SIZES.adaptive}</span>
              </div>
            </div>
            <div className="card p-5 border-2 border-ink-300 dark:border-ink-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-ink-400" />
                    <h3 className="font-bold text-sm text-ink-900 dark:text-ink-100">Linear Learning Cohort</h3>
                  </div>
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">Fixed sequence, no adaptation, standard review</p>
                </div>
                <span className="text-2xl font-bold text-ink-500 dark:text-ink-400">{COHORT_SIZES.linear}</span>
              </div>
            </div>
          </div>

          {/* Metric tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-ink-200 dark:border-ink-800 p-1 bg-white dark:bg-ink-900 w-fit">
            {(['retention', 'completion', 'mastery'] as MetricTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setMetricTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  metricTab === tab ? 'bg-primary-600 text-white' : 'text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800'
                }`}
              >
                {tab === 'retention' && 'Retention'}
                {tab === 'completion' && 'Completion'}
                {tab === 'mastery' && 'Time to Mastery'}
              </button>
            ))}
          </div>

          {/* Comparison chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-ink-900 dark:text-ink-100">{metricConfig[metricTab].label}</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400">
                  <span className="w-3 h-3 rounded-full bg-primary-500" /> Adaptive
                </span>
                <span className="flex items-center gap-1.5 text-ink-500">
                  <span className="w-3 h-3 rounded-full bg-ink-400" /> Linear
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={currentMetric} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="week" stroke={axisColor} fontSize={11} />
                <YAxis stroke={axisColor} fontSize={11} domain={metricConfig[metricTab].domain} />
                <Tooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '12px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="adaptive" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Adaptive" />
                <Line type="monotone" dataKey="linear" stroke="#94a3b8" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3 }} name="Linear" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* A/B summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ABSummaryCard
              metric="Knowledge Retention"
              adaptive={COHORT_DATA.knowledgeRetention[7].adaptive}
              linear={COHORT_DATA.knowledgeRetention[7].linear}
              unit="%"
              higherBetter
            />
            <ABSummaryCard
              metric="Completion Rate"
              adaptive={COHORT_DATA.completionRate[7].adaptive}
              linear={COHORT_DATA.completionRate[7].linear}
              unit="%"
              higherBetter
            />
            <ABSummaryCard
              metric="Time to Mastery"
              adaptive={COHORT_DATA.timeToMastery[7].adaptive}
              linear={COHORT_DATA.timeToMastery[7].linear}
              unit="d"
              higherBetter={false}
            />
          </div>

          {/* Key findings */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-ink-900 dark:text-ink-100 mb-3 flex items-center gap-2">
              <FlaskConical size={16} className="text-primary-500" /> Key Findings
            </h3>
            <div className="space-y-2.5">
              {[
                { text: 'Adaptive cohort shows 68% higher knowledge retention after 8 weeks compared to linear approach.', icon: TrendingUp, color: 'success' },
                { text: 'Completion rate divergence starts at week 3 — adaptive learners stay engaged longer.', icon: Activity, color: 'primary' },
                { text: 'Adaptive cohort reaches mastery 85% faster (10 days vs 65 days) due to personalized pacing.', icon: Zap, color: 'warning' },
                { text: 'Spaced repetition review queue correlates with 23% improvement in long-term retention.', icon: Clock, color: 'accent' },
              ].map((finding, i) => {
                const Icon = finding.icon;
                const colorMap: Record<string, string> = {
                  success: 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20',
                  primary: 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20',
                  warning: 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/20',
                  accent: 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20',
                };
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${colorMap[finding.color]}`}>
                      <Icon size={14} />
                    </div>
                    <p className="text-sm text-ink-700 dark:text-ink-300">{finding.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    success: 'bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400',
    accent: 'bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400',
  };
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-ink-900 dark:text-ink-100 leading-tight">{value}</p>
        <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
      </div>
    </div>
  );
}

function ABSummaryCard({ metric, adaptive, linear, unit, higherBetter }: { metric: string; adaptive: number; linear: number; unit: string; higherBetter: boolean }) {
  const diff = adaptive - linear;
  const pctChange = Math.round((Math.abs(diff) / linear) * 100);
  const isAdaptiveBetter = higherBetter ? diff > 0 : diff < 0;
  const Icon = isAdaptiveBetter ? TrendingUp : TrendingUp;

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-3">{metric}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-primary-600 dark:text-primary-400">Adaptive</span>
          <span className="text-lg font-bold text-ink-900 dark:text-ink-100">{adaptive}{unit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-400">Linear</span>
          <span className="text-lg font-bold text-ink-400">{linear}{unit}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium pt-2 border-t border-ink-200 dark:border-ink-800 ${isAdaptiveBetter ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
          <Icon size={14} />
          {isAdaptiveBetter ? '+' : ''}{diff}{unit} ({pctChange}% {isAdaptiveBetter ? 'better' : 'worse'})
        </div>
      </div>
    </div>
  );
}
