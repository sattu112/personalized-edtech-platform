import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error) {
    try {
      localStorage.setItem('adapted_crash', JSON.stringify({
        msg: error.message,
        t: Date.now(),
      }));
    } catch { /* noop */ }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950 px-4">
          <div className="max-w-md w-full card p-8 text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-error-100 dark:bg-error-900/30 text-error-600 dark:text-error-400 flex items-center justify-center">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink-900 dark:text-ink-100 mb-1">Something went wrong</h1>
              <p className="text-sm text-ink-500 dark:text-ink-400">
                The app hit an unexpected error. Your progress is safe in your browser.
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="btn-primary w-full"
            >
              <RefreshCw size={16} /> Restart App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
