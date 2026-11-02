import React from 'react';
import { TaskDetailModal } from '../../TaskDetailModal.jsx';
import { TaskModal } from '../../TaskModal.jsx';
import { CommentDrawer } from '../../../comments/CommentDrawer.jsx';
import { ConfirmModal } from '../../../../components/ui/index.js';

export const TaskBoardModals = ({
  activeDetailTaskId,
  onCloseDetailModal,
  selectedTaskForDetail,
  onTaskUpdatedFromModal,
  onEditTaskFromDetail,
  onRequestDeleteTask,
  taskModalOpen,
  onCloseTaskModal,
  onSaveTask,
  editingTask,
  calendarSelectedDate,
  onOpenCategoryManager,
  activeCommentTask,
  onCloseCommentDrawer,
  taskToDelete,
  onCloseDeleteModal,
  onConfirmDeleteTask,
  isDeletingTask,
  t,
}) => {
  return (
    <>
      {/* 1. Dedicated Task Detail & Time Tracker Modal */}
      <TaskDetailModal
        isOpen={Boolean(activeDetailTaskId)}
        onClose={onCloseDetailModal}
        taskId={activeDetailTaskId}
        initialTask={selectedTaskForDetail}
        onTaskUpdated={onTaskUpdatedFromModal}
        onEditTask={onEditTaskFromDetail}
        onDeleteTask={onRequestDeleteTask}
      />

      {/* 2. Create / Edit Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={onCloseTaskModal}
        onSubmit={onSaveTask}
        initialTask={editingTask}
        defaultDueDate={calendarSelectedDate || ''}
        onOpenCategoryManager={onOpenCategoryManager}
      />

      {/* 3. Comment Drawer */}
      <CommentDrawer
        isOpen={Boolean(activeCommentTask)}
        onClose={onCloseCommentDrawer}
        task={activeCommentTask}
      />

      {/* 4. Confirm Delete Task Modal */}
      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={onCloseDeleteModal}
        onConfirm={onConfirmDeleteTask}
        title={t('confirmDeleteTaskTitle')}
        description={t('confirmDeleteTaskDesc')}
        confirmText={t('confirmDeleteBtn')}
        cancelText={t('cancel')}
        variant="danger"
        loading={isDeletingTask}
      />
    </>
  );
};
