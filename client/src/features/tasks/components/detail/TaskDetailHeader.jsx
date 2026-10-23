import React from 'react';

export const TaskDetailHeader = ({
  task,
  t,
  onStatusChange,
}) => {
  const statusOptions = [
    { id: 'todo', label: t('todo') },
    { id: 'in-progress', label: t('inProgress') },
    { id: 'review', label: t('review') },
    { id: 'completed', label: t('completed') },
  ];

  return (
    <div className="space-y-3 pb-4 border-b border-slate-200/60 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
          {task.title}
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          {task.categoryId && (
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1.5"
              style={{
                backgroundColor: `${task.categoryId.color || '#4F5AE4'}18`,
                borderColor: `${task.categoryId.color || '#4F5AE4'}35`,
                color: task.categoryId.color || '#4F5AE4',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: task.categoryId.color || '#4F5AE4' }}
              />
              <span>{task.categoryId.name}</span>
            </span>
          )}

          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              task.priority === 'urgent'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                : task.priority === 'high'
                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
                : task.priority === 'medium'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
            }`}
          >
            {t(task.priority)}
          </span>
        </div>
      </div>

      {/* Quick Status Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {statusOptions.map((st) => (
          <button
            key={st.id}
            onClick={() => onStatusChange(st.id)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              task.status === st.id
                ? 'bg-brand-500 text-white shadow-xs'
                : 'glass-input text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {task.description && (
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line pt-2">
          {task.description}
        </p>
      )}
    </div>
  );
};
