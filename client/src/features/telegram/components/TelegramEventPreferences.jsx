import React from 'react';
import { Bell } from 'lucide-react';

export const TelegramEventPreferences = ({
  notifyOnCreated,
  setNotifyOnCreated,
  notifyOnAssigned,
  setNotifyOnAssigned,
  notifyOnStatusChange,
  setNotifyOnStatusChange,
  notifyOnReminders,
  setNotifyOnReminders,
  t,
}) => {
  return (
    <div className="pt-2">
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
        <Bell className="w-3.5 h-3.5 text-blue-500" />
        <span>{t('telegramPreferences')}</span>
      </label>

      <div className="space-y-2 p-3 rounded-xl glass-panel border border-slate-200/60 dark:border-slate-800 text-xs">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyOnCreated}
            onChange={(e) => setNotifyOnCreated(e.target.checked)}
            className="rounded text-blue-600 focus:ring-0 focus:outline-none"
          />
          <span className="text-slate-700 dark:text-slate-300 text-xs">
            {t('notifyOnCreated')}
          </span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyOnAssigned}
            onChange={(e) => setNotifyOnAssigned(e.target.checked)}
            className="rounded text-blue-600 focus:ring-0 focus:outline-none"
          />
          <span className="text-slate-700 dark:text-slate-300 text-xs">
            {t('notifyOnAssigned')}
          </span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyOnStatusChange}
            onChange={(e) => setNotifyOnStatusChange(e.target.checked)}
            className="rounded text-blue-600 focus:ring-0 focus:outline-none"
          />
          <span className="text-slate-700 dark:text-slate-300 text-xs">
            {t('notifyOnStatusChange')}
          </span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyOnReminders}
            onChange={(e) => setNotifyOnReminders(e.target.checked)}
            className="rounded text-blue-600 focus:ring-0 focus:outline-none"
          />
          <span className="text-slate-700 dark:text-slate-300 text-xs">
            {t('notifyOnReminders')}
          </span>
        </label>
      </div>
    </div>
  );
};

