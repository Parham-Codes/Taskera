import React from 'react';
import { Bell, CheckCheck, MessageSquare, AlarmClock } from 'lucide-react';
import { formatRelativeTime } from '../../utils/taskHelpers.js';

export const TaskBoardNotificationView = ({
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenTaskDetail,
  lang,
  t,
}) => {
  return (
    <div className="glass-panel rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {t('notificationsTitle')}
            </h3>
            <p className="text-xs text-slate-400">{t('notificationsDesc')}</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50/60 dark:hover:bg-brand-950/40 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{t('markAllRead')}</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            {t('noNotifications')}
          </div>
        ) : (
          notifications.map((n) => {
            const isReminder = n.type === 'task_reminder';
            const displayTitle = isReminder
              ? (n.reminderStage === 'day_before'
                  ? t('reminderDayBeforeTitle')
                  : t('reminderDueTodayTitle'))
              : n.title;
            const taskTitle = n.taskId?.title || '';
            const displayMessage = isReminder && taskTitle
              ? (n.reminderStage === 'day_before'
                  ? t('reminderDayBeforeMsg').replace('{title}', taskTitle)
                  : t('reminderDueTodayMsg').replace('{title}', taskTitle))
              : n.message;

            return (
              <div
                key={n._id}
                onClick={() => {
                  onMarkAsRead(n._id);
                  if (n.taskId?._id || n.taskId) {
                    onOpenTaskDetail(n.taskId?._id || n.taskId);
                  }
                }}
                className={`p-4 rounded-2xl flex items-start justify-between gap-3 cursor-pointer transition-all ${
                  !n.isRead
                    ? 'bg-brand-50/80 dark:bg-brand-950/40 border border-brand-500/30 shadow-xs'
                    : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs ${
                      isReminder
                        ? 'bg-gradient-to-tr from-amber-500 to-rose-500 text-white'
                        : 'bg-gradient-to-tr from-brand-600 to-indigo-600 text-white'
                    }`}
                  >
                    {isReminder ? (
                      <AlarmClock className="w-4 h-4" />
                    ) : (
                      n.sender?.name?.[0]?.toUpperCase() || (
                        <MessageSquare className="w-4 h-4" />
                      )
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {displayTitle}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {displayMessage}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 shrink-0 ms-2">
                  {formatRelativeTime(n.createdAt, lang)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
