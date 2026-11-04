import React, { useMemo } from 'react';
import { CalendarPlus } from 'lucide-react';
import { ContextMenu } from '../../../../components/contextMenu/index.js';
import { useLanguage } from '../../../../context/LanguageContext.jsx';

export const CalendarDayContextMenu = ({
  position,
  isOpen,
  x,
  y,
  onClose,
  dayData,
  dateKey,
  onCreateTask,
  onNewTaskOnDate,
}) => {
  const { t, lang } = useLanguage();
  const targetDateKey = typeof dayData === 'string'
    ? dayData
    : dayData?.dateKey || dateKey;

  const items = useMemo(() => {
    if (!targetDateKey) return [];

    return [
      {
        id: 'new-task-on-date',
        label: t('addTaskOnDate') || (lang === 'fa' ? 'ایجاد تسک برای این تاریخ' : 'Create Task for this date'),
        icon: CalendarPlus,
        onClick: () => {
          if (onCreateTask) onCreateTask(targetDateKey);
          else if (onNewTaskOnDate) onNewTaskOnDate(targetDateKey);
        },
      },
    ];
  }, [targetDateKey, onCreateTask, onNewTaskOnDate, lang, t]);

  const finalX = position ? position.x : x;
  const finalY = position ? position.y : y;

  return (
    <ContextMenu
      isOpen={isOpen !== undefined ? isOpen : Boolean(position)}
      x={finalX}
      y={finalY}
      onClose={onClose}
      items={items}
      title={targetDateKey}
      minWidth={200}
    />
  );
};
