import React, { useState } from 'react';
import { UserX, Check, X, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Modal } from '../../components/ui/index.js';

export const MemberRemovalRequestsModal = ({ isOpen, onClose, targetRequestId = null }) => {
  const {
    activeWorkspace,
    pendingRemovalRequests,
    approveMemberRemoval,
    rejectMemberRemoval,
  } = useWorkspace();
  const { lang, t } = useLanguage();

  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve' | 'reject', requestId, memberId, memberName }

  if (!isOpen || !activeWorkspace) return null;

  const handleApprove = async (memberId, requestId) => {
    setProcessingId(requestId);
    setError('');
    setSuccessMsg('');
    try {
      await approveMemberRemoval(memberId, requestId);
      setSuccessMsg(t('removalRequestApproved'));
      setConfirmAction(null);
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve removal request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (memberId, requestId) => {
    setProcessingId(requestId);
    setError('');
    setSuccessMsg('');
    try {
      await rejectMemberRemoval(memberId, requestId);
      setSuccessMsg(t('removalRequestRejected'));
      setConfirmAction(null);
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject removal request');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('pendingRemovalRequests')}
      icon={UserX}
      maxWidth="max-w-lg"
    >
      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Confirmation Banner for Action */}
      {confirmAction && (
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs space-y-2.5 animate-fadeIn">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              {confirmAction.type === 'approve'
                ? t('confirmApproveRemoval')
                : t('confirmRejectRemoval')}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300">
            {t('targetMemberLabel')} <strong>{confirmAction.memberName}</strong>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={Boolean(processingId)}
              onClick={() => {
                if (confirmAction.type === 'approve') {
                  handleApprove(confirmAction.memberId, confirmAction.requestId);
                } else {
                  handleReject(confirmAction.memberId, confirmAction.requestId);
                }
              }}
              className={`py-1.5 px-3 rounded-xl font-bold text-white text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                confirmAction.type === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {processingId
                ? t('loading')
                : confirmAction.type === 'approve'
                ? t('approve')
                : t('reject')}
            </button>
            <button
              type="button"
              disabled={Boolean(processingId)}
              onClick={() => setConfirmAction(null)}
              className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pe-1">
        {Array.isArray(pendingRemovalRequests) && pendingRemovalRequests.length > 0 ? (
          pendingRemovalRequests.map((req) => {
            const isTarget = targetRequestId && req.requestId === targetRequestId;
            const targetMemberId = req.member?.id || req.member?.memberId;
            const targetName = req.member?.name || 'Member';
            const requesterName = req.requestedBy?.name || 'Manager';
            const dateStr = req.requestedAt
              ? new Date(req.requestedAt).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US')
              : '';

            return (
              <div
                key={req.requestId}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isTarget
                    ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-950/20 shadow-md shadow-brand-500/10 ring-1 ring-brand-500/40'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center shrink-0">
                      {targetName[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {targetName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {req.member?.email}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                    {t('pendingApproval')}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 py-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span>{t('requestedByLabel')}</span>
                    <strong className="text-slate-700 dark:text-slate-200">{requesterName}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 font-sans">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{dateStr}</span>
                    </span>
                    <span title={req.requestId}>ID: {req.requestId.slice(-6)}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                {!confirmAction && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      disabled={Boolean(processingId)}
                      onClick={() =>
                        setConfirmAction({
                          type: 'approve',
                          requestId: req.requestId,
                          memberId: targetMemberId,
                          memberName: targetName,
                        })
                      }
                      className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('approve')}</span>
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(processingId)}
                      onClick={() =>
                        setConfirmAction({
                          type: 'reject',
                          requestId: req.requestId,
                          memberId: targetMemberId,
                          memberName: targetName,
                        })
                      }
                      className="py-1.5 px-3 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t('reject')}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            {t('noPendingRemovalRequests')}
          </div>
        )}
      </div>
    </Modal>
  );
};
