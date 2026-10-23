import React from 'react';
import { Play, Square, Loader2, History, Clock } from 'lucide-react';
import {
  formatStopwatch,
  formatDurationText,
  formatTaskDate,
  formatTaskTime,
} from '../../utils/taskHelpers.js';

export const TaskDetailTimeTracker = ({
  task,
  activeSession,
  elapsedSeconds,
  timerBusy,
  onStartTimer,
  onStopTimer,
  lang,
  t,
}) => {
  const completedLogs = (task.timeLogs || []).filter((l) => l.endTime);

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-brand-500/30 relative overflow-hidden space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              activeSession
                ? 'bg-emerald-500 animate-ping'
                : 'bg-slate-400 dark:bg-slate-600'
            }`}
          />
          <h3 className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white">
            {t('timeTracking')}
          </h3>
        </div>

        {activeSession && (
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            {t('timerRunning')}
          </span>
        )}
      </div>

      {/* Stopwatch Display & Big Play/Stop Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-500/5 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
        {/* Live Clock Digits */}
        <div className="sm:col-span-7 flex flex-col items-center sm:items-start">
          <span className="text-[11px] font-semibold text-slate-400 mb-1">
            {activeSession ? t('timerRunning') : t('duration')}
          </span>
          <div
            className="font-mono text-3xl sm:text-4xl font-extrabold tracking-wider text-slate-900 dark:text-white"
            dir="ltr"
          >
            {formatStopwatch(elapsedSeconds)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sm:col-span-5 flex items-center justify-center sm:justify-end gap-2.5">
          {!activeSession ? (
            <button
              onClick={onStartTimer}
              disabled={timerBusy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {timerBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{t('startTimer')}</span>
            </button>
          ) : (
            <button
              onClick={onStopTimer}
              disabled={timerBusy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all shadow-md shadow-rose-600/25 disabled:opacity-50"
            >
              {timerBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4 fill-current" />
              )}
              <span>{t('stopTimer')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Total Tracked Metric Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl glass-input">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('totalTimeSpent')}
          </p>
          <p className="text-sm sm:text-base font-extrabold text-brand-600 dark:text-brand-400 mt-0.5">
            {formatDurationText(task.totalTimeSpent || 0, lang, t)}
          </p>
        </div>

        <div className="p-3 rounded-2xl glass-input">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('workSessions')}
          </p>
          <p className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
            {completedLogs.length} {t('workSessions')}
          </p>
        </div>
      </div>

      {/* Work Sessions History Logs */}
      <div className="pt-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
          <History className="w-3.5 h-3.5" />
          <span>{t('sessionHistory')}</span>
        </div>

        {completedLogs.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            {t('noTimeLogs')}
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-200/50 dark:divide-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs">
            {completedLogs
              .slice()
              .reverse()
              .map((log, idx) => (
                <div
                  key={log._id || idx}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-500/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {formatTaskDate(log.startTime, lang, true)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {lang === 'fa'
                          ? `از ساعت ${formatTaskTime(log.startTime, lang)} تا ${formatTaskTime(log.endTime, lang)}`
                          : `${formatTaskTime(log.startTime, lang)} to ${formatTaskTime(log.endTime, lang)}`}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs border border-brand-500/20 whitespace-nowrap">
                    {formatDurationText(log.duration, lang, t)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
