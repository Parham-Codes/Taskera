import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { TaskCard } from '../../TaskCard.jsx';

export const TaskFocusedStackView = ({
  filteredTasks = [],
  statusColumns = [],
  priorityBadges = {},
  onOpenDetail,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenComments,
  onCategoryClick,
  formatDate,
  lang,
  t,
}) => {
  if (filteredTasks.length === 0) {
    return (
      <div className="w-full p-16 rounded-3xl glass-panel border border-slate-200/90 dark:border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <LayoutGrid className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {t('noTasksInWorkspace')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {filteredTasks.map((task) => (
        <TaskCard
          key={task._id}
          task={task}
          t={t}
          lang={lang}
          formatDate={formatDate}
          statusColumns={statusColumns}
          priorityBadges={priorityBadges}
          onOpenDetail={onOpenDetail}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onOpenComments={onOpenComments}
          onCategoryClick={onCategoryClick}
          fullWidth={true}
        />
      ))}
    </div>
  );
};
