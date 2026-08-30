import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';

type ToastVariant = 'success' | 'info' | 'warning';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss?: () => void;
  visible: boolean;
}

export function Toast({ message, variant = 'info', duration = 4000, onDismiss, visible }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const t = setTimeout(() => {
        setShow(false);
        setTimeout(() => onDismiss?.(), 200);
      }, duration);
      return () => clearTimeout(t);
    }
  }, [visible, duration, onDismiss]);

  if (!visible && !show) return null;

  const variantStyles: Record<ToastVariant, string> = {
    success: 'bg-success-600 text-white',
    info: 'bg-primary-600 text-white',
    warning: 'bg-warning-600 text-white',
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-200 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      role="status"
      aria-live="polite"
    >
      <div className={`rounded-xl px-4 py-3 shadow-xl flex items-center gap-2.5 ${variantStyles[variant]} backdrop-blur-sm`}>
        {variant === 'success' ? (
          <CheckCircle2 size={16} className="flex-shrink-0" />
        ) : (
          <Sparkles size={16} className="flex-shrink-0" />
        )}
        <span className="text-sm font-medium whitespace-nowrap sm:whitespace-normal">{message}</span>
        <button
          onClick={() => { setShow(false); setTimeout(() => onDismiss?.(), 200); }}
          className="ml-1 hover:bg-white/20 rounded-lg p-1 transition-colors"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
