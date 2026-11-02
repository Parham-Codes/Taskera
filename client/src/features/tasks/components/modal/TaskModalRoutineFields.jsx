import React from 'react';
import { Repeat } from 'lucide-react';

export const TaskModalRoutineFields = ({
  isRecurring,
  setIsRecurring,
  recurrenceFrequency,
  setRecurrenceFrequency,
  t,
}) => {
  return (
    <div className="p-3.5 rounded-2xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-950/20 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {t('routineToggle')}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              {t('routineHint')}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {isRecurring && (
        <div className="pt-2 border-t border-indigo-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-200">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {t('routineFrequency')}:
          </label>
          <select
            value={recurrenceFrequency}
            onChange={(e) => setRecurrenceFrequency(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs glass-input focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="daily">{t('dailyRoutine')}</option>
            <option value="weekdays">{t('weekdaysRoutine')}</option>
            <option value="weekly">{t('weeklyRoutine')}</option>
          </select>
        </div>
      )}
    </div>
  );
};

