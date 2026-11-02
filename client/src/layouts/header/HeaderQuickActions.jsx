import React from 'react';
import { Zap, Tag, Sparkles, Languages, Sun, Moon } from 'lucide-react';
import { TelegramIcon } from '../../components/ui/TelegramIcon.jsx';

export const HeaderQuickActions = ({
  onOpenCommandPalette,
  onOpenTelegramSettings,
  onOpenCategoryManager,
  onOpenImportExport,
  isTelegramEnabled = false,
  theme,
  toggleTheme,
  animating = false,
  lang,
  toggleLang,
  t,
}) => {
  return (
    <>
      {/* Desktop Quick Access Launcher (>= sm) */}
      <button
        onClick={onOpenCommandPalette}
        type="button"
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl glass-input text-slate-600 dark:text-slate-300 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400 transition-all text-start group shadow-2xs font-semibold cursor-pointer"
        title={lang === 'fa' ? 'دسترسی سریع (عملیات‌ها و فیلترها)' : 'Quick Access (Actions & Filters)'}
      >
        <Zap className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
        <span>{lang === 'fa' ? 'دسترسی سریع' : 'Quick Access'}</span>
        <span className="px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shrink-0">
          Ctrl K
        </span>
      </button>

      {/* Compact Quick Access Button (< sm) */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="sm:hidden p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:border-amber-500/40 transition-all shadow-2xs cursor-pointer"
        title={lang === 'fa' ? 'دسترسی سریع' : 'Quick Access'}
        aria-label="Quick Access"
      >
        <Zap className="w-4 h-4 text-amber-500" />
      </button>

      {/* Desktop Direct Quick Tool Buttons (Desktop lg+ >= 1024px) */}
      {onOpenTelegramSettings && (
        <button
          type="button"
          onClick={onOpenTelegramSettings}
          className={`relative hidden lg:flex p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-500/40 transition-all shadow-2xs cursor-pointer ${
            isTelegramEnabled ? 'text-blue-500 dark:text-blue-400' : ''
          }`}
          title={t('telegramSettingsTitle')}
        >
          <TelegramIcon className="w-4 h-4" />
          {isTelegramEnabled && (
            <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>
      )}

      {onOpenCategoryManager && (
        <button
          type="button"
          onClick={onOpenCategoryManager}
          className="hidden lg:flex p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 hover:border-brand-500/40 transition-all shadow-2xs cursor-pointer"
          title={t('manageCategories')}
        >
          <Tag className="w-4 h-4" />
        </button>
      )}

      {onOpenImportExport && (
        <button
          type="button"
          onClick={() => onOpenImportExport('import')}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 hover:border-brand-500/40 transition-all shadow-2xs group cursor-pointer"
          title={lang === 'fa' ? 'ورود و خروجی فایل‌های اکسل (Excel)، CSV و ساخت هوشمند با AI' : 'Import/Export Excel, CSV and AI Generation'}
        >
          <Sparkles className="w-4 h-4 text-brand-500 group-hover:rotate-12 transition-transform" />
          <span className="hidden xl:inline text-xs font-bold text-slate-700 dark:text-slate-200">
            {lang === 'fa' ? 'اکسل و AI' : 'Excel & AI'}
          </span>
        </button>
      )}

      {/* Desktop Preferences: Language & Theme Switcher (>= lg) */}
      <div className="hidden lg:flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 hover:border-brand-500/40 transition-all shadow-2xs font-semibold text-xs cursor-pointer"
          title={lang === 'fa' ? 'تغییر زبان به English' : 'Switch to Persian'}
          aria-label="Toggle language"
        >
          <Languages className="w-4 h-4 text-brand-500 shrink-0" />
          <span className="text-[11px] font-bold">{lang === 'fa' ? 'English' : 'فارسی'}</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className={`p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-500/40 transition-all shadow-2xs cursor-pointer ${
            animating ? 'animate-theme-toggle' : ''
          }`}
          title={theme === 'dark' ? (lang === 'fa' ? 'حالت روشن' : 'Light Mode') : (lang === 'fa' ? 'حالت تاریک' : 'Dark Mode')}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          )}
        </button>
      </div>
    </>
  );
};

