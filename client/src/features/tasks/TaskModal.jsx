import React, { useState, useEffect } from 'react';
import { Flag, User, AlertCircle, CheckSquare, Calendar, Tag, Plus, Trash2, X, Check } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useCategories } from '../../context/CategoryContext.jsx';
import { Modal } from '../../components/ui/index.js';

export const TaskModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialTask = null,
  defaultDueDate = '',
  onOpenCategoryManager,
}) => {
  const { activeWorkspace, members } = useWorkspace();
  const { categories } = useCategories();
  const { t, lang } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('todo');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority || 'medium');
      setStatus(initialTask.status || 'todo');
      setDueDate(initialTask.dueDate ? initialTask.dueDate.split('T')[0] : '');
      
      let initialAssignees = [];
      if (Array.isArray(initialTask.assignedTo)) {
        initialAssignees = initialTask.assignedTo
          .map((a) => (a?._id ? a._id.toString() : a?.toString()))
          .filter(Boolean);
      } else if (initialTask.assignedTo) {
        const id = initialTask.assignedTo?._id || initialTask.assignedTo;
        if (id) initialAssignees = [id.toString()];
      }
      setAssignedTo(initialAssignees);

      setCategoryId(initialTask.categoryId?._id || initialTask.categoryId || '');
      setSubtasks(initialTask.subtasks || []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus('todo');
      setDueDate(defaultDueDate || '');
      setAssignedTo([]);
      setCategoryId('');
      setSubtasks([]);
    }
    setNewSubtaskTitle('');
    setError('');
  }, [initialTask, isOpen, defaultDueDate]);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      { title: newSubtaskTitle.trim(), completed: false },
    ]);
    setNewSubtaskTitle('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('taskTitleLabel'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        organizationId: (activeWorkspace?.id || activeWorkspace?._id) || null,
        assignedTo: (activeWorkspace?.id || activeWorkspace?._id) ? assignedTo : [],
        categoryId: categoryId || null,
        subtasks,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTask ? t('editTask') : t('newTask')}
      icon={CheckSquare}
      maxWidth="max-w-lg"
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            {t('taskTitleLabel')}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('taskTitlePlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all text-slate-900 dark:text-white"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            {t('descriptionLabel')}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all resize-none text-slate-900 dark:text-white"
          />
        </div>

        {/* Category & Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t('category')}
              </label>
              {onOpenCategoryManager && (
                <button
                  type="button"
                  onClick={onOpenCategoryManager}
                  className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  + {t('newCategory')}
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all appearance-none cursor-pointer text-slate-900 dark:text-white"
              >
                <option value="">{t('noCategory')}</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Tag className="w-4 h-4 text-brand-500 dark:text-brand-400 absolute end-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              {t('priority')}
            </label>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all appearance-none cursor-pointer text-slate-900 dark:text-white"
              >
                <option value="low">{t('lowPriority')}</option>
                <option value="medium">{t('mediumPriority')}</option>
                <option value="high">{t('highPriority')}</option>
                <option value="urgent">{t('urgentPriority')}</option>
              </select>
              <Flag className="w-4 h-4 text-slate-400 absolute end-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Due Date & Team Assignee Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              {t('dueDateLabel')}
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                className="w-full px-3.5 py-2.5 pe-10 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all cursor-pointer text-slate-900 dark:text-white"
              />
              <Calendar className="w-4 h-4 text-brand-500 dark:text-brand-400 absolute end-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Team Assignees (Only in Organization space) */}
          {(activeWorkspace?.id || activeWorkspace?._id) ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {t('assigneeLabel')} ({assignedTo.length})
                </label>
                {members.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = members
                        .map((m) => (m.id || m._id || m.userId?._id || m.userId)?.toString())
                        .filter(Boolean);
                      setAssignedTo((prev) =>
                        prev.length === allIds.length ? [] : allIds
                      );
                    }}
                    className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                  >
                    {assignedTo.length === members.length
                      ? (lang === 'fa' ? 'حذف همه' : 'Clear all')
                      : (lang === 'fa' ? 'انتخاب همه' : 'Select all')}
                  </button>
                )}
              </div>

              {/* Multi-Assignee Selection List */}
              <div className="p-2 rounded-xl glass-input max-h-36 overflow-y-auto space-y-1">
                {members.length === 0 ? (
                  <p className="text-[11px] text-slate-400 p-2 text-center">
                    {lang === 'fa' ? 'عضوی در این سازمان یافت نشد' : 'No members found'}
                  </p>
                ) : (
                  members.map((m) => {
                    const mId = (m.id || m._id || m.userId?._id || m.userId)?.toString();
                    const mName = m.name || m.userId?.name || 'Member';
                    const mRole = m.role || 'member';
                    const isSelected = assignedTo.includes(mId);

                    return (
                      <button
                        key={mId}
                        type="button"
                        onClick={() => {
                          setAssignedTo((prev) =>
                            isSelected ? prev.filter((id) => id !== mId) : [...prev, mId]
                          );
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          isSelected
                            ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/30'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-5 h-5 rounded-md bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {mName[0]?.toUpperCase()}
                          </div>
                          <span className="truncate">{mName}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                            {mRole}
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-brand-500 border-brand-500 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {t('status')}
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all appearance-none cursor-pointer text-slate-900 dark:text-white"
                >
                  <option value="todo">{t('todo')}</option>
                  <option value="in-progress">{t('inProgress')}</option>
                  <option value="review">{t('review')}</option>
                  <option value="completed">{t('completed')}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Checklist / Subtasks Section */}
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
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600 transition-colors flex items-center gap-1 shrink-0 active:scale-95 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t('add')}</span>
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
                      onClick={() => {
                        setSubtasks((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, completed: !item.completed } : item
                          )
                        );
                      }}
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
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
                    onClick={() => {
                      setSubtasks((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all shadow-sm active:scale-98"
          >
            {submitting ? t('saving') : initialTask ? t('edit') : t('createTask')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
