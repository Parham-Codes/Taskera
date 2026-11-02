import React from 'react';
import { LogOut } from 'lucide-react';

export const SidebarUserProfile = ({
  user,
  onOpenLogoutConfirm,
  lang,
  t,
}) => {
  return (
    <div className="p-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2.5 shrink-0">
      {/* User Info Card */}
      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {user?.name ? user.name[0].toUpperCase() : 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate leading-tight text-slate-800 dark:text-slate-100">
            {user?.name}
          </p>
          <p className="text-[10px] text-slate-400 truncate leading-tight">
            {user?.email}
          </p>
        </div>
      </div>

      {/* Full-Width Logout Button */}
      <button
        type="button"
        onClick={onOpenLogoutConfirm}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100/80 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/40 text-xs font-bold transition-all shadow-2xs cursor-pointer"
        title={t('logout')}
      >
        <LogOut
          className={`w-3.5 h-3.5 transition-transform ${
            lang === 'fa' ? '-scale-x-100' : ''
          }`}
        />
        <span>{t('logout')}</span>
      </button>
    </div>
  );
};

