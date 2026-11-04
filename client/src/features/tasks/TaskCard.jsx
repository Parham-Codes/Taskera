import React from 'react';
import { TaskCardFullWidth } from './components/card/TaskCardFullWidth.jsx';
import { TaskCardCompact } from './components/card/TaskCardCompact.jsx';
import {
  isTaskOverdue,
  PRIORITY_BORDER_COLORS,
} from './utils/taskHelpers.js';

export const TaskCard = ({
  task,
  t,
  lang,
  formatDate,
  statusColumns,
  priorityBadges,
  onOpenDetail,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenComments,
  fullWidth = false,
  draggable = true,
  onDragStart,
  onDragEnd,
  isDragging = false,
  onCategoryClick,
  onTaskContextMenu,
}) => {
  const priorityInfo = priorityBadges[task.priority] || priorityBadges.medium;
  const isOverdue = isTaskOverdue(task.dueDate, task.status);
  const hasRunningTimer = task.timeLogs?.some((l) => !l.endTime);
  const borderClass =
    PRIORITY_BORDER_COLORS[task.priority] || 'border-s-blue-500';

  if (fullWidth) {
    return (
      <TaskCardFullWidth
        task={task}
        borderClass={borderClass}
        priorityInfo={priorityInfo}
        isOverdue={isOverdue}
        hasRunningTimer={hasRunningTimer}
        statusColumns={statusColumns}
        formatDate={formatDate}
        onOpenDetail={onOpenDetail}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        onOpenComments={onOpenComments}
        onCategoryClick={onCategoryClick}
        onTaskContextMenu={onTaskContextMenu}
        lang={lang}
        t={t}
      />
    );
  }

  return (
    <TaskCardCompact
      task={task}
      borderClass={borderClass}
      priorityInfo={priorityInfo}
      isOverdue={isOverdue}
      hasRunningTimer={hasRunningTimer}
      statusColumns={statusColumns}
      formatDate={formatDate}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      isDragging={isDragging}
      onOpenDetail={onOpenDetail}
      onEdit={onEdit}
      onDelete={onDelete}
      onStatusChange={onStatusChange}
      onOpenComments={onOpenComments}
      onCategoryClick={onCategoryClick}
      onTaskContextMenu={onTaskContextMenu}
      lang={lang}
      t={t}
    />
  );
};
