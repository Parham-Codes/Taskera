import React from 'react';
import { Tag, Flag } from 'lucide-react';

export const TaskModalMetaFields = ({
  categoryId,
  setCategoryId,
  categories = [],
  priority,
  setPriority,
  onOpenCategoryManager,
  t,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Category Dropdown */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
            {t('category')}
          </label>
          {onOpenCategoryManager && (
            <button
              type="button"
              onClick={onOpenCategoryManager}
              className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
            >
              + {t('newCategory')}
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all appearance-none cursor-pointer text-slate-900 dark:text-white"
          >
            <option value="">{t('noCategory')}</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <Tag className="w-4 h-4 text-brand-500 dark:text-brand-400 absolute end-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Priority Dropdown */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
          {t('priority')}
        </label>
        <div className="relative">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all appearance-none cursor-pointer text-slate-900 dark:text-white"
          >
            <option value="low">{t('lowPriority')}</option>
            <option value="medium">{t('mediumPriority')}</option>
            <option value="high">{t('highPriority')}</option>
            <option value="urgent">{t('urgentPriority')}</option>
          </select>
          <Flag className="w-4 h-4 text-slate-400 absolute end-3 top-3 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

