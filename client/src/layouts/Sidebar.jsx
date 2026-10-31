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
  LogOut,
  X,
  Bell,
  Loader2,
  Tag,
  Send,
  UserX,
  UserMinus,
  Trash2,
} from 'lucide-react';
import { useCategories } from '../context/CategoryContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { Modal, ConfirmModal } from '../components/ui/index.js';
import { useLocation } from 'react-router-dom';

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
  const location = useLocation();

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [memberActionConfirm, setMemberActionConfirm] = useState(null);
  const [memberActionLoading, setMemberActionLoading] = useState(false);
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
                {(() => {
                  const isPersonalSelected = location.pathname === '/personal' || activeWorkspace === null;
                  return (
                    <button
                      onClick={() => {
                        switchWorkspace(null);
                        setWorkspaceMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-start transition-colors ${
                        isPersonalSelected
                          ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{t('personalSpace')}</span>
                      </div>
                      {isPersonalSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
                    </button>
                  );
                })()}

                {/* Team Workspaces */}
                {workspaces.map((org) => {
                  const orgId = org.id || org._id;
                  const isSelected = location.pathname === `/teams/${orgId}` || (activeWorkspace?.id || activeWorkspace?._id) === orgId;
                  return (
                    <button
                      key={orgId}
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
                    onClose?.();
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
            onClick={() => {
              onOpenNewTask();
              onClose?.();
            }}
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
                  onClick={() => {
                    onOpenCategoryManager();
                    onClose?.();
                  }}
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
                const catColor = cat.color || '#4F5AE4';
                return (
                  <button
                    key={cat._id}
                    onClick={() => {
                      onFilterChange(`cat:${cat._id}`);
                      onClose?.();
                    }}
                    style={{
                      borderColor: isActive ? catColor : 'transparent',
                      backgroundColor: isActive ? `${catColor}20` : undefined,
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                      isActive
                        ? 'shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-md shrink-0 shadow-2xs border border-white/40 dark:border-slate-800/40"
                        style={{ backgroundColor: catColor }}
                      />
                      <span
                        className="truncate"
                        style={{ color: isActive ? catColor : undefined }}
                      >
                        {cat.name}
                      </span>
                    </div>
                    {isActive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: catColor }}
                      />
                    )}
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
          {(activeWorkspace?.id || activeWorkspace?._id) && (
            <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between px-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('teamMembers')} ({members?.length || 0})
                </span>
                <div className="flex items-center gap-1">
                  {/* Pending Removal Requests button with badge */}
                  {['owner', 'manager'].includes(activeWorkspace?.role?.toLowerCase?.()) &&
                    Array.isArray(pendingRemovalRequests) &&
                    pendingRemovalRequests.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenRemovalRequests?.();
                          onClose?.();
                        }}
                        className="p-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 relative cursor-pointer"
                        title={`${t('pendingRemovalRequests')} (${pendingRemovalRequests.length})`}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span className="absolute -top-1 -end-1 w-3.5 h-3.5 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                          {pendingRemovalRequests.length}
                        </span>
                      </button>
                    )}
                  {['owner', 'manager'].includes(activeWorkspace?.role?.toLowerCase?.()) && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenInviteMember();
                        onClose?.();
                      }}
                      className="p-1 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 cursor-pointer"
                      title={t('addMemberBtn')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {Array.isArray(members) && members.length > 0 ? (
                  members.map((m, idx) => {
                    const memberId = m?.id || m?._id || m?.userId || idx;
                    const memberName = m?.name || m?.email?.split('@')[0] || 'Member';
                    const initial = (m?.name?.[0] || m?.email?.[0] || 'U').toUpperCase();
                    const userRole = activeWorkspace?.role?.toLowerCase?.();
                    const isSelf = String(memberId) === String(user?.id || user?._id);
                    const isOwner = userRole === 'owner';
                    const isManager = userRole === 'manager';
                    const targetIsOwner = m?.role === 'owner';
                    const targetIsManager = m?.role === 'manager';
                    const hasPending =
                      m?.removalRequest?.status === 'pending' ||
                      pendingRemovalRequests?.some(
                        (pr) => String(pr.member?.id || pr.member?.memberId) === String(memberId)
                      );

                    return (
                      <div
                        key={memberId}
                        className="group flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {initial}
                          </div>
                          <span className="text-xs truncate text-slate-700 dark:text-slate-300">
                            {memberName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {m?.role || 'member'}
                          </span>

                          {/* Member Removal Actions based on RBAC */}
                          {!isSelf && !targetIsOwner && (
                            <>
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMemberActionConfirm({
                                      type: 'direct_delete',
                                      memberId,
                                      memberName,
                                    })
                                  }
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all rounded cursor-pointer"
                                  title={t('removeMember')}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}

                              {isManager && !targetIsManager && (
                                <>
                                  {hasPending ? (
                                    <span
                                      className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium"
                                      title={t('requestPendingNotice')}
                                    >
                                      {t('pendingApproval')}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMemberActionConfirm({
                                          type: 'request_removal',
                                          memberId,
                                          memberName,
                                        })
                                      }
                                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-all rounded cursor-pointer"
                                      title={t('requestMemberRemoval')}
                                    >
                                      <UserMinus className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="px-3 py-1 text-[11px] text-slate-400">
                    {lang === 'fa' ? 'عضوی در این سازمان یافت نشد' : 'No team members yet'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: User Profile & Full-Width Logout */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2.5 shrink-0">
          {/* User Info Card */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate leading-tight text-slate-800 dark:text-slate-100">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">{user?.email}</p>
            </div>
          </div>

          {/* Full-Width Logout Button */}
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100/80 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/40 text-xs font-bold transition-all shadow-2xs"
            title={t('logout')}
          >
            <LogOut className={`w-3.5 h-3.5 transition-transform ${lang === 'fa' ? '-scale-x-100' : ''}`} />
            <span>{t('logout')}</span>
          </button>
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

      {/* Member Removal Confirmation Modal */}
      {memberActionConfirm && (
        <ConfirmModal
          isOpen={Boolean(memberActionConfirm)}
          onClose={() => setMemberActionConfirm(null)}
          title={
            memberActionConfirm.type === 'direct_delete'
              ? t('removeMember')
              : t('requestMemberRemoval')
          }
          description={
            memberActionConfirm.type === 'direct_delete'
              ? `${t('confirmRemoveMemberDirect')} (${memberActionConfirm.memberName})`
              : `${t('confirmRequestMemberRemoval')} (${memberActionConfirm.memberName})`
          }
          confirmText={
            memberActionConfirm.type === 'direct_delete'
              ? t('removeMember')
              : t('requestMemberRemoval')
          }
          cancelText={t('cancel')}
          variant={memberActionConfirm.type === 'direct_delete' ? 'danger' : 'warning'}
          icon={memberActionConfirm.type === 'direct_delete' ? Trash2 : UserMinus}
          loading={memberActionLoading}
          onConfirm={async () => {
            setMemberActionLoading(true);
            try {
              if (memberActionConfirm.type === 'direct_delete') {
                await removeMemberDirect(memberActionConfirm.memberId);
              } else {
                await requestMemberRemoval(memberActionConfirm.memberId);
              }
              setMemberActionConfirm(null);
            } catch (err) {
              alert(err.response?.data?.message || 'Action failed');
            } finally {
              setMemberActionLoading(false);
            }
          }}
        />
      )}
    </>
  );
};
