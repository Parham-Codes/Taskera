import React from 'react';
import { Menu } from 'lucide-react';

export const HeaderWorkspaceBrand = ({
  onToggleSidebar,
  activeWorkspace,
  t,
}) => {
  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="lg:hidden p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <h2 className="text-xs sm:text-sm md:text-base font-extrabold tracking-tight truncate text-slate-900 dark:text-white max-w-[120px] xs:max-w-[160px] sm:max-w-[220px] md:max-w-xs">
          {activeWorkspace ? activeWorkspace.name : t('personalSpace')}
        </h2>
        <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              activeWorkspace ? 'bg-brand-500' : 'bg-emerald-500'
            }`}
          />
          <span>{activeWorkspace ? t('teamSpace') : t('soloMode')}</span>
        </span>
      </div>
    </div>
  );
};

