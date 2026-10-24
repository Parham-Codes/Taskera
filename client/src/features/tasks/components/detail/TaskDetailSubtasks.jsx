import React, { useState } from 'react';
import { CheckSquare, Check, Trash2, Plus } from 'lucide-react';

export const TaskDetailSubtasks = ({
  subtasks = [],
  onToggleSubtask,
  onDeleteSubtask,
  onAddSubtask,
  addingSubtask,
  t,
}) => {
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAdd = async () => {
    if (!newSubtaskInput.trim() || addingSubtask) return;
    const title = newSubtaskInput.trim();
    setNewSubtaskInput('');
    await onAddSubtask(title);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-800 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-brand-500" />
          <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
            {t('subtasks')}
          </h3>
        </div>

        {total > 0 && (
          <span className="text-[11px] font-bold text-slate-500">
            {completed} / {total} ({percent}%)
          </span>
        )}
      </div>

      {/* Subtask Progress bar */}
      {total > 0 && (
        <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              completed === total ? 'bg-emerald-500' : 'bg-brand-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {/* Subtasks List */}
      <div className="space-y-2 pt-1">
        {subtasks.map((st, idx) => (
          <div
            key={st._id || idx}
            className="flex items-center justify-between p-2.5 rounded-2xl glass-input hover:border-brand-500/30 transition-colors text-xs"
          >
            <button
              type="button"
              onClick={() => onToggleSubtask(st._id, idx)}
              className="flex items-center gap-2.5 text-start min-w-0 flex-1"
            >
              <div
                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                  st.completed
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'
                }`}
              >
                {st.completed && <Check className="w-3 h-3" />}
              </div>
              <span
                className={`font-medium truncate ${
                  st.completed
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {st.title}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onDeleteSubtask(st._id, idx)}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors ms-2"
              title={t('delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Add New Subtask Input inside modal */}
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={newSubtaskInput}
            onChange={(e) => setNewSubtaskInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={t('subtaskPlaceholder')}
            className="flex-1 px-3.5 py-2 text-xs rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newSubtaskInput.trim() || addingSubtask}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center gap-1 shrink-0 shadow-2xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('add')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
