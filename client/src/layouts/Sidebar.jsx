import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, X } from 'lucide-react';
import { useCategories } from '../context/CategoryContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import {
  SidebarWorkspaceSwitcher,
  SidebarNavItems,
  SidebarCategories,
  SidebarMembers,
  SidebarUserProfile,
  SidebarLogoutModal,
  SidebarMemberActionModal,
} from './sidebar/index.js';

export const Sidebar = ({
  isOpen,
  onClose,
  activeFilter,
  onFilterChange,
  onOpenNewTask,
  onOpenCreateOrg,
  onOpenInviteMember,
  onOpenCategoryManager,
  onOpenRemovalRequests,
  taskCounts = {},
}) => {
  const { user, logout } = useAuth();
  const {
    activeWorkspace,
    workspaces,
    switchWorkspace,
    members,
    pendingRemovalRequests,
    removeMemberDirect,
    requestMemberRemoval,
  } = useWorkspace();
  const { t, lang } = useLanguage();
  const { unreadCount } = useNotifications();
  const { categories = [] } = useCategories();

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [memberActionConfirm, setMemberActionConfirm] = useState(null);

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

  const hasActiveOrg = Boolean(activeWorkspace?.id || activeWorkspace?._id);

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
        {/* Top Section: Brand & Workspace Switcher & Quick Add Button */}
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
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Workspace Switcher */}
          <SidebarWorkspaceSwitcher
            activeWorkspace={activeWorkspace}
            workspaces={workspaces}
            switchWorkspace={switchWorkspace}
            onOpenCreateOrg={onOpenCreateOrg}
            onCloseSidebar={onClose}
            t={t}
          />

          {/* Prominent Quick "+ New Task" Button */}
          <button
            type="button"
            onClick={() => {
              onOpenNewTask();
              onClose?.();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all shadow-md shadow-brand-500/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newTask')}</span>
          </button>
        </div>

        {/* Middle Navigation Section */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-6">
          {/* Main Navigation Items */}
          <SidebarNavItems
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
            onCloseSidebar={onClose}
            taskCounts={taskCounts}
            unreadCount={unreadCount}
            t={t}
          />

          {/* Categories Section */}
          <SidebarCategories
            categories={categories}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
            onOpenCategoryManager={onOpenCategoryManager}
            onCloseSidebar={onClose}
            lang={lang}
            t={t}
          />

          {/* Team Members Section (only if inside Organization Workspace) */}
          {hasActiveOrg && (
            <SidebarMembers
              members={members}
              activeWorkspace={activeWorkspace}
              user={user}
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
              pendingRemovalRequests={pendingRemovalRequests}
              onOpenInviteMember={onOpenInviteMember}
              onOpenRemovalRequests={onOpenRemovalRequests}
              onConfirmMemberAction={setMemberActionConfirm}
              onCloseSidebar={onClose}
              lang={lang}
              t={t}
            />
          )}
        </div>

        {/* Bottom Section: User Profile & Full-Width Logout */}
        <SidebarUserProfile
          user={user}
          onOpenLogoutConfirm={() => setLogoutConfirmOpen(true)}
          lang={lang}
          t={t}
        />
      </aside>

      {/* Logout Confirmation Modal */}
      <SidebarLogoutModal
        isOpen={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onLogout={logout}
        t={t}
      />

      {/* Member Removal Confirmation Modal */}
      <SidebarMemberActionModal
        actionData={memberActionConfirm}
        onClose={() => setMemberActionConfirm(null)}
        onRemoveDirect={removeMemberDirect}
        onRequestRemoval={requestMemberRemoval}
        t={t}
      />
    </>
  );
};
