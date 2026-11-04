import React, { useMemo } from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { ContextMenu } from '../../components/contextMenu/index.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

export const SidebarCategoryContextMenu = ({
  position,
  isOpen,
  x,
  y,
  onClose,
  category,
  onFilterCategory,
  onEditCategory,
  onDeleteCategory,
  canManage = true,
}) => {
  const { t, lang } = useLanguage();

  const items = useMemo(() => {
    if (!category) return [];

    const baseItems = [
      {
        id: 'view-category-tasks',
        label: t('viewCategoryTasks') || (lang === 'fa' ? 'مشاهده تسک‌های این دسته‌بندی' : 'View Category Tasks'),
        icon: Eye,
        onClick: () => onFilterCategory?.(category._id),
      },
    ];

    if (canManage) {
      baseItems.push(
        { type: 'separator' },
        {
          id: 'edit-category',
          label: t('editCategory') || (lang === 'fa' ? 'ویرایش دسته‌بندی' : 'Edit Category'),
          icon: Edit2,
          onClick: () => onEditCategory?.(category),
        },
        {
          id: 'delete-category',
          label: t('deleteCategory') || (lang === 'fa' ? 'حذف دسته‌بندی' : 'Delete Category'),
          icon: Trash2,
          danger: true,
          onClick: () => onDeleteCategory?.(category._id),
        }
      );
    }

    return baseItems;
  }, [category, canManage, onFilterCategory, onEditCategory, onDeleteCategory, lang, t]);

  const finalX = position ? position.x : x;
  const finalY = position ? position.y : y;

  return (
    <ContextMenu
      isOpen={isOpen !== undefined ? isOpen : Boolean(position)}
      x={finalX}
      y={finalY}
      onClose={onClose}
      items={items}
      title={category?.name}
      minWidth={210}
    />
  );
};
