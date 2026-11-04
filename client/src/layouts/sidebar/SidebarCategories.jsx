import React, { useState } from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import { useContextMenu } from '../../components/contextMenu/index.js';
import { SidebarCategoryContextMenu } from './SidebarCategoryContextMenu.jsx';
import { EditCategoryModal } from '../../features/categories/EditCategoryModal.jsx';
import { useCategories } from '../../context/CategoryContext.jsx';
import { ConfirmModal } from '../../components/ui/index.js';

export const SidebarCategories = ({
  categories = [],
  activeFilter,
  onFilterChange,
  onOpenCategoryManager,
  onCloseSidebar,
  lang,
  t,
}) => {
  const categoryMenu = useContextMenu();
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteCategory } = useCategories();

  const handleFilterCategory = (catId) => {
    onFilterChange(`cat:${catId}`);
    onCloseSidebar?.();
    categoryMenu.close();
  };

  const handleEditCategory = (cat) => {
    categoryMenu.close();
    setEditingCategory(cat);
  };

  const handleRequestDelete = (cat) => {
    categoryMenu.close();
    setCategoryToDelete(cat);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      setIsDeleting(true);
      await deleteCategory(categoryToDelete._id);
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Failed to delete category:', err);
    } finally {
      setIsDeleting(false);
    }
  };

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
            <div
              key={cat._id}
              className="group/cat relative flex items-center"
              onContextMenu={(e) => categoryMenu.open(e, cat)}
              {...categoryMenu.bindLongPress(cat)}
            >
              <button
                type="button"
                onClick={() => {
                  onFilterChange(`cat:${cat._id}`);
                  onCloseSidebar?.();
                }}
                style={{
                  borderColor: isActive ? catColor : 'transparent',
                  backgroundColor: isActive ? `${catColor}20` : undefined,
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer select-none ${
                  isActive
                    ? 'shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-6 rtl:pr-0 rtl:pl-6">
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

              {/* 3-Dots Action button visible on hover/mobile */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  categoryMenu.open(e, cat);
                }}
                className="absolute end-1 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover/cat:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                title={t('actions') || 'Actions'}
                aria-label={t('actions') || 'Actions'}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
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

      {/* Category Context Menu */}
      {categoryMenu.isOpen && categoryMenu.data && (
        <SidebarCategoryContextMenu
          position={categoryMenu.position}
          category={categoryMenu.data}
          onClose={categoryMenu.close}
          onFilterCategory={handleFilterCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={() => handleRequestDelete(categoryMenu.data)}
          canManage={true}
          lang={lang}
          t={t}
        />
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <EditCategoryModal
          isOpen={Boolean(editingCategory)}
          onClose={() => setEditingCategory(null)}
          category={editingCategory}
        />
      )}

      {/* Modern Confirm Modal for Category Deletion */}
      <ConfirmModal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => !isDeleting && setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t('confirmDeleteCategoryTitle') || (lang === 'fa' ? 'حذف دسته‌بندی' : 'Delete Category')}
        description={
          t('confirmDeleteCategoryDesc') ||
          (lang === 'fa'
            ? `آیا از حذف دسته‌بندی «${categoryToDelete?.name || ''}» اطمینان دارید؟`
            : `Are you sure you want to delete "${categoryToDelete?.name || ''}"?`)
        }
        confirmText={t('confirmDeleteBtn') || (lang === 'fa' ? 'حذف' : 'Delete')}
        cancelText={t('cancel') || (lang === 'fa' ? 'انصراف' : 'Cancel')}
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};
