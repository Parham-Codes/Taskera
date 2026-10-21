import React, { useState } from 'react';
import { Tag, Plus, Trash2, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useCategories } from '../../context/CategoryContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Modal } from '../../components/ui/index.js';

const PRESET_COLORS = [
  '#4F5AE4', // Brand Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#F43F5E', // Rose
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple
  '#D946EF', // Fuchsia
  '#64748B', // Slate
];

export const CategoryManagerModal = ({ isOpen, onClose }) => {
  const { categories, loading, createCategory, deleteCategory } = useCategories();
  const { activeWorkspace } = useWorkspace();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError('');

    const res = await createCategory(name.trim(), selectedColor);
    setSubmitting(false);

    if (res.success) {
      setName('');
    } else {
      setError(res.message || 'Error creating category');
    }
  };

  const handleDelete = async (catId) => {
    const res = await deleteCategory(catId);
    if (!res.success) {
      setError(res.message || 'Error deleting category');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('manageCategories')}
      icon={Tag}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Workspace Scope Header Notice */}
        <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-700 dark:text-brand-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-500" />
            <span className="font-semibold">
              {activeWorkspace ? activeWorkspace.name : t('personalSpace')}
            </span>
          </div>
          <span className="text-[11px] opacity-75">
            {categories.length} {t('categories')}
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Create Category Form */}
        <form onSubmit={handleCreate} className="space-y-3 p-4 rounded-2xl glass-input">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {t('newCategory')}
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('categoryName')}
              maxLength={50}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{t('addCategory')}</span>
            </button>
          </div>

          {/* Color Palette Picker */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400 me-1">{t('categoryColor')}:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                    selectedColor === c
                      ? 'ring-2 ring-offset-2 ring-brand-500 dark:ring-offset-slate-900 scale-110 shadow-sm'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                >
                  {selectedColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Categories List */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500">{t('categories')}</p>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              {t('noCategories')}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pe-1 divide-y divide-slate-200/50 dark:divide-slate-800/60">
              {categories.map((cat) => (
                <div
                  key={cat._id}
                  className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: cat.color || '#4F5AE4' }}
                    />
                    <span
                      className="px-2.5 py-0.5 rounded-full font-bold text-xs"
                      style={{
                        backgroundColor: `${cat.color || '#4F5AE4'}20`,
                        color: cat.color || '#4F5AE4',
                      }}
                    >
                      {cat.name}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(cat._id)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    title={t('delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
