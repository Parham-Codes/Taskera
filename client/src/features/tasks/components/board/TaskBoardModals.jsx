import React from 'react';
import { TaskDetailModal } from '../../TaskDetailModal.jsx';
import { TaskModal } from '../../TaskModal.jsx';
import { CommentDrawer } from '../../../comments/CommentDrawer.jsx';
import { ConfirmModal } from '../../../../components/ui/index.js';
import {
  TaskContextMenu,
  KanbanColumnContextMenu,
  CalendarDayContextMenu,
} from '../contextMenu';

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
  defaultColumnStatus,
  onOpenCategoryManager,
  activeCommentTask,
  onCloseCommentDrawer,
  taskToDelete,
  onCloseDeleteModal,
  onConfirmDeleteTask,
  isDeletingTask,
  t,
  // Context Menu Props
  taskMenu,
  onCloseTaskMenu,
  onTaskMenuEdit,
  onTaskMenuDuplicate,
  onTaskMenuDelete,
  onTaskMenuStatusChange,
  onTaskMenuPriorityChange,
  onTaskMenuCategoryChange,
  onTaskMenuAssigneeToggle,
  onTaskMenuStartTimer,
  onTaskMenuStopTimer,
  onTaskMenuCopyLink,
  categories = [],
  workspaceMembers = [],
  currentUserId,
  columnMenu,
  onCloseColumnMenu,
  onColumnMenuCreateTask,
  onColumnMenuFilterStatus,
  dayMenu,
  onCloseDayMenu,
  onDayMenuCreateTask,
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
        defaultStatus={defaultColumnStatus}
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

      {/* 5. Task Context Menu */}
      {taskMenu?.isOpen && taskMenu.data && (
        <TaskContextMenu
          position={taskMenu.position}
          onClose={onCloseTaskMenu}
          task={taskMenu.data}
          categories={categories}
          workspaceMembers={workspaceMembers}
          currentUserId={currentUserId}
          onEdit={() => onTaskMenuEdit?.(taskMenu.data)}
          onDuplicate={() => onTaskMenuDuplicate?.(taskMenu.data)}
          onDelete={() => onTaskMenuDelete?.(taskMenu.data)}
          onStatusChange={(status) => onTaskMenuStatusChange?.(taskMenu.data, status)}
          onPriorityChange={(priority) => onTaskMenuPriorityChange?.(taskMenu.data, priority)}
          onCategoryChange={(catId) => onTaskMenuCategoryChange?.(taskMenu.data, catId)}
          onAssigneeToggle={(memberId, shouldAssign) =>
            onTaskMenuAssigneeToggle?.(taskMenu.data, memberId, shouldAssign)
          }
          onStartTimer={() => onTaskMenuStartTimer?.(taskMenu.data)}
          onStopTimer={() => onTaskMenuStopTimer?.(taskMenu.data)}
          onCopyLink={() => onTaskMenuCopyLink?.(taskMenu.data)}
        />
      )}

      {/* 6. Kanban Column Context Menu */}
      {columnMenu?.isOpen && columnMenu.data && (
        <KanbanColumnContextMenu
          position={columnMenu.position}
          onClose={onCloseColumnMenu}
          columnId={columnMenu.data.columnId}
          columnTitle={columnMenu.data.columnTitle}
          onCreateTask={() => onColumnMenuCreateTask?.(columnMenu.data.columnId)}
          onFilterByStatus={() => onColumnMenuFilterStatus?.(columnMenu.data.columnId)}
        />
      )}

      {/* 7. Calendar Day Context Menu */}
      {dayMenu?.isOpen && dayMenu.data && (
        <CalendarDayContextMenu
          position={dayMenu.position}
          onClose={onCloseDayMenu}
          dateKey={dayMenu.data.dateKey}
          onCreateTask={() => onDayMenuCreateTask?.(dayMenu.data.dateKey)}
        />
      )}
    </>
  );
};
