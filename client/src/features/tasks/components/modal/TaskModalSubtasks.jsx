import React, { useState } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';

export const TaskModalSubtasks = ({
  subtasks = [],
  setSubtasks,
  t,
}) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      { title: newSubtaskTitle.trim(), completed: false },
    ]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (index) => {
    setSubtasks((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteSubtask = (index) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {t('subtasks')} {subtasks.length > 0 && `(${subtasks.length})`}
        </label>
      </div>

      {/* Add Subtask Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddSubtask();
            }
          }}
          placeholder={t('subtaskPlaceholder')}
          className="flex-1 px-3.5 py-2 text-xs rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white"
        />
        <button
          type="button"
          onClick={handleAddSubtask}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600 transition-colors flex items-center gap-1 shrink-0 active:scale-95 shadow-2xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('add') || 'افزودن'}</span>
        </button>
      </div>

      {/* Subtasks List */}
      {subtasks.length > 0 && (
        <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1 pe-1">
          {subtasks.map((st, idx) => (
            <div
              key={st._id || idx}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => handleToggleSubtask(idx)}
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                    st.completed
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {st.completed && <Check className="w-3 h-3" />}
                </button>
                <span
                  className={`truncate ${
                    st.completed
                      ? 'line-through text-slate-400'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {st.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteSubtask(idx)}
                className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

