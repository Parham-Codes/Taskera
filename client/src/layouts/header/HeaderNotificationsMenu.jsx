import React from 'react';
import { Bell, CheckCheck, AlarmClock, MessageSquare } from 'lucide-react';

export const HeaderNotificationsMenu = ({
  notifications = [],
  unreadCount = 0,
  isOpen,
  onToggleOpen,
  menuRef,
  markAsRead,
  markAllAsRead,
  onOpenTaskDetail,
  lang,
  t,
}) => {
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return lang === 'fa' ? 'لحظاتی پیش' : 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} ${lang === 'fa' ? 'دقیقه پیش' : 'm ago'}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${lang === 'fa' ? 'ساعت پیش' : 'h ago'}`;
    return new Date(dateStr).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={onToggleOpen}
        className="p-2 rounded-xl glass-input hover:border-brand-500/40 text-slate-600 dark:text-slate-300 transition-all relative cursor-pointer"
        title={t('notificationsTitle')}
        aria-label={t('notificationsTitle')}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notifications Center */}
      {isOpen && (
        <div className="fixed sm:absolute top-16 sm:top-full inset-x-3 sm:inset-x-auto sm:end-0 mt-2 sm:w-96 max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800 px-1">
            <div className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t('notificationsTitle')}
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t('markAllRead')}</span>
              </button>
            )}
          </div>

          {/* Notification Items */}
          <div className="max-h-80 overflow-y-auto space-y-1.5 pe-1 text-xs overscroll-contain">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {t('noNotifications')}
              </div>
            ) : (
              notifications.map((n) => {
                const isReminder = n.type === 'task_reminder';
                const displayTitle = isReminder
                  ? n.reminderStage === 'day_before'
                    ? t('reminderDayBeforeTitle')
                    : t('reminderDueTodayTitle')
                  : n.title;
                const taskTitle = n.taskId?.title || '';
                const displayMessage =
                  isReminder && taskTitle
                    ? n.reminderStage === 'day_before'
                      ? t('reminderDayBeforeMsg').replace('{title}', taskTitle)
                      : t('reminderDueTodayMsg').replace('{title}', taskTitle)
                    : n.message;

                return (
                  <div
                    key={n._id}
                    onClick={() => {
                      markAsRead(n._id);
                      if (n.taskId?._id || n.taskId) {
                        onOpenTaskDetail?.(n.taskId?._id || n.taskId);
                        onToggleOpen();
                      }
                    }}
                    className={`p-2.5 rounded-2xl flex items-start gap-2.5 cursor-pointer transition-all ${
                      !n.isRead
                        ? 'bg-brand-50/70 dark:bg-brand-950/30 border border-brand-500/20'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs ${
                        isReminder
                          ? 'bg-gradient-to-tr from-amber-500 to-rose-500 text-white'
                          : 'bg-gradient-to-tr from-brand-500 to-indigo-600 text-white'
                      }`}
                    >
                      {isReminder ? (
                        <AlarmClock className="w-3.5 h-3.5" />
                      ) : (
                        n.sender?.name?.[0]?.toUpperCase() || (
                          <MessageSquare className="w-3.5 h-3.5" />
                        )
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                          {displayTitle}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {displayMessage}
                      </p>
                    </div>

                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

