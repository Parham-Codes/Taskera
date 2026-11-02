import React from 'react';
import { Plus } from 'lucide-react';

export const SidebarCategories = ({
  categories = [],
  activeFilter,
  onFilterChange,
  onOpenCategoryManager,
  onCloseSidebar,
  lang,
  t,
}) => {
  return (
    <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
      <div className="flex items-center justify-between px-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {t('categories')} ({categories.length})
        </span>
        {onOpenCategoryManager && (
          <button
            type="button"
            onClick={() => {
              onOpenCategoryManager();
              onCloseSidebar?.();
            }}
            className="p-1 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors cursor-pointer"
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
              type="button"
              onClick={() => {
                onFilterChange(`cat:${cat._id}`);
                onCloseSidebar?.();
              }}
              style={{
                borderColor: isActive ? catColor : 'transparent',
                backgroundColor: isActive ? `${catColor}20` : undefined,
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
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
            type="button"
            onClick={() => {
              onCloseSidebar?.();
              onOpenCategoryManager();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 border border-dashed border-brand-500/30 hover:border-brand-500/60 transition-all mt-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'fa' ? 'افزودن دسته‌بندی' : 'Add Category'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

