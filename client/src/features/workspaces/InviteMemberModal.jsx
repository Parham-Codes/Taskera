import React, { useState } from 'react';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Modal } from '../../components/ui/index.js';

export const InviteMemberModal = ({ isOpen, onClose }) => {
  const { activeWorkspace, inviteMember } = useWorkspace();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!activeWorkspace) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await inviteMember(email.trim().toLowerCase(), role);
      setSuccessMsg(t('memberAddedSuccess'));
      setEmail('');
      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('addMemberTitle')}
      icon={UserPlus}
      maxWidth="max-w-md"
    >
      {error && (
        <div className="mb-3 p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-3 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            {t('memberEmailLabel')}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('memberEmailPlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            {t('memberEmailHint')}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            {t('memberRoleLabel')} ({activeWorkspace.name})
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all cursor-pointer"
          >
            <option value="member">{t('roleMember')}</option>
            <option value="manager">{t('roleManager')}</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-md shadow-brand-500/25"
          >
            {loading ? t('saving') : t('addToWorkspaceBtn')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
