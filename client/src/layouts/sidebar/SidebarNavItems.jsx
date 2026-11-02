import React from 'react';
import {
  LayoutGrid,
  Clock,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Bell,
} from 'lucide-react';

export const SidebarNavItems = ({
  activeFilter,
  onFilterChange,
  onCloseSidebar,
  taskCounts = {},
  unreadCount = 0,
  t,
}) => {
  const navItems = [
    { id: 'all', label: t('allTasks'), icon: LayoutGrid, count: taskCounts.all || 0 },
    { id: 'in-progress', label: t('inProgressTasks'), icon: Clock, count: taskCounts.inProgress || 0 },
    { id: 'my-tasks', label: t('myTasks'), icon: UserCheck, count: taskCounts.myTasks || 0 },
    { id: 'due-soon', label: t('dueSoon'), icon: AlertTriangle, count: taskCounts.dueSoon || 0 },
    { id: 'completed', label: t('completedTasks'), icon: CheckCircle2, count: taskCounts.completed || 0 },
    { id: 'notifications', label: t('notifications'), icon: Bell, count: unreadCount || 0, isNotification: true },
  ];

  return (
    <div className="space-y-1">
      <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        {t('navigation')}
      </p>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeFilter === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onFilterChange(item.id);
              onCloseSidebar?.();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

