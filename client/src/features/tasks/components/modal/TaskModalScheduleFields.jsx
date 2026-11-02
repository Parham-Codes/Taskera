import React from 'react';
import { Calendar } from 'lucide-react';

export const TaskModalScheduleFields = ({
  dueDate,
  setDueDate,
  status,
  setStatus,
  showStatusSelect = false,
  t,
}) => {
  return (
    <div className={`grid grid-cols-1 ${showStatusSelect ? 'sm:grid-cols-2' : ''} gap-4`}>
      {/* Due Date */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
          {t('dueDateLabel')}
        </label>
        <div className="relative">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            onClick={(e) => e.target.showPicker?.()}
            className="w-full px-3.5 py-2.5 pe-10 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all cursor-pointer text-slate-900 dark:text-white"
          />
          <Calendar className="w-4 h-4 text-brand-500 dark:text-brand-400 absolute end-3.5 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Status (Only shown in Personal Space) */}
      {showStatusSelect && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            {t('status')}
          </label>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all appearance-none cursor-pointer text-slate-900 dark:text-white"
            >
              <option value="todo">{t('todo')}</option>
              <option value="in-progress">{t('inProgress')}</option>
              <option value="review">{t('review')}</option>
              <option value="completed">{t('completed')}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

