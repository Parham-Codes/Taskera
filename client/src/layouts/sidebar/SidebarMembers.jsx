import React from 'react';
import { Plus, UserX, Trash2, UserMinus, Eye } from 'lucide-react';

export const SidebarMembers = ({
  members = [],
  activeWorkspace,
  user,
  activeFilter,
  onFilterChange,
  pendingRemovalRequests = [],
  onOpenInviteMember,
  onOpenRemovalRequests,
  onConfirmMemberAction,
  onCloseSidebar,
  lang,
  t,
}) => {
  const userRole = activeWorkspace?.role?.toLowerCase?.();
  const isOwner = userRole === 'owner';
  const isManager = userRole === 'manager';

  return (
    <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
      <div className="flex items-center justify-between px-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {t('teamMembers')} ({members?.length || 0})
        </span>
        <div className="flex items-center gap-1">
          {/* Pending Removal Requests button with badge */}
          {['owner', 'manager'].includes(userRole) &&
            Array.isArray(pendingRemovalRequests) &&
            pendingRemovalRequests.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onOpenRemovalRequests?.();
                  onCloseSidebar?.();
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

          {['owner', 'manager'].includes(userRole) && (
            <button
              type="button"
              onClick={() => {
                onOpenInviteMember();
                onCloseSidebar?.();
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
            const isSelf = String(memberId) === String(user?.id || user?._id);
            const targetIsOwner = m?.role === 'owner';
            const targetIsManager = m?.role === 'manager';
            const hasPending =
              m?.removalRequest?.status === 'pending' ||
              pendingRemovalRequests?.some(
                (pr) => String(pr.member?.id || pr.member?.memberId) === String(memberId)
              );

            // RBAC: Who can view whose tasks?
            const canViewMemberTasks = isOwner || (isManager && !targetIsOwner);
            const isMemberFilterActive = activeFilter === `member:${memberId}`;

            return (
              <div
                key={memberId}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-xl transition-colors ${
                  isMemberFilterActive
                    ? 'bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/25'
                    : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <div
                  className={`flex items-center gap-2 min-w-0 flex-1 ${
                    canViewMemberTasks ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => {
                    if (!canViewMemberTasks) return;
                    onFilterChange(`member:${memberId}`);
                    onCloseSidebar?.();
                  }}
                  title={
                    canViewMemberTasks
                      ? lang === 'fa'
                        ? `مشاهده تسک‌های ${memberName}`
                        : `View ${memberName}'s tasks`
                      : undefined
                  }
                >
                  <div
                    className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isMemberFilterActive
                        ? 'bg-brand-500 text-white'
                        : 'bg-brand-500/20 text-brand-600 dark:text-brand-400'
                    }`}
                  >
                    {initial}
                  </div>
                  <span
                    className={`text-xs truncate ${
                      isMemberFilterActive
                        ? 'text-brand-600 dark:text-brand-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {memberName}
                  </span>
                  {canViewMemberTasks && (
                    <Eye
                      className={`w-3 h-3 shrink-0 transition-opacity ${
                        isMemberFilterActive
                          ? 'opacity-100 text-brand-500'
                          : 'opacity-0 group-hover:opacity-60 text-slate-400'
                      }`}
                    />
                  )}
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
                            onConfirmMemberAction?.({
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
                                onConfirmMemberAction?.({
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
  );
};

