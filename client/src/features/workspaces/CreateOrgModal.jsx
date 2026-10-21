import React, { useState } from 'react';
import { Building2, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Modal } from '../../components/ui/index.js';

export const CreateOrgModal = ({ isOpen, onClose }) => {
  const { createOrganization } = useWorkspace();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('orgNameLabel'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createOrganization(name.trim(), description.trim());
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('createWorkspaceTitle')}
      icon={Building2}
      maxWidth="max-w-md"
    >
      {error && (
        <div className="mb-3 p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            {t('orgNameLabel')}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('orgNamePlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            {t('orgDescLabel')}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('orgDescPlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all resize-none"
          />
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
            {loading ? t('saving') : t('createWorkspaceBtn')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
