import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

export const TaskStats = ({ tasks = [] }) => {
  const { t } = useLanguage();

  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress' || t.status === 'review').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const critical = tasks.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Total Tasks */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('totalTasks')}
          </p>
          <p className="text-xl font-bold tracking-tight mt-0.5">{total}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      {/* 2. In Progress */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('activeTasks')}
          </p>
          <p className="text-xl font-bold tracking-tight mt-0.5 text-amber-600 dark:text-amber-400">
            {inProgress}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Critical Tasks */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('criticalTasks')}
          </p>
          <p className="text-xl font-bold tracking-tight mt-0.5 text-red-600 dark:text-red-400">
            {critical}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Progress Rate */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('progressRate')}
          </p>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {percent}%
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden mt-2">
          <div
            className="bg-gradient-to-r from-brand-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
