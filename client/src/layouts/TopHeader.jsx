import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  LayoutGrid,
  List as ListIcon,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Check,
  X,
  Bell,
  CheckCheck,
  MessageSquare,
  Sparkles,
  Tag,
  Calendar,
  MoreHorizontal,
  AlarmClock,
  Zap,
  Sun,
  Moon,
  Languages,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { TelegramIcon } from '../components/ui/TelegramIcon.jsx';

export const TopHeader = ({
  onToggleSidebar,
  search,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  viewMode,
  onViewModeChange,
  onOpenNewTask,
  onOpenTaskDetail,
  onOpenCommandPalette,
  onOpenCategoryManager,
  onOpenImportExport,
  onOpenTelegramSettings,
}) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { t, lang, toggleLang } = useLanguage();
  const { theme, toggleTheme, animating } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [notificationsMenuOpen, setNotificationsMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const priorityMenuRef = useRef(null);
  const notificationsMenuRef = useRef(null);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(e.target)) {
        setPriorityMenuOpen(false);
      }
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(e.target)) {
        setNotificationsMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };

    const handleScroll = (e) => {
      const target = e.target;
      // If the scroll event originated inside any of the open menus, do NOT close them!
      if (target instanceof Element) {
        if (notificationsMenuRef.current?.contains(target)) return;
        if (priorityMenuRef.current?.contains(target)) return;
        if (moreMenuRef.current?.contains(target)) return;
      }

      setPriorityMenuOpen(false);
      setNotificationsMenuOpen(false);
      setMoreMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  const priorityOptions = [
    { id: 'all', label: t('allPriorities'), dotColor: 'bg-slate-400' },
    { id: 'urgent', label: t('urgent'), dotColor: 'bg-red-500' },
    { id: 'high', label: t('high'), dotColor: 'bg-orange-500' },
    { id: 'medium', label: t('medium'), dotColor: 'bg-blue-500' },
    { id: 'low', label: t('low'), dotColor: 'bg-slate-400' },
  ];

  const currentPriorityOption =
    priorityOptions.find((p) => p.id === priorityFilter) || priorityOptions[0];

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
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
      {/* Left: Mobile Menu & Workspace Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
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
            {activeWorkspace ? activeWorkspace.role : t('soloMode')}
          </span>
        </div>
      </div>

      {/* Right: Search, Actions, View Switcher, and User Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0">
        {/* Desktop Quick Access Launcher (>= sm) */}
        <button
          onClick={onOpenCommandPalette}
          type="button"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl glass-input text-slate-600 dark:text-slate-300 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400 transition-all text-start group shadow-2xs font-semibold"
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
          onClick={onOpenCommandPalette}
          className="sm:hidden p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:border-amber-500/40 transition-all shadow-2xs"
          title={lang === 'fa' ? 'دسترسی سریع' : 'Quick Access'}
          aria-label="Quick Access"
        >
          <Zap className="w-4 h-4 text-amber-500" />
        </button>

        {/* Desktop Direct Quick Tool Buttons (Desktop lg+ >= 1024px) */}
        {onOpenTelegramSettings && (
          <button
            onClick={onOpenTelegramSettings}
            className={`relative hidden lg:flex p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-500/40 transition-all shadow-2xs ${
              user?.telegramSettings?.enabled ? 'text-blue-500 dark:text-blue-400' : ''
            }`}
            title={t('telegramSettingsTitle')}
          >
            <TelegramIcon className="w-4 h-4" />
            {user?.telegramSettings?.enabled && (
              <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>
        )}

        {onOpenCategoryManager && (
          <button
            onClick={onOpenCategoryManager}
            className="hidden lg:flex p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 hover:border-brand-500/40 transition-all shadow-2xs"
            title={t('manageCategories')}
          >
            <Tag className="w-4 h-4" />
          </button>
        )}

        {onOpenImportExport && (
          <button
            onClick={() => onOpenImportExport('import')}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 hover:border-brand-500/40 transition-all shadow-2xs group"
            title={lang === 'fa' ? 'ورود و خروجی فایل‌های اکسل (Excel)، CSV و ساخت هوشمند با AI' : 'Import/Export Excel, CSV and AI Generation'}
          >
            <Sparkles className="w-4 h-4 text-brand-500 group-hover:rotate-12 transition-transform" />
            <span className="hidden xl:inline text-xs font-bold text-slate-700 dark:text-slate-200">
              {lang === 'fa' ? 'اکسل و AI' : 'Excel & AI'}
            </span>
          </button>
        )}

        {/* Priority Filter Popover */}
        <div className="relative" ref={priorityMenuRef}>
          <button
            onClick={() => setPriorityMenuOpen(!priorityMenuOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs rounded-xl glass-input hover:border-brand-500/40 transition-all font-semibold text-slate-700 dark:text-slate-300 shadow-xs"
            title={t('priority')}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${currentPriorityOption.dotColor}`} />
              {currentPriorityOption.label}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* Floating Priority Dropdown */}
          {priorityMenuOpen && (
            <div className="absolute top-full end-0 mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('priority')}
              </div>
              {priorityOptions.map((opt) => {
                const isSelected = priorityFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onPriorityFilterChange(opt.id);
                      setPriorityMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-start transition-colors ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* View Switcher: Kanban / List / Calendar (Hidden on tiny mobile < sm, accessible via More Menu) */}
        <div className="hidden sm:flex items-center glass-panel p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => onViewModeChange('kanban')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'kanban'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title={t('boardView')}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title={t('listView')}
          >
            <ListIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('calendar')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title={t('calendarView')}
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Options & Preferences Menu Popover (Mobile & Tablet only: hidden on desktop/laptop >= lg) */}
        <div className="relative lg:hidden" ref={moreMenuRef}>
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 hover:border-brand-500/40 transition-all shadow-2xs ${
              moreMenuOpen ? 'border-brand-500/50 text-brand-500 bg-brand-500/10' : ''
            }`}
            title={lang === 'fa' ? 'تنظیمات و ابزارها' : 'Options & Tools'}
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {moreMenuOpen && (
            <div className="fixed sm:absolute top-16 sm:top-full inset-x-3 sm:inset-x-auto sm:end-0 mt-2 max-w-sm sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-2.5">
              {/* Theme & Language Section */}
              <div className="px-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {lang === 'fa' ? 'تنظیمات ظاهر و زبان' : 'Appearance & Language'}
              </div>

              <div className="space-y-1 p-1 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors text-start"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                    )}
                    <span>{theme === 'dark' ? (lang === 'fa' ? 'حالت روشن (Light)' : 'Light Mode') : (lang === 'fa' ? 'حالت تاریک (Dark)' : 'Dark Mode')}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-500">
                    {theme === 'dark' ? (lang === 'fa' ? 'تاریک' : 'Dark') : (lang === 'fa' ? 'روشن' : 'Light')}
                  </span>
                </button>

                {/* Language Switch */}
                <button
                  type="button"
                  onClick={() => {
                    toggleLang();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors text-start"
                >
                  <div className="flex items-center gap-2.5">
                    <Languages className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>{lang === 'fa' ? 'تغییر زبان به انگلیسی (English)' : 'Switch to Persian (فارسی)'}</span>
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
                    {viewMode === 'kanban' ? t('boardView') : viewMode === 'list' ? t('listView') : t('calendarView')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      onViewModeChange('kanban');
                      setMoreMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-bold transition-all ${
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
                      setMoreMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-bold transition-all ${
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
                      setMoreMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[11px] font-bold transition-all ${
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
                    onClick={() => {
                      onOpenImportExport('import');
                      setMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-start"
                  >
                    <Sparkles className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>{lang === 'fa' ? 'ورود و خروجی اکسل / هوش مصنوعی' : 'Excel & AI Import/Export'}</span>
                  </button>
                )}

                {onOpenCategoryManager && (
                  <button
                    onClick={() => {
                      onOpenCategoryManager();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-start"
                  >
                    <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{t('manageCategories')}</span>
                  </button>
                )}

                {onOpenTelegramSettings && (
                  <button
                    onClick={() => {
                      onOpenTelegramSettings();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-start"
                  >
                    <div className="flex items-center gap-2.5">
                      <TelegramIcon className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>{t('telegramSettingsTitle')}</span>
                    </div>
                    {user?.telegramSettings?.enabled && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Preferences: Language & Theme Switcher (>= lg) */}
        <div className="hidden lg:flex items-center gap-1.5">
          {/* Language Switch */}
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 hover:border-brand-500/40 transition-all shadow-2xs font-semibold text-xs"
            title={lang === 'fa' ? 'تغییر زبان به English' : 'Switch to Persian'}
            aria-label="Toggle language"
          >
            <Languages className="w-4 h-4 text-brand-500 shrink-0" />
            <span className="text-[11px] font-bold">{lang === 'fa' ? 'English' : 'فارسی'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl glass-panel text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-500/40 transition-all shadow-2xs ${
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

        {/* In-App Notifications Bell & Floating Popover */}
        <div className="relative" ref={notificationsMenuRef}>
          <button
            onClick={() => setNotificationsMenuOpen(!notificationsMenuOpen)}
            className="p-2 rounded-xl glass-input hover:border-brand-500/40 text-slate-600 dark:text-slate-300 transition-all relative"
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

          {/* Floating Notifications Center (Responsive width for mobile & tablet) */}
          {notificationsMenuOpen && (
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
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
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
                          markAsRead(n._id);
                          if (n.taskId?._id || n.taskId) {
                            onOpenTaskDetail?.(n.taskId?._id || n.taskId);
                            setNotificationsMenuOpen(false);
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

        {/* "+ New Task" Quick Button */}
        <button
          onClick={onOpenNewTask}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all shadow-md shadow-brand-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('newTask')}</span>
        </button>
      </div>
    </header>
  );
};
