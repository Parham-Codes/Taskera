import React from 'react';
import { Plus } from 'lucide-react';
import { TaskCard } from '../../TaskCard.jsx';

export const TaskKanbanBoard = ({
  statusColumns = [],
  filteredTasks = [],
  draggedTaskId,
  dragOverColumnId,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onOpenDetail,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenComments,
  onCategoryClick,
  onNewTask,
  priorityBadges,
  formatDate,
  lang,
  t,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      {statusColumns.map((column) => {
        const columnTasks = filteredTasks.filter((t) => t.status === column.id);
        const isTarget = dragOverColumnId === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => onDragOver(e, column.id)}
            onDragLeave={(e) => onDragLeave(e)}
            onDrop={(e) => onDrop(e, column.id)}
            className={`flex flex-col rounded-2xl transition-all duration-200 p-2.5 min-h-[460px] max-h-[72vh] xl:max-h-[75vh] ${
              isTarget
                ? 'ring-2 ring-brand-500/80 bg-brand-500/[0.09] dark:bg-brand-500/[0.14] border-brand-500/50 shadow-xl'
                : 'bg-slate-200/40 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/50'
            }`}
          >
            {/* Sleek Column Header */}
            <div className="flex items-center justify-between px-2 py-2 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${column.indicatorColor}`}
                />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {column.label}
                </h3>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {columnTasks.length}
                </span>
              </div>

              <button
                onClick={onNewTask}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                title={t('newTask')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cards Container with internal scroll when content overflows */}
            <div className="flex-1 space-y-2.5 p-1 pt-1 pb-2 overflow-y-auto">
              {columnTasks.length === 0 && !isTarget ? (
                <div className="h-28 rounded-xl border border-dashed border-slate-300/70 dark:border-slate-800/80 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <span>{t('noTasks')}</span>
                </div>
              ) : (
                columnTasks.map((task) => (
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
                    draggable={true}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    isDragging={draggedTaskId === task._id}
                  />
                ))
              )}

              {/* Animated Drop Target Indicator */}
              {isTarget && (
                <div className="h-14 rounded-2xl border-2 border-dashed border-brand-500/70 bg-brand-500/10 flex items-center justify-center gap-2 text-brand-600 dark:text-brand-400 text-xs font-bold animate-in fade-in zoom-in-95 duration-150">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
                  <span>
                    {lang === 'fa'
                      ? `انتقال به ${column.label}`
                      : `Drop here to move to ${column.label}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
