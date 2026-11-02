import React from 'react';
import {
  MoreHorizontal,
  Sun,
  Moon,
  Languages,
  LayoutGrid,
  List as ListIcon,
  Calendar,
  Sparkles,
  Tag,
} from 'lucide-react';
import { TelegramIcon } from '../../components/ui/TelegramIcon.jsx';

export const HeaderMoreOptionsMenu = ({
  isOpen,
  onToggleOpen,
  menuRef,
  theme,
  toggleTheme,
  lang,
  toggleLang,
  viewMode,
  onViewModeChange,
  onOpenImportExport,
  onOpenCategoryManager,
  onOpenTelegramSettings,
  isTelegramEnabled = false,
  t,
}) => {
  return (
    <div className="relative lg:hidden" ref={menuRef}>
      <button
        type="button"
        onClick={onToggleOpen}
        className={`p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 hover:border-brand-500/40 transition-all shadow-2xs cursor-pointer ${
          isOpen ? 'border-brand-500/50 text-brand-500 bg-brand-500/10' : ''
        }`}
        title={lang === 'fa' ? 'تنظیمات و ابزارها' : 'Options & Tools'}
        aria-label="More options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed sm:absolute top-16 sm:top-full inset-x-3 sm:inset-x-auto sm:end-0 mt-2 max-w-sm sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-2.5">
          {/* Theme & Language Section */}
          <div className="px-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {lang === 'fa' ? 'تنظیمات ظاهر و زبان' : 'Appearance & Language'}
          </div>

          <div className="space-y-1 p-1 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors text-start cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                )}
                <span>
                  {theme === 'dark'
                    ? lang === 'fa'
                      ? 'حالت روشن (Light)'
                      : 'Light Mode'
                    : lang === 'fa'
                    ? 'حالت تاریک (Dark)'
                    : 'Dark Mode'}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-500">
                {theme === 'dark' ? (lang === 'fa' ? 'تاریک' : 'Dark') : (lang === 'fa' ? 'روشن' : 'Light')}
              </span>
            </button>

            {/* Language Switch */}
            <button
              type="button"
              onClick={toggleLang}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors text-start cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Languages className="w-4 h-4 text-brand-500 shrink-0" />
                <span>
                  {lang === 'fa'
                    ? 'تغییر زبان به انگلیسی (English)'
                    : 'Switch to Persian (فارسی)'}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                {lang === 'fa' ? 'فارسی' : 'EN'}
              </span>
            </button>
          </div>

          {/* View Switcher inside Menu (Mobile only) */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {lang === 'fa' ? 'نمای تسک‌ها' : 'Task View Mode'}
              </span>
              <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold bg-brand-50 dark:bg-brand-950/60 px-1.5 py-0.5 rounded-md border border-brand-500/20">
                {viewMode === 'kanban'
                  ? t('boardView')
                  : viewMode === 'list'
                  ? t('listView')
                  : t('calendarView')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  onViewModeChange('kanban');
                  onToggleOpen();
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-brand-500 text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('boardView')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onViewModeChange('list');
                  onToggleOpen();
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-brand-500 text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ListIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('listView')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onViewModeChange('calendar');
                  onToggleOpen();
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-brand-500 text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('calendarView')}</span>
              </button>
            </div>
          </div>

          {/* Tools list */}
          <div className="space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-800">
            {onOpenImportExport && (
              <button
                type="button"
                onClick={() => {
                  onOpenImportExport('import');
                  onToggleOpen();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-start cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-brand-500 shrink-0" />
                <span>
                  {lang === 'fa'
                    ? 'ورود و خروجی اکسل / هوش مصنوعی'
                    : 'Excel & AI Import/Export'}
                </span>
              </button>
            )}

            {onOpenCategoryManager && (
              <button
                type="button"
                onClick={() => {
                  onOpenCategoryManager();
                  onToggleOpen();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-start cursor-pointer"
              >
                <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{t('manageCategories')}</span>
              </button>
            )}

            {onOpenTelegramSettings && (
              <button
                type="button"
                onClick={() => {
                  onOpenTelegramSettings();
                  onToggleOpen();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-start cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <TelegramIcon className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{t('telegramSettingsTitle')}</span>
                </div>
                {isTelegramEnabled && (
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

