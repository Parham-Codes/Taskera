import React, { useMemo } from 'react';
import { Plus, Filter } from 'lucide-react';
import { ContextMenu } from '../../../../components/contextMenu/index.js';
import { useLanguage } from '../../../../context/LanguageContext.jsx';

export const KanbanColumnContextMenu = ({
  position,
  isOpen,
  x,
  y,
  onClose,
  column,
  columnId,
  columnTitle,
  onCreateTask,
  onNewTaskInColumn,
  onFilterByStatus,
}) => {
  const { t, lang } = useLanguage();
  const targetId = column?.id || columnId;
  const targetTitle = column?.label || columnTitle;

  const items = useMemo(() => {
    if (!targetId) return [];

    return [
      {
        id: 'new-task-in-column',
        label: `${t('newTask') || (lang === 'fa' ? 'تسک جدید' : 'New Task')} (${targetTitle || targetId})`,
        icon: Plus,
        onClick: () => {
          if (onCreateTask) onCreateTask(targetId);
          else if (onNewTaskInColumn) onNewTaskInColumn(targetId);
        },
      },
      {
        id: 'filter-column-status',
        label: t('filterByThisStatus') || (lang === 'fa' ? 'نمایش فقط تسک‌های این وضعیت' : 'Filter by this status'),
        icon: Filter,
        onClick: () => onFilterByStatus?.(targetId),
      },
    ];
  }, [targetId, targetTitle, onCreateTask, onNewTaskInColumn, onFilterByStatus, lang, t]);

  const finalX = position ? position.x : x;
  const finalY = position ? position.y : y;

  return (
    <ContextMenu
      isOpen={isOpen !== undefined ? isOpen : Boolean(position)}
      x={finalX}
      y={finalY}
      onClose={onClose}
      items={items}
      title={targetTitle}
      minWidth={210}
    />
  );
};
