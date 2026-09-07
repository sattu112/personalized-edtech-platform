import { useState, useMemo, useCallback, memo } from 'react';
import { CheckCircle2, XCircle, Clock, Brain, ArrowRight, ArrowLeft, RefreshCw, Lightbulb, TrendingUp, TrendingDown, Sparkles, Loader2, Wand2, SlidersHorizontal, Check } from 'lucide-react';
import { DiagnosticSkeleton } from '../components/Skeleton';
import { useApp } from '../context/AppContext';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { ProgressRing } from '../components/ProgressRing';
import { DOMAINS, DIFFICULTIES, DIFFICULTY_META, levelFromDifficulty, difficultyFromLevel } from '../data/domains';
import { QUESTION_BANK, getQuestionsByDomainAndDifficulty } from '../data/questionBank';
import { analyzeGaps, hasGroqApiKey, getApiStatus, generateQuiz } from '../utils/groqService';
import type { Question, QuizResult, Domain, GapAnalysis, Difficulty } from '../types';

type QuizPhase = 'select' | 'active' | 'feedback' | 'results';

const DOMAIN_COLORS: Record<Domain, string> = {
  mathematics: '#6366f1',
  python: '#06b6d4',
  'data-science': '#22c55e',
  'data-structures': '#8b5cf6',
  algorithms: '#ef4444',
  'operating-systems': '#f59e0b',
  dbms: '#06b6d4',
  'computer-networks': '#22c55e',
  'object-oriented-programming': '#6366f1',
  'web-development': '#06b6d4',
  'machine-learning': '#ef4444',
  'cyber-security': '#f59e0b',
  'compiler-design': '#22c55e',
  'software-engineering': '#6366f1',
};

const QUIZ_LENGTH = 5;

export const QuizView = memo(function QuizView() {
  const { activeDomain, setActiveDomain, domainProgress, recordQuizResult, adjustDifficulty, setGapAnalysis, lastGapAnalysis, setView } = useApp();
  const [phase, setPhase] = useState<QuizPhase>('select');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [gapResult, setGapResult] = useState<GapAnalysis | null>(null);
  const [difficultyChange, setDifficultyChange] = useState<{ from: string; to: string; direction: 'up' | 'down' | 'same' } | null>(null);

  const [genDomain, setGenDomain] = useState<Domain>('algorithms');
  const [genDifficulty, setGenDifficulty] = useState<Difficulty>('Beginner');
  const [genCount, setGenCount] = useState<number>(5);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const currentQuestion = questions[currentIdx];
  const currentDp = domainProgress[activeDomain];

  const startQuiz = useCallback((domain: Domain) => {
    setActiveDomain(domain);
    const dp = domainProgress[domain];
    let pool = getQuestionsByDomainAndDifficulty(domain, dp.currentDifficulty);
    if (pool.length < QUIZ_LENGTH) {
      const otherDifficulties = QUESTION_BANK.filter(q => q.domain === domain && q.difficulty !== dp.currentDifficulty);
      pool = [...pool, ...otherDifficulties];
    }
    const selected = pool.slice(0, QUIZ_LENGTH);
    if (selected.length === 0) {
      void runGenerate(domain, dp.currentDifficulty, QUIZ_LENGTH, true);
      return;
    }
    setQuestions(selected);
    setResults([]);
    setCurrentIdx(0);
    setSelectedIdx(null);
    setShowFeedback(false);
    setPhase('active');
    setQuestionStartTime(Date.now());
    setGapResult(null);
    setDifficultyChange(null);
    setGenError(null);
  }, [setActiveDomain, domainProgress]);

  const runGenerate = useCallback(async (
    domain: Domain,
    difficulty: Difficulty,
    count: number,
    switchToActive: boolean = false
  ) => {
    setGenerating(true);
    setGenError(null);
    try {
      const generated = await generateQuiz(domain, difficulty, count);
      if (generated.length === 0) throw new Error('Generator returned empty set.');
      if (switchToActive) {
        setActiveDomain(domain);
        setQuestions(generated);
        setResults([]);
        setCurrentIdx(0);
        setSelectedIdx(null);
        setShowFeedback(false);
        setPhase('active');
        setQuestionStartTime(Date.now());
        setGapResult(null);
        setDifficultyChange(null);
      } else {
        setActiveDomain(domain);
        setQuestions(generated);
        setResults([]);
        setCurrentIdx(0);
        setSelectedIdx(null);
        setShowFeedback(false);
        setPhase('active');
        setQuestionStartTime(Date.now());
        setGapResult(null);
        setDifficultyChange(null);
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Failed to generate quiz. Please retry.');
    } finally {
      setGenerating(false);
    }
  }, [setActiveDomain]);

  const selectAnswer = useCallback((idx: number) => {
    if (showFeedback) return;
    setSelectedIdx(idx);
  }, [showFeedback]);

  const submitAnswer = useCallback(() => {
    if (selectedIdx === null || !currentQuestion) return;
    const responseTime = Date.now() - questionStartTime;
    const correct = selectedIdx === currentQuestion.correctIndex;
    const result: QuizResult = {
      questionId: currentQuestion.id,
      domain: currentQuestion.domain,
      difficulty: currentQuestion.difficulty,
      concept: currentQuestion.concept,
      correct,
      responseTimeMs: responseTime,
      selectedIndex: selectedIdx,
      timestamp: Date.now(),
    };
    setResults(prev => [...prev, result]);
    recordQuizResult(result);
    setShowFeedback(true);
  }, [selectedIdx, currentQuestion, questionStartTime, recordQuizResult]);

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setPhase('results');
      return;
    }
    setCurrentIdx(prev => prev + 1);
    setSelectedIdx(null);
    setShowFeedback(false);
    setQuestionStartTime(Date.now());
  }, [currentIdx, questions.length]);

  const finishQuiz = useCallback(async () => {
    const correctCount = results.filter(r => r.correct).length;
    const accuracy = Math.round((correctCount / results.length) * 100);
    const wrongAnswers = results.filter(r => !r.correct);

    const oldDifficulty = domainProgress[activeDomain].currentDifficulty;
    adjustDifficulty(activeDomain, accuracy);
    const oldLevel = levelFromDifficulty(oldDifficulty);
    const newLevel = accuracy > 80 && oldLevel < 3 ? oldLevel + 1
      : accuracy < 50 && oldLevel > 1 ? oldLevel - 1
      : oldLevel;
    const newDifficultyLevel = difficultyFromLevel(newLevel);
    setDifficultyChange({
      from: oldDifficulty,
      to: newDifficultyLevel,
      direction: newLevel > oldLevel ? 'up' : newLevel < oldLevel ? 'down' : 'same',
    });

    if (wrongAnswers.length > 0) {
      setAnalyzing(true);
      try {
        const gap = await analyzeGaps({
          wrongAnswers,
          domain: activeDomain,
          currentDifficulty: oldDifficulty,
          accuracy,
        });
        setGapResult(gap);
        setGapAnalysis(gap);
      } catch {
        // fallback already handled in aiEngine
      } finally {
        setAnalyzing(false);
      }
    }

    setPhase('results');
  }, [results, activeDomain, domainProgress, adjustDifficulty, setGapAnalysis]);

  // ---- Select phase ----
  if (phase === 'select') {
    return (
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 dark:text-ink-100">Adaptive Quiz Engine</h1>
          <p className="text-ink-500 dark:text-ink-400 mt-2 text-sm">
            Start an adaptive practice quiz or generate a Groq AI custom quiz by subject & difficulty.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500 dark:text-ink-400 flex items-center gap-2">
              <Brain size={15} /> Curriculum Bank (Adaptive by mastery)
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {DOMAINS.map(d => {
                const dp = domainProgress[d.id as Domain];
                return (
                  <button
                    key={d.id}
                    onClick={() => startQuiz(d.id as Domain)}
                    className="card p-4 text-left hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <ProgressRing
                        percentage={dp.completionPct}
                        size={56}
                        strokeWidth={6}
                        color={DOMAIN_COLORS[d.id as Domain] ?? '#6366f1'}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <h3 className="font-bold text-ink-900 dark:text-ink-100 text-sm">{d.label}</h3>
                          <DifficultyBadge difficulty={dp.currentDifficulty} small />
                        </div>
                        <p className="text-xs text-ink-500 dark:text-ink-400 line-clamp-2">{d.description}</p>
                        <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">
                          {dp.questionsAnswered} answered · {dp.completionPct}% complete
                        </p>
                      </div>
                      <ArrowRight size={18} className="text-ink-300 dark:text-ink-600 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-28">
            <div className="card p-5 gradient-border-primary relative overflow-hidden">
              <div className="absolute -top-16 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/10 blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500 dark:text-ink-400 flex items-center gap-2">
                  <Wand2 size={15} /> Groq AI Quiz Generator
                </h2>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${hasGroqApiKey() ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' : 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400'}`}>
                  {hasGroqApiKey() ? 'LIVE GROQ' : 'SIMULATED BANK'}
                </span>
              </div>
              <p className="text-xs text-ink-500 dark:text-ink-400 mb-4 leading-relaxed">
                Generate a targeted CSE assessment — custom subject, difficulty, and count. If Groq is missing, it falls back to a curated 150-question mock bank instantly.
              </p>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-ink-600 dark:text-ink-300 mb-1.5 flex items-center gap-1.5">
                    <SlidersHorizontal size={12} /> Subject
                  </label>
                  <select
                    value={genDomain}
                    onChange={e => setGenDomain(e.target.value as Domain)}
                    className="input-field"
                  >
                    {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-600 dark:text-ink-300 mb-2">Difficulty</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Beginner', 'Intermediate', 'Expert'] as Difficulty[]).map(diff => {
                      const active = genDifficulty === diff;
                      const meta = DIFFICULTY_META[diff];
                      return (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setGenDifficulty(diff)}
                          className={`relative rounded-xl py-2.5 px-1 text-[11px] font-bold border transition-all flex flex-col items-center gap-0.5 ${active ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm' : 'border-ink-200 dark:border-ink-700 text-ink-500 dark:text-ink-400 hover:border-ink-300 dark:hover:border-ink-600'}`}
                        >
                          <span className="flex items-center gap-1">
                            {active && <Check size={12} />}
                            {diff}
                          </span>
                          <span className="text-[9px] font-medium opacity-80 uppercase tracking-wider">Lvl {meta.level}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-ink-600 dark:text-ink-300 flex items-center gap-1.5">
                      Questions
                    </label>
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{genCount}</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={10}
                    step={1}
                    value={genCount}
                    onChange={e => setGenCount(Number(e.target.value))}
                    className="w-full accent-primary-500"
                  />
                  <div className="flex justify-between text-[10px] text-ink-400 dark:text-ink-500 mt-1">
                    <span>3</span><span>5</span><span>7</span><span>10</span>
                  </div>
                </div>

                {genError && (
                  <div className="rounded-lg border border-error-200 dark:border-error-900/40 bg-error-50 dark:bg-error-900/15 px-3 py-2 text-[11px] text-error-700 dark:text-error-400">
                    {genError}
                  </div>
                )}

                <button
                  disabled={generating}
                  onClick={() => void runGenerate(genDomain, genDifficulty, genCount)}
                  className="w-full btn-primary !py-2.5 text-sm font-semibold justify-center"
                >
                  {generating ? (
                    <span className="inline-flex items-center gap-2 opacity-80">
                      <Loader2 size={15} className="animate-spin" /> Generating {genCount} questions…
                    </span>
                  ) : (
                    <>
                      <Sparkles size={15} /> Generate & Start Quiz
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-ink-400 dark:text-ink-500 leading-relaxed">
                  {hasGroqApiKey()
                    ? `Powered by ${getApiStatus().model} via Groq Cloud. Results usually under 3s.`
                    : 'VITE_GROQ_API_KEY not set → uses curated mock CSE question bank. Add key in Vercel env or .env.local for live generation.'}
                </p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-3">
              <Sparkles size={17} className="text-primary-500 flex-shrink-0" />
              <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
                {hasGroqApiKey()
                  ? `AI gap analysis active (${getApiStatus().provider}) — wrong answers analyzed by LLM for personalized micro-learning remediation.`
                  : 'Demo mode: AI gap analysis uses intelligent mock responses. Live mode enabled by setting VITE_GROQ_API_KEY (free: console.groq.com).'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Active quiz phase ----
  if (phase === 'active' && currentQuestion) {
    const progress = ((currentIdx + (showFeedback ? 1 : 0)) / questions.length) * 100;
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink-500 dark:text-ink-400 whitespace-nowrap">
            Q{currentIdx + 1} / {questions.length}
          </span>
          <div className="flex-1 h-2 rounded-full bg-ink-200 dark:bg-ink-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: DOMAIN_COLORS[activeDomain] }}
            />
          </div>
          <DifficultyBadge difficulty={currentQuestion.difficulty} showLevel={false} />
        </div>

        {/* Question card */}
        <div className="card p-6 sm:p-8 space-y-6">
          <div>
            <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 mb-3">
              <Lightbulb size={12} /> {currentQuestion.concept}
            </span>
            <p className="text-lg sm:text-xl font-semibold text-ink-900 dark:text-ink-100 whitespace-pre-line leading-relaxed">
              {currentQuestion.prompt}
            </p>
          </div>

          <div className="space-y-2.5">
            {currentQuestion.choices.map((choice, idx) => {
              const isSelected = selectedIdx === idx;
              const isCorrect = idx === currentQuestion.correctIndex;
              let stateClass = 'border-ink-200 dark:border-ink-700 hover:border-primary-300 dark:hover:border-primary-700 bg-white dark:bg-ink-900';
              if (showFeedback) {
                if (isCorrect) stateClass = 'border-success-500 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400';
                else if (isSelected) stateClass = 'border-error-500 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400';
                else stateClass = 'border-ink-200 dark:border-ink-700 opacity-50 bg-white dark:bg-ink-900';
              } else if (isSelected) {
                stateClass = 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/20';
              }

              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  disabled={showFeedback}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${stateClass} ${!showFeedback ? 'active:scale-[0.99]' : ''}`}
                >
                  <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold flex-shrink-0 ${
                    showFeedback && isCorrect ? 'bg-success-500 text-white' :
                    showFeedback && isSelected && !isCorrect ? 'bg-error-500 text-white' :
                    isSelected ? 'bg-primary-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-500'
                  }`}>
                    {showFeedback && isCorrect ? <CheckCircle2 size={16} /> :
                     showFeedback && isSelected && !isCorrect ? <XCircle size={16} /> :
                     String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm sm:text-base font-medium text-ink-800 dark:text-ink-200">{choice}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div className="animate-slide-down space-y-3">
              <div className={`rounded-xl p-4 border ${
                selectedIdx === currentQuestion.correctIndex
                  ? 'border-success-200 dark:border-success-800/50 bg-success-50 dark:bg-success-900/15'
                  : 'border-error-200 dark:border-error-800/50 bg-error-50 dark:bg-error-900/15'
              }`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {selectedIdx === currentQuestion.correctIndex ? (
                    <><CheckCircle2 size={18} className="text-success-600 dark:text-success-400" /><span className="font-semibold text-sm text-success-700 dark:text-success-400">Correct!</span></>
                  ) : (
                    <><XCircle size={18} className="text-error-600 dark:text-error-400" /><span className="font-semibold text-sm text-error-700 dark:text-error-400">Not quite right</span></>
                  )}
                </div>
                <p className="text-sm text-ink-700 dark:text-ink-300">{currentQuestion.explanation}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3">
          <button
            onClick={() => setPhase('select')}
            className="btn-ghost"
          >
            <ArrowLeft size={16} /> Exit
          </button>
          {!showFeedback ? (
            <button
              onClick={submitAnswer}
              disabled={selectedIdx === null}
              className="btn-primary"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="btn-primary"
            >
              {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question'} <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---- Results phase ----
  if (phase === 'results') {
    const correctCount = results.filter(r => r.correct).length;
    const accuracy = Math.round((correctCount / results.length) * 100);
    const avgTime = Math.round(results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length / 1000);

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Results header */}
        <div className="card p-6 sm:p-8 text-center quiz-result-enter">
          <div className="flex justify-center mb-4">
            <ProgressRing
              percentage={accuracy}
              size={140}
              strokeWidth={10}
              color={accuracy > 80 ? '#22c55e' : accuracy > 50 ? '#f59e0b' : '#ef4444'}
              label="Accuracy"
            />
          </div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-ink-100">
            {accuracy > 80 ? 'Excellent work!' : accuracy > 50 ? 'Good progress!' : 'Keep practicing!'}
          </h2>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
            You answered {correctCount} out of {results.length} correctly
          </p>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="rounded-xl bg-ink-50 dark:bg-ink-800/50 p-3">
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">{correctCount}</p>
              <p className="text-xs text-ink-500 dark:text-ink-400">Correct</p>
            </div>
            <div className="rounded-xl bg-ink-50 dark:bg-ink-800/50 p-3">
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">{results.length - correctCount}</p>
              <p className="text-xs text-ink-500 dark:text-ink-400">Missed</p>
            </div>
            <div className="rounded-xl bg-ink-50 dark:bg-ink-800/50 p-3">
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">{avgTime}s</p>
              <p className="text-xs text-ink-500 dark:text-ink-400">Avg Time</p>
            </div>
          </div>
        </div>

        {/* Difficulty adjustment */}
        {difficultyChange && (
          <div className={`card p-5 border-2 ${
            difficultyChange.direction === 'up' ? 'border-success-300 dark:border-success-800' :
            difficultyChange.direction === 'down' ? 'border-warning-300 dark:border-warning-800' :
            'border-ink-200 dark:border-ink-800'
          }`}>
            <div className="flex items-center gap-3">
              {difficultyChange.direction === 'up' ? (
                <><TrendingUp size={20} className="text-success-600 dark:text-success-400" /><span className="font-semibold text-sm text-ink-900 dark:text-ink-100">Difficulty increased!</span></>
              ) : difficultyChange.direction === 'down' ? (
                <><TrendingDown size={20} className="text-warning-600 dark:text-warning-400" /><span className="font-semibold text-sm text-ink-900 dark:text-ink-100">Difficulty adjusted down for remediation</span></>
              ) : (
                <><Clock size={20} className="text-ink-400" /><span className="font-semibold text-sm text-ink-900 dark:text-ink-100">Difficulty maintained</span></>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 ml-8">
              <DifficultyBadge difficulty={difficultyChange.from as typeof DIFFICULTIES[number]} />
              <ArrowRight size={14} className="text-ink-400" />
              <DifficultyBadge difficulty={difficultyChange.to as typeof DIFFICULTIES[number]} />
            </div>
            <p className="text-xs text-ink-500 dark:text-ink-400 mt-2 ml-8">
              {accuracy > 80 ? 'Great accuracy — you\'re ready for harder challenges.' :
               accuracy < 50 ? 'Let\'s reinforce fundamentals before moving forward.' :
               'Solid performance — keep at this level to build mastery.'}
            </p>
          </div>
        )}

        {/* AI Gap Analysis */}
        {analyzing ? (
          <DiagnosticSkeleton />
        ) : gapResult ? (
          <div className="card p-6 space-y-4 animate-slide-up">
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-primary-500" />
              <h3 className="font-bold text-ink-900 dark:text-ink-100">AI Gap Analysis</h3>
              <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 ml-auto">
                {Math.round(gapResult.confidence * 100)}% confidence
              </span>
            </div>
            <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-4 border border-primary-200 dark:border-primary-800">
              <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-1">Root Knowledge Gap</p>
              <p className="text-sm text-ink-700 dark:text-ink-300">{gapResult.rootGap}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-2">
                Personalized Micro-Learning Plan · {gapResult.weakConcept}
              </p>
              <div className="space-y-2">
                {gapResult.microPlan.map((step, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl border border-ink-200 dark:border-ink-800">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-600 text-white text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{step.title}</p>
                      <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{step.description}</p>
                      <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">{step.resource}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : results.every(r => r.correct) ? (
          <div className="card p-6 text-center quiz-result-enter">
            <Sparkles size={28} className="mx-auto text-success-500 mb-2" />
            <p className="font-semibold text-ink-900 dark:text-ink-100">Perfect score! No gaps detected.</p>
            <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">You've mastered this level — try the next difficulty.</p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => setPhase('select')} className="btn-outline flex-1">
            <RefreshCw size={16} /> New Quiz
          </button>
          <button onClick={() => setView('dashboard')} className="btn-ghost flex-1">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
});
