import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import {
  HeaderWorkspaceBrand,
  HeaderPriorityFilter,
  HeaderViewSwitcher,
  HeaderQuickActions,
  HeaderNotificationsMenu,
  HeaderMoreOptionsMenu,
} from './header/index.js';

export const TopHeader = ({
  onToggleSidebar,
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

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
      {/* Left: Mobile Menu & Workspace Info */}
      <HeaderWorkspaceBrand
        onToggleSidebar={onToggleSidebar}
        activeWorkspace={activeWorkspace}
        t={t}
      />

      {/* Right: Actions, Filters, Tools & Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0">
        {/* Quick Tools & Launcher */}
        <HeaderQuickActions
          onOpenCommandPalette={onOpenCommandPalette}
          onOpenTelegramSettings={onOpenTelegramSettings}
          onOpenCategoryManager={onOpenCategoryManager}
          onOpenImportExport={onOpenImportExport}
          isTelegramEnabled={Boolean(user?.telegramSettings?.enabled)}
          theme={theme}
          toggleTheme={toggleTheme}
          animating={animating}
          lang={lang}
          toggleLang={toggleLang}
          t={t}
        />

        {/* Priority Filter Popover */}
        <HeaderPriorityFilter
          priorityFilter={priorityFilter}
          onPriorityFilterChange={onPriorityFilterChange}
          isOpen={priorityMenuOpen}
          onToggleOpen={() => setPriorityMenuOpen(!priorityMenuOpen)}
          menuRef={priorityMenuRef}
          t={t}
        />

        {/* View Switcher: Kanban / List / Calendar */}
        <HeaderViewSwitcher
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          t={t}
        />

        {/* Options & Preferences Menu Popover (Mobile & Tablet) */}
        <HeaderMoreOptionsMenu
          isOpen={moreMenuOpen}
          onToggleOpen={() => setMoreMenuOpen(!moreMenuOpen)}
          menuRef={moreMenuRef}
          theme={theme}
          toggleTheme={toggleTheme}
          lang={lang}
          toggleLang={toggleLang}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          onOpenImportExport={onOpenImportExport}
          onOpenCategoryManager={onOpenCategoryManager}
          onOpenTelegramSettings={onOpenTelegramSettings}
          isTelegramEnabled={Boolean(user?.telegramSettings?.enabled)}
          t={t}
        />

        {/* In-App Notifications Bell & Floating Popover */}
        <HeaderNotificationsMenu
          notifications={notifications}
          unreadCount={unreadCount}
          isOpen={notificationsMenuOpen}
          onToggleOpen={() => setNotificationsMenuOpen(!notificationsMenuOpen)}
          menuRef={notificationsMenuRef}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          onOpenTaskDetail={onOpenTaskDetail}
          lang={lang}
          t={t}
        />

        {/* "+ New Task" Quick Button */}
        <button
          type="button"
          onClick={onOpenNewTask}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all shadow-md shadow-brand-500/25 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('newTask')}</span>
        </button>
      </div>
    </header>
  );
};
