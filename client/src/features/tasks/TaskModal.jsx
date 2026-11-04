import React, { useState, useEffect } from 'react';
import { CheckSquare, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useCategories } from '../../context/CategoryContext.jsx';
import { Modal } from '../../components/ui/index.js';
import {
  TaskModalBasicFields,
  TaskModalMetaFields,
  TaskModalScheduleFields,
  TaskModalAssigneeSelector,
  TaskModalRoutineFields,
  TaskModalSubtasks,
} from './components/modal/index.js';

export const TaskModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialTask = null,
  defaultDueDate = '',
  defaultStatus = 'todo',
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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('daily');
  const [subtasks, setSubtasks] = useState([]);
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
      setIsRecurring(Boolean(initialTask.recurrence?.isRecurring));
      setRecurrenceFrequency(initialTask.recurrence?.frequency || 'daily');
      setSubtasks(initialTask.subtasks || []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus(defaultStatus || 'todo');
      setDueDate(defaultDueDate || '');
      setAssignedTo([]);
      setCategoryId('');
      setIsRecurring(false);
      setRecurrenceFrequency('daily');
      setSubtasks([]);
    }
    setError('');
  }, [initialTask, isOpen, defaultDueDate, defaultStatus]);

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
        recurrence: {
          isRecurring,
          frequency: recurrenceFrequency,
        },
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving task');
    } finally {
      setSubmitting(false);
    }
  };

  const isOrgSpace = Boolean(activeWorkspace?.id || activeWorkspace?._id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTask ? t('editTask') : t('newTask')}
      icon={CheckSquare}
      maxWidth="max-w-xl"
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title & Description */}
        <TaskModalBasicFields
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          t={t}
        />

        {/* Category & Priority */}
        <TaskModalMetaFields
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          categories={categories}
          priority={priority}
          setPriority={setPriority}
          onOpenCategoryManager={onOpenCategoryManager}
          t={t}
        />

        {/* Due Date & Optional Personal Status */}
        <TaskModalScheduleFields
          dueDate={dueDate}
          setDueDate={setDueDate}
          status={status}
          setStatus={setStatus}
          showStatusSelect={!isOrgSpace}
          t={t}
        />

        {/* Multi-Assignee in Organization Space */}
        {isOrgSpace && (
          <TaskModalAssigneeSelector
            assignedTo={assignedTo}
            setAssignedTo={setAssignedTo}
            members={members}
            lang={lang}
            t={t}
          />
        )}

        {/* Routine / Recurring Settings */}
        <TaskModalRoutineFields
          isRecurring={isRecurring}
          setIsRecurring={setIsRecurring}
          recurrenceFrequency={recurrenceFrequency}
          setRecurrenceFrequency={setRecurrenceFrequency}
          t={t}
        />

        {/* Checklist / Subtasks */}
        <TaskModalSubtasks
          subtasks={subtasks}
          setSubtasks={setSubtasks}
          t={t}
        />

        {/* Actions Button Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all shadow-md shadow-brand-500/25 disabled:opacity-50 cursor-pointer"
          >
            {submitting
              ? t('saving')
              : initialTask
              ? t('save')
              : t('createTask')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
