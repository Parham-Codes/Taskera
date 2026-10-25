import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Taskera ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('activeWorkspace');
    } catch {}
    window.location.reload();
  };

  handleGoPersonal = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isFa = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'fa';

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#edf1f7] dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100">
          <div className="max-w-md w-full glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/30 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-extrabold tracking-tight">
                {isFa ? 'مشکلی در بارگذاری رخ داد' : 'Something went wrong'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isFa
                  ? 'خطایی در بارگذاری بخش مورد نظر رخ داد. می‌توانید صفحه را تازه‌سازی کنید یا به فضای شخصی بازگردید.'
                  : 'An unexpected error occurred while rendering this section. You can reload or reset your workspace.'}
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 text-start font-mono text-[11px] text-rose-600 dark:text-rose-400 overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-all shadow-md shadow-brand-500/20 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isFa ? 'تازه‌سازی صفحه' : 'Reload Page'}</span>
              </button>

              <button
                onClick={this.handleGoPersonal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 glass-input hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all active:scale-95"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{isFa ? 'بازنشانی' : 'Reset Workspace'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
