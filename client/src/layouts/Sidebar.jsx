import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  User,
  Building2,
  Plus,
  ChevronDown,
  Check,
  LayoutGrid,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Users,
  Sun,
  Moon,
  Languages,
  LogOut,
  X,
  Bell,
  Loader2,
  Tag,
  Send,
} from 'lucide-react';
import { useCategories } from '../context/CategoryContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { Modal } from '../components/ui/index.js';
import { TelegramIcon } from '../components/ui/TelegramIcon.jsx';

export const Sidebar = ({
  isOpen,
  onClose,
  activeFilter,
  onFilterChange,
  onOpenNewTask,
  onOpenCreateOrg,
  onOpenInviteMember,
  onOpenCategoryManager,
  onOpenTelegramSettings,
  taskCounts = {},
}) => {
  const { user, logout } = useAuth();
  const { activeWorkspace, workspaces, switchWorkspace, members } = useWorkspace();
  const { t, lang, toggleLang } = useLanguage();
  const { theme, toggleTheme, animating } = useTheme();
  const { unreadCount } = useNotifications();
  const { categories = [] } = useCategories();

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const workspaceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target)) {
        setWorkspaceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock background body scroll when mobile sidebar drawer is open (< 1024px)
  useEffect(() => {
    if (!isOpen) return;

    const handleLock = () => {
      if (window.innerWidth < 1024) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
      } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    };

    handleLock();
    window.addEventListener('resize', handleLock);

    return () => {
      window.removeEventListener('resize', handleLock);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  const navItems = [
    { id: 'all', label: t('allTasks'), icon: LayoutGrid, count: taskCounts.all || 0 },
    { id: 'in-progress', label: t('inProgressTasks'), icon: Clock, count: taskCounts.inProgress || 0 },
    { id: 'my-tasks', label: t('myTasks'), icon: UserCheck, count: taskCounts.myTasks || 0 },
    { id: 'due-soon', label: t('dueSoon'), icon: AlertTriangle, count: taskCounts.dueSoon || 0 },
    { id: 'completed', label: t('completedTasks'), icon: CheckCircle2, count: taskCounts.completed || 0 },
    { id: 'notifications', label: t('notifications'), icon: Bell, count: unreadCount || 0, isNotification: true },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 start-0 z-50 w-72 h-screen h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-contain bg-white dark:bg-slate-900 border-e border-slate-200/90 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 select-none ${
          isOpen
            ? 'translate-x-0'
            : lang === 'fa'
            ? 'translate-x-full lg:translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Section: Brand & Workspace Switcher */}
        <div className="p-4 space-y-4 border-b border-slate-200/60 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                {t('brandName')}
              </span>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Workspace Switcher */}
          <div className="relative" ref={workspaceRef}>
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-2xl glass-input hover:border-brand-500/40 transition-all text-xs font-semibold shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                {activeWorkspace ? (
                  <div className="w-6 h-6 rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="text-start truncate">
                  <p className="truncate leading-tight">
                    {activeWorkspace ? activeWorkspace.name : t('personalSpace')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-normal leading-tight">
                    {activeWorkspace ? `${activeWorkspace.role}` : t('soloMode')}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {workspaceMenuOpen && (
              <div className="absolute top-full start-0 end-0 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('workspaces')}
                </div>

                {/* Personal Space */}
                <button
                  onClick={() => {
                    switchWorkspace(null);
                    setWorkspaceMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-start transition-colors ${
                    activeWorkspace === null
                      ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t('personalSpace')}</span>
                  </div>
                  {activeWorkspace === null && <Check className="w-3.5 h-3.5 text-brand-500" />}
                </button>

                {/* Team Workspaces */}
                {workspaces.map((org) => {
                  const isSelected = activeWorkspace?.id === org.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchWorkspace(org);
                        setWorkspaceMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-start transition-colors ${
                        isSelected
                          ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        <span className="truncate">{org.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                    </button>
                  );
                })}

                <div className="my-1 border-t border-slate-200/60 dark:border-slate-800" />

                <button
                  onClick={() => {
                    setWorkspaceMenuOpen(false);
                    onOpenCreateOrg();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-brand-600 dark:text-brand-400 hover:bg-brand-50/70 dark:hover:bg-brand-950/30 transition-colors font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('newWorkspace')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Prominent Quick "+ New Task" Button */}
          <button
            onClick={onOpenNewTask}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all shadow-md shadow-brand-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newTask')}</span>
          </button>
        </div>

        {/* Middle Navigation Section */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-6">
          {/* Main Navigation Items */}
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
                  onClick={() => {
                    onFilterChange(item.id);
                    onClose?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition-all ${
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

          {/* Categories Section */}
          <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between px-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('categories')} ({categories.length})
              </span>
              {onOpenCategoryManager && (
                <button
                  onClick={onOpenCategoryManager}
                  className="p-1 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                  title={t('manageCategories')}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              {categories.map((cat) => {
                const isActive = activeFilter === `cat:${cat._id}`;
                return (
                  <button
                    key={cat._id}
                    onClick={() => {
                      onFilterChange(`cat:${cat._id}`);
                      onClose?.();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color || '#4F5AE4' }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </div>
                  </button>
                );
              })}

              {onOpenCategoryManager && (
                <button
                  onClick={() => {
                    onClose?.();
                    onOpenCategoryManager();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 border border-dashed border-brand-500/30 hover:border-brand-500/60 transition-all mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'fa' ? 'افزودن دسته‌بندی' : 'Add Category'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Team Members Section (only if inside Organization Workspace) */}
          {activeWorkspace?.id && (
            <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between px-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('teamMembers')} ({members.length})
                </span>
                {['owner', 'manager'].includes(activeWorkspace.role) && (
                  <button
                    onClick={onOpenInviteMember}
                    className="p-1 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                    title={t('addMemberBtn')}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {m.name[0].toUpperCase()}
                      </div>
                      <span className="text-xs truncate text-slate-700 dark:text-slate-300">
                        {m.name}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: User Profile & Quick Controls */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2 shrink-0">
          {/* Quick Controls: Theme & Language */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Languages className="w-3.5 h-3.5 text-brand-500" />
              <span>{lang === 'fa' ? 'EN' : 'فا'}</span>
            </button>

            {onOpenTelegramSettings && (
              <button
                onClick={onOpenTelegramSettings}
                className={`relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all ${
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

            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all ${
                animating ? 'animate-theme-toggle' : ''
              }`}
              title="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            <button
              onClick={() => setLogoutConfirmOpen(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              title={t('logout')}
            >
              <LogOut className={`w-4 h-4 transition-transform ${lang === 'fa' ? '-scale-x-100' : ''}`} />
            </button>
          </div>

          {/* User Info Card */}
          <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={logoutConfirmOpen}
        onClose={() => !loggingOut && setLogoutConfirmOpen(false)}
        title={t('confirmLogoutTitle')}
        icon={LogOut}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('confirmLogoutDesc')}
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => setLogoutConfirmOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await logout();
                } finally {
                  setLoggingOut(false);
                  setLogoutConfirmOpen(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all shadow-md shadow-red-600/25 disabled:opacity-50"
            >
              {loggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('loggingOut')}</span>
                </>
              ) : (
                <span>{t('confirmLogoutBtn')}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
