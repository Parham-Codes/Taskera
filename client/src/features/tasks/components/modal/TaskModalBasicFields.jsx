import React from 'react';

export const TaskModalBasicFields = ({
  title,
  setTitle,
  description,
  setDescription,
  t,
}) => {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
          {t('taskTitleLabel')}
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('taskTitlePlaceholder')}
          className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all text-slate-900 dark:text-white"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
          {t('descriptionLabel')}
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all resize-none text-slate-900 dark:text-white"
        />
      </div>
    </div>
  );
};

