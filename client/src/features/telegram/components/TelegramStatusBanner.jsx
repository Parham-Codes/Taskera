import React from 'react';
import { Bot } from 'lucide-react';

export const TelegramStatusBanner = ({
  enabled,
  setEnabled,
  t,
}) => {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-blue-500/5 via-transparent to-brand-500/5">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            enabled
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            {t('telegramStatus')}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {enabled ? t('telegramEnabled') : t('telegramDisabled')}
          </p>
        </div>
      </div>

      {/* Toggle Switch */}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );
};

