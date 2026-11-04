import React, { useState, useEffect } from 'react';
import { Tag, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useCategories } from '../../context/CategoryContext.jsx';
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

export const EditCategoryModal = ({ isOpen, onClose, category }) => {
  const { updateCategory } = useCategories();
  const { t, lang } = useLanguage();

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setColor(category.color || PRESET_COLORS[0]);
      setError('');
    }
  }, [category, isOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim() || !category?._id) return;

    setSubmitting(true);
    setError('');

    const res = await updateCategory(category._id, {
      name: name.trim(),
      color,
    });

    setSubmitting(false);

    if (res.success) {
      onClose?.();
    } else {
      setError(res.message || (lang === 'fa' ? 'خطا در ویرایش دسته‌بندی' : 'Error updating category'));
    }
  };

  if (!isOpen || !category) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('editCategory') || (lang === 'fa' ? 'ویرایش دسته‌بندی' : 'Edit Category')}
      icon={Tag}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('categoryName') || (lang === 'fa' ? 'نام دسته‌بندی' : 'Category Name')} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={lang === 'fa' ? 'مثلاً فرانت‌اند، بازاریابی...' : 'e.g. Frontend, Marketing...'}
            className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            required
            autoFocus
          />
        </div>

        {/* Color Palette Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('categoryColor') || (lang === 'fa' ? 'رنگ دسته‌بندی' : 'Category Color')}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className="w-7 h-7 rounded-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
              >
                {color === c && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview */}
        <div className="p-3 rounded-xl glass-panel border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
          <span
            className="w-3.5 h-3.5 rounded-md shrink-0 shadow-2xs"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {name.trim() || (lang === 'fa' ? 'پیش‌نمایش دسته‌بندی' : 'Category Preview')}
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-95 transition-all shadow-md shadow-brand-500/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{t('save')}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

