import { memo, useState, type FormEvent } from 'react';
import { GraduationCap, LogIn, UserPlus, AlertCircle, Mail, User, GraduationCap as GradeIcon, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GRADE_BANDS } from '../types';

type Tab = 'signin' | 'signup';

export const LoginSignupView = memo(function LoginSignupView() {
  const { signup, login, listStudents } = useApp();
  const [tab, setTab] = useState<Tab>('signin');

  const [signinEmail, setSigninEmail] = useState('');
  const [signinError, setSigninError] = useState<string | null>(null);
  const [signinLoading, setSigninLoading] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupGrade, setSignupGrade] = useState<string>(GRADE_BANDS[3]!);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  const knownStudents = listStudents();

  const handleSignIn = (e: FormEvent) => {
    e.preventDefault();
    setSigninError(null);
    setSigninLoading(true);
    setTimeout(() => {
      const res = login(signinEmail);
      setSigninLoading(false);
      if (!res.ok) setSigninError(res.error);
    }, 180);
  };

  const handleSignUp = (e: FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupLoading(true);
    setTimeout(() => {
      const res = signup({ name: signupName, email: signupEmail, grade: signupGrade });
      setSignupLoading(false);
      if (!res.ok) setSignupError(res.error);
    }, 180);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-ink-950 dark:via-ink-950 dark:to-ink-900">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-500/80 to-accent-500 text-white shadow-lg shadow-primary-500/20 mb-4">
            <GraduationCap size={34} strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-ink-900 via-primary-700 to-accent-700 dark:from-ink-100 dark:via-primary-300 dark:to-accent-300 bg-clip-text text-transparent">
            AdaptiveMind
          </h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-2 max-w-xs mx-auto">
            AI Personalised Learning Platform · Socratic Tutor · Adaptive Quizzes · Spaced Repetition
          </p>
        </div>

        <div className="card p-1.5">
          <div className="grid grid-cols-2 rounded-xl bg-ink-100 dark:bg-ink-800/60 p-1 mb-5">
            <button
              type="button"
              onClick={() => { setTab('signin'); setSigninError(null); setSignupError(null); }}
              className={`rounded-lg py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === 'signin' ? 'bg-white dark:bg-ink-900 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300'}`}
            >
              <LogIn size={16} /> Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setSigninError(null); setSignupError(null); }}
              className={`rounded-lg py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === 'signup' ? 'bg-white dark:bg-ink-900 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300'}`}
            >
              <UserPlus size={16} /> Sign Up
            </button>
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4 px-1">
              <div>
                <label htmlFor="si-email" className="block text-xs font-semibold text-ink-600 dark:text-ink-300 mb-1.5">
                  School Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    id="si-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={signinEmail}
                    onChange={e => setSigninEmail(e.target.value)}
                    placeholder="you@student.edu"
                    className="input-field !pl-10"
                  />
                </div>
              </div>

              {signinError && (
                <div className="rounded-xl border border-error-200 dark:border-error-900/40 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-xs px-3.5 py-2.5 flex items-start gap-2">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{signinError}</span>
                </div>
              )}

              {knownStudents.length > 0 && (
                <div className="rounded-xl border border-ink-200 dark:border-ink-800 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-2">
                    Recent students on this device
                  </p>
                  <div className="space-y-1.5">
                    {knownStudents.slice(0, 3).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setSigninEmail(s.email); setSigninError(null); }}
                        className="w-full flex items-center gap-2.5 rounded-lg p-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800/60 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center text-xs font-bold">
                          {s.avatarInitial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-800 dark:text-ink-200 truncate">{s.name}</p>
                          <p className="text-xs text-ink-500 dark:text-ink-400 truncate">{s.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" disabled={signinLoading} className="btn-primary w-full !py-2.5 text-sm font-semibold">
                {signinLoading ? (
                  <span className="inline-flex items-center gap-2 opacity-70">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/70 border-t-white animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <>
                    <LogIn size={16} /> Sign In to Your Dashboard
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3.5 px-1">
              <div>
                <label htmlFor="su-name" className="block text-xs font-semibold text-ink-600 dark:text-ink-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    id="su-name"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={2}
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="input-field !pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="su-email" className="block text-xs font-semibold text-ink-600 dark:text-ink-300 mb-1.5">
                  School Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    id="su-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    placeholder="you@student.edu"
                    className="input-field !pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="su-grade" className="block text-xs font-semibold text-ink-600 dark:text-ink-300 mb-1.5">
                  Year / Level
                </label>
                <div className="relative">
                  <GradeIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                  <select
                    id="su-grade"
                    value={signupGrade}
                    onChange={e => setSignupGrade(e.target.value)}
                    className="input-field !pl-10 appearance-none pr-10"
                  >
                    {GRADE_BANDS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {signupError && (
                <div className="rounded-xl border border-error-200 dark:border-error-900/40 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 text-xs px-3.5 py-2.5 flex items-start gap-2">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{signupError}</span>
                </div>
              )}

              <div className="rounded-xl border border-primary-100 dark:border-primary-900/30 bg-primary-50/70 dark:bg-primary-900/10 px-3.5 py-2.5 flex items-start gap-2">
                <Sparkles size={15} className="flex-shrink-0 mt-0.5 text-primary-500" />
                <span className="text-xs text-ink-600 dark:text-ink-300 leading-relaxed">
                  <span className="font-semibold text-primary-700 dark:text-primary-300">100% private:</span> your progress never leaves your browser (localStorage only). No passwords needed — just remember your email.
                </span>
              </div>

              <button type="submit" disabled={signupLoading} className="btn-primary w-full !py-2.5 text-sm font-semibold">
                {signupLoading ? (
                  <span className="inline-flex items-center gap-2 opacity-70">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/70 border-t-white animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  <>
                    <Sparkles size={16} /> Create My Learning Profile
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-ink-400 dark:text-ink-500 mt-5">
          By continuing you agree to use the platform for educational purposes only · Local device storage only
        </p>
      </div>
    </div>
  );
});
