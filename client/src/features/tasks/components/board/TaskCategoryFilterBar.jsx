import React from 'react';

export const TaskCategoryFilterBar = ({
  categories = [],
  selectedCategory = 'all',
  onSelectCategory,
  tasks = [],
  t,
}) => {
  if (categories.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onSelectCategory('all')}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
          selectedCategory === 'all'
            ? 'bg-brand-500 text-white shadow-xs font-bold'
            : 'glass-panel text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {t('allCategories')}
      </button>

      {categories.map((cat) => {
        const isSelected = selectedCategory === cat._id;
        const count = tasks.filter(
          (t) => (t.categoryId?._id || t.categoryId) === cat._id
        ).length;

        return (
          <button
            key={cat._id}
            onClick={() => onSelectCategory(isSelected ? 'all' : cat._id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
              isSelected
                ? 'shadow-xs text-white'
                : 'glass-panel text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
            style={{
              backgroundColor: isSelected ? cat.color : undefined,
              borderColor: isSelected ? cat.color : undefined,
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: isSelected ? '#ffffff' : cat.color }}
            />
            <span>{cat.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isSelected
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
