import React, { useState } from 'react';
import {
  Server,
  RefreshCw,
  WifiOff,
  AlertTriangle,
  RotateCcw,
  Languages,
  Sun,
  Moon,
  Clock,
  Sparkles,
} from 'lucide-react';
import { TaskeraLogo } from './TaskeraLogo.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

export const ServerWakeupScreen = ({
  status = 'connecting', // 'connecting' | 'waking' | 'timeout' | 'offline' | 'error'
  elapsedSeconds = 0,
  onRetry,
}) => {
  const { lang, toggleLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (retrying || !onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Approximate progress for the 60-second wake-up window (capped at 95% until complete)
  const progressPercent = Math.min(95, Math.round((elapsedSeconds / 60) * 100));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#edf1f7] dark:bg-[#0B0F17] transition-colors duration-200 select-none relative overflow-hidden">
      {/* Background soft ambient glow */}
      <div className="absolute top-1/4 -start-24 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -end-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top action controls: Language & Theme switcher */}
      <div className="absolute top-5 end-5 flex items-center gap-2 z-10">
        <button
          onClick={toggleLang}
          type="button"
          aria-label="Toggle Language"
          className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 transition-colors shadow-sm flex items-center gap-1.5 text-xs font-medium cursor-pointer"
        >
          <Languages className="w-4 h-4" />
          <span>{lang === 'fa' ? 'EN' : 'فا'}</span>
        </button>

        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle Theme"
          className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 transition-colors shadow-sm cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Container Card */}
      <div className="relative w-full max-w-md bg-white/90 dark:bg-[#111726]/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none text-center">
        {/* Subtle accent border line on top */}
        <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent rounded-full" />

        {/* Brand Header */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/40 text-brand-600 dark:text-brand-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Taskera</span>
        </div>

        {/* --- STATE 1: INITIAL CONNECTING (0 - 4s) --- */}
        {status === 'connecting' && (
          <div className="flex flex-col items-center py-4">
            <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
              {/* Outer soft pulse ring */}
              <div className="absolute inset-0 rounded-full border-4 border-brand-500/20 dark:border-brand-500/30 animate-pulse" />
              {/* Outer spinning border ring */}
              <div className="w-16 h-16 rounded-full border-3 border-brand-500 border-t-transparent animate-spin" />
              {/* Centered Taskera Logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-md shadow-brand-500/30">
                  <TaskeraLogo className="w-full h-full" idPrefix="wakeup-loader" />
                </div>
              </div>
            </div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {t('serverConnecting')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('loading')}
            </p>
          </div>
        )}

        {/* --- STATE 2: WAKING UP (COLD START DETECTED) --- */}
        {status === 'waking' && (
          <div className="flex flex-col items-center py-2 animate-fadeIn">
            {/* Pulsing Server Icon */}
            <div className="relative w-16 h-16 mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 animate-ping opacity-75" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-lg shadow-amber-500/10">
                <Server className="w-7 h-7 animate-pulse" />
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              {t('serverWakingUpTitle')}
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mb-6">
              {t('serverWakingUpDesc')}
            </p>

            {/* Progress Bar & Counter */}
            <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2.5 mb-3 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
              <div
                className="bg-gradient-to-r from-amber-500 to-brand-500 h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>

            <div className="w-full flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 font-mono">
              <span className="flex items-center gap-1 font-sans">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{t('secondsElapsed')}</span>
                <strong className="text-slate-700 dark:text-slate-200">{elapsedSeconds}s</strong>
              </span>
              <span className="font-sans text-[10px] text-slate-400">
                {t('estimatedTime')}
              </span>
            </div>
          </div>
        )}

        {/* --- STATE 3: TIMEOUT (REACHED LIMIT OR 502/504) --- */}
        {status === 'timeout' && (
          <div className="flex flex-col items-center py-2 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4 shadow-lg shadow-amber-500/10">
              <Clock className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              {t('serverTimeoutTitle')}
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mb-6">
              {t('serverTimeoutDesc')}
            </p>

            {/* Action Buttons */}
            <div className="w-full flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="w-full flex-1 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-98 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-500/25 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                <span>{t('retryBtn')}</span>
              </button>

              <button
                type="button"
                onClick={handleReload}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('reloadBtn')}</span>
              </button>
            </div>
          </div>
        )}

        {/* --- STATE 4: OFFLINE (NO INTERNET) --- */}
        {status === 'offline' && (
          <div className="flex flex-col items-center py-2 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 shadow-lg shadow-red-500/10">
              <WifiOff className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              {t('serverOfflineTitle')}
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mb-6">
              {t('serverOfflineDesc')}
            </p>

            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-98 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-500/25 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>{t('retryBtn')}</span>
            </button>
          </div>
        )}

        {/* --- STATE 5: GENERAL ERROR (500 OR UNEXPECTED) --- */}
        {status === 'error' && (
          <div className="flex flex-col items-center py-2 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4 shadow-lg shadow-rose-500/10">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              {t('serverErrorTitle')}
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mb-6">
              {t('serverErrorDesc')}
            </p>

            <div className="w-full flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="w-full flex-1 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-98 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-500/25 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                <span>{t('retryBtn')}</span>
              </button>

              <button
                type="button"
                onClick={handleReload}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('reloadBtn')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
