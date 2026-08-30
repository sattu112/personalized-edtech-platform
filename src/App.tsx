import { lazy, Suspense, useMemo, useState, useEffect } from 'react';
import { LayoutDashboard, Brain, BarChart3, Sun, Moon, GraduationCap } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import type { View } from './types';
import { Toast } from './components/Toast';
import { getApiStatus } from './utils/groqService';

const Dashboard = lazy(() => import('./views/Dashboard').then(m => ({ default: m.Dashboard })));
const QuizView = lazy(() => import('./views/QuizView').then(m => ({ default: m.QuizView })));
const TutorView = lazy(() => import('./views/TutorView').then(m => ({ default: m.TutorView })));
const AnalyticsView = lazy(() => import('./views/AnalyticsView').then(m => ({ default: m.AnalyticsView })));

const NAV_ITEMS: readonly { view: View; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'quiz', label: 'Adaptive Quiz', icon: Brain },
  { view: 'tutor', label: 'AI Tutor', icon: GraduationCap },
  { view: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const;

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center items-center py-20 animate-fade-in" role="status" aria-label="Loading content">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary-200 dark:border-primary-500 dark:border-t-transparent animate-spin" aria-hidden="true" />
        <p className="text-sm text-ink-500 dark:text-ink-400">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  const { view, setView, theme, toggleTheme } = useApp();
  const navItems = useMemo(() => NAV_ITEMS, []);
  const apiStatus = useMemo(() => getApiStatus(), []);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'info' | 'warning'>('info');

  useEffect(() => {
    const seen = sessionStorage.getItem('adapted_ai_notice_seen');
    if (!seen) {
      if (apiStatus.configured) {
        setToastMsg('AI Mode: Live Groq Cloud');
        setToastVariant('success');
      } else {
        setToastMsg('AI Mode: Simulated (add VITE_GROQ_API_KEY for live)');
        setToastVariant('warning');
      }
      setToastVisible(true);
      sessionStorage.setItem('adapted_ai_notice_seen', '1');
    }
  }, [apiStatus.configured]);

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header
        className="sticky top-0 z-50 border-b border-ink-200 dark:border-ink-800 bg-white/80 dark:bg-ink-950/80 backdrop-blur-lg"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-sm"
                aria-hidden="true"
              >
                <Brain size={20} />
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-bold text-ink-900 dark:text-ink-100 tracking-tight">AdaptEd</span>
                <span className="text-[10px] text-ink-400 dark:text-ink-500 ml-1.5 font-medium hidden md:inline">AI Learning Platform</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
              {navItems.map(({ view: v, label, icon: Icon }) => {
                const active = view === v;
                return (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                      active
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-700 dark:hover:text-ink-200'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav
        className="md:hidden sticky top-14 z-40 border-b border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-950"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center gap-0.5 px-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {navItems.map(({ view: v, label, icon: Icon }) => {
            const active = view === v;
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1 rounded-lg px-2.5 sm:px-3 py-2.5 text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all flex-1 min-w-0 focus:outline-none ${
                  active
                    ? 'text-primary-700 dark:text-primary-400'
                    : 'text-ink-500 dark:text-ink-400'
                }`}
                style={active ? { borderBottom: '2px solid #6366f1' } : { borderBottom: '2px solid transparent' }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={14} aria-hidden="true" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6" role="main" tabIndex={-1}>
        <Suspense fallback={<LoadingFallback />}>
          {view === 'dashboard' && <Dashboard />}
          {view === 'quiz' && <QuizView />}
          {view === 'tutor' && <TutorView />}
          {view === 'analytics' && <AnalyticsView />}
        </Suspense>
      </main>

      <footer className="border-t border-ink-200 dark:border-ink-800 py-4" role="contentinfo">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-400 dark:text-ink-500">
          <span>AdaptiveMind — Personalised AI-Powered Learning Platform</span>
          <span className="hidden sm:inline">Adaptive Curriculum · Socratic Tutor · Cohort Analytics</span>
          <span className="sm:hidden">Groq AI · 100% Client-Side</span>
        </div>
      </footer>

      <Toast
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        duration={5000}
        onDismiss={() => setToastVisible(false)}
      />
    </div>
  );
}

function AppWithProvider() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}

export default AppWithProvider;
