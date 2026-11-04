import React, { useMemo } from 'react';
import {
  Eye,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Users,
  Tag,
  Calendar,
  CalendarX,
  Copy,
  MessageSquare,
  Trash2,
  Circle,
  Clock,
  Play,
  Square,
  Link,
  CalendarDays,
} from 'lucide-react';
import { ContextMenu } from '../../../../components/contextMenu/index.js';
import { useLanguage } from '../../../../context/LanguageContext.jsx';
import { useWorkspace } from '../../../../context/WorkspaceContext.jsx';

/**
 * Generates ISO string for a given day offset with local time end-of-day
 */
const getDayOffsetIso = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

export const TaskContextMenu = ({
  position,
  isOpen,
  x,
  y,
  onClose,
  task,
  onOpenDetail,
  onEdit,
  onDelete,
  onStatusChange,
  onPriorityChange,
  onCategoryChange,
  onAssigneeToggle,
  onDueDateChange,
  onDuplicate,
  onDuplicateTask,
  onOpenComments,
  onStartTimer,
  onStopTimer,
  onCopyLink,
  categories = [],
  workspaceMembers = [],
  members = [],
  activeWorkspace = null,
  currentUserId,
}) => {
  const { t, lang } = useLanguage();
  const { activeWorkspace: contextActiveWorkspace } = useWorkspace();

  const finalWorkspace = activeWorkspace || contextActiveWorkspace;
  const finalMembers = workspaceMembers.length > 0 ? workspaceMembers : members;
  const isTeam = Boolean(finalWorkspace?.id || finalWorkspace?._id || task?.organizationId);

  const items = useMemo(() => {
    if (!task) return [];

    const assignees = Array.isArray(task.assignedTo)
      ? task.assignedTo
      : task.assignedTo ? [task.assignedTo] : [];
    const currentAssigneeIds = new Set(
      assignees.map((a) => String(a?._id || a?.id || a))
    );

    // Timer check
    const ongoingTimer = task.timeLogs?.some(
      (log) => !log.endTime && String(log.userId?._id || log.userId) === String(currentUserId)
    );

    // 1. Status Submenu items
    const statusOptions = [
      { id: 'todo', label: t('todo'), icon: Circle },
      { id: 'in-progress', label: t('inProgress'), icon: Clock },
      { id: 'review', label: t('review'), icon: Eye },
      { id: 'completed', label: t('completed'), icon: CheckCircle2 },
    ];

    const statusSubmenu = statusOptions.map((st) => ({
      id: `status-${st.id}`,
      label: st.label,
      icon: st.icon,
      active: task.status === st.id,
      onClick: () => onStatusChange?.(st.id),
    }));

    // 2. Priority Submenu items
    const priorityOptions = [
      { id: 'urgent', label: t('urgent'), colorDot: '#EF4444' },
      { id: 'high', label: t('high'), colorDot: '#F97316' },
      { id: 'medium', label: t('medium'), colorDot: '#3B82F6' },
      { id: 'low', label: t('low'), colorDot: '#94A3B8' },
    ];

    const prioritySubmenu = priorityOptions.map((p) => ({
      id: `priority-${p.id}`,
      label: p.label,
      colorDot: p.colorDot,
      active: task.priority === p.id,
      onClick: () => onPriorityChange?.(p.id),
    }));

    // 3. Category Submenu items
    const categorySubmenu = [
      {
        id: 'cat-none',
        label: t('uncategorized') || (lang === 'fa' ? 'بدون دسته‌بندی' : 'Uncategorized'),
        active: !task.categoryId,
        onClick: () => onCategoryChange?.(null),
      },
      ...categories.map((cat) => ({
        id: `cat-${cat._id}`,
        label: cat.name,
        colorDot: cat.color || '#4F5AE4',
        active: String(task.categoryId?._id || task.categoryId) === String(cat._id),
        onClick: () => onCategoryChange?.(cat._id),
      })),
    ];

    // 4. Assignee Submenu items (Only in team workspace)
    const assigneeSubmenu = isTeam
      ? finalMembers.map((m) => {
          const mId = String(m?.id || m?._id || m?.userId);
          const isAssigned = currentAssigneeIds.has(mId);
          return {
            id: `assignee-${mId}`,
            label: m?.name || m?.email?.split('@')[0] || 'Member',
            active: isAssigned,
            onClick: () => onAssigneeToggle?.(mId, !isAssigned),
          };
        })
      : [];

    // 5. Due Date Submenu items
    const dueDateSubmenu = [
      {
        id: 'due-today',
        label: t('today') || (lang === 'fa' ? 'امروز' : 'Today'),
        icon: Calendar,
        onClick: () => onDueDateChange?.(task._id, getDayOffsetIso(0)),
      },
      {
        id: 'due-tomorrow',
        label: t('tomorrow') || (lang === 'fa' ? 'فردا' : 'Tomorrow'),
        icon: CalendarDays,
        onClick: () => onDueDateChange?.(task._id, getDayOffsetIso(1)),
      },
      {
        id: 'due-next-week',
        label: t('nextWeek') || (lang === 'fa' ? 'هفته آینده' : 'Next Week'),
        icon: CalendarDays,
        onClick: () => onDueDateChange?.(task._id, getDayOffsetIso(7)),
      },
      ...(task.dueDate
        ? [
            { type: 'separator' },
            {
              id: 'due-clear',
              label: t('removeDueDate') || (lang === 'fa' ? 'حذف تاریخ سررسید' : 'Remove Due Date'),
              icon: CalendarX,
              danger: true,
              onClick: () => onDueDateChange?.(task._id, null),
            },
          ]
        : []),
    ];

    const result = [
      // Primary Actions
      ...(onOpenDetail
        ? [
            {
              id: 'view-details',
              label: t('viewTaskDetails') || (lang === 'fa' ? 'مشاهده جزئیات' : 'View Details'),
              icon: Eye,
              onClick: () => onOpenDetail?.(task),
            },
          ]
        : []),
      {
        id: 'edit-task',
        label: t('editTask') || (lang === 'fa' ? 'ویرایش تسک' : 'Edit Task'),
        icon: Edit2,
        onClick: () => onEdit?.(task),
      },
      { type: 'separator' },

      // Submenus
      {
        id: 'change-status',
        label: t('changeStatus') || (lang === 'fa' ? 'تغییر وضعیت' : 'Change Status'),
        icon: CheckCircle2,
        children: statusSubmenu,
      },
      {
        id: 'change-priority',
        label: t('changePriority') || (lang === 'fa' ? 'تغییر اولویت' : 'Change Priority'),
        icon: AlertCircle,
        children: prioritySubmenu,
      },
      ...(isTeam && finalMembers.length > 0
        ? [
            {
              id: 'assign-member',
              label: t('assignToMember') || (lang === 'fa' ? 'تخصیص به عضو تیم' : 'Assign to Member'),
              icon: Users,
              children: assigneeSubmenu,
            },
          ]
        : []),
      {
        id: 'change-category',
        label: t('changeCategory') || (lang === 'fa' ? 'تغییر دسته‌بندی' : 'Change Category'),
        icon: Tag,
        children: categorySubmenu,
      },
    ];

    if (onDueDateChange) {
      result.push({
        id: 'set-due-date',
        label: t('setDueDate') || (lang === 'fa' ? 'تنظیم مهلت انجام' : 'Set Due Date'),
        icon: Calendar,
        children: dueDateSubmenu,
      });
    }

    result.push({ type: 'separator' });

    // Timer Action
    if (ongoingTimer) {
      result.push({
        id: 'stop-timer',
        label: t('stopTimer') || (lang === 'fa' ? 'توقف تایمر' : 'Stop Timer'),
        icon: Square,
        onClick: () => onStopTimer?.(task),
      });
    } else {
      result.push({
        id: 'start-timer',
        label: t('startTimer') || (lang === 'fa' ? 'شروع تایمر' : 'Start Timer'),
        icon: Play,
        onClick: () => onStartTimer?.(task),
      });
    }

    // Additional Tools
    result.push({
      id: 'duplicate-task',
      label: t('duplicateTask') || (lang === 'fa' ? 'ساخت نسخه کپی' : 'Duplicate Task'),
      icon: Copy,
      onClick: () => {
        if (onDuplicate) onDuplicate(task);
        else if (onDuplicateTask) onDuplicateTask(task);
      },
    });

    if (onCopyLink) {
      result.push({
        id: 'copy-link',
        label: t('copyTaskLink') || (lang === 'fa' ? 'کپی لینک تسک' : 'Copy Task Link'),
        icon: Link,
        onClick: () => onCopyLink?.(task),
      });
    }

    if (onOpenComments) {
      result.push({
        id: 'open-comments',
        label: t('commentsTitle') || (lang === 'fa' ? 'یادداشت‌ها و گفتگو' : 'Comments'),
        icon: MessageSquare,
        onClick: () => onOpenComments?.(task),
      });
    }

    result.push({ type: 'separator' });

    // Danger Actions
    result.push({
      id: 'delete-task',
      label: t('deleteTask') || (lang === 'fa' ? 'حذف تسک' : 'Delete Task'),
      icon: Trash2,
      danger: true,
      onClick: () => onDelete?.(task),
    });

    return result;
  }, [
    task,
    isTeam,
    finalMembers,
    categories,
    currentUserId,
    lang,
    t,
    onOpenDetail,
    onEdit,
    onDelete,
    onStatusChange,
    onPriorityChange,
    onCategoryChange,
    onAssigneeToggle,
    onDueDateChange,
    onDuplicate,
    onDuplicateTask,
    onOpenComments,
    onStartTimer,
    onStopTimer,
    onCopyLink,
  ]);

  const finalX = position ? position.x : x;
  const finalY = position ? position.y : y;

  return (
    <ContextMenu
      isOpen={isOpen !== undefined ? isOpen : Boolean(position)}
      x={finalX}
      y={finalY}
      onClose={onClose}
      items={items}
      title={task?.title}
      minWidth={220}
    />
  );
};
