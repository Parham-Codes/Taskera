import { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Bell,
  Tag,
  User,
} from 'lucide-react';

export const useTaskBoardFilters = ({
  allTasks = [],
  sidebarFilter = 'all',
  priorityFilter = 'all',
  search = '',
  categories = [],
  members = [],
  currentUserId = '',
  lang = 'fa',
  t,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Reset status filter whenever sidebar filter switches
  useEffect(() => {
    setSelectedStatusFilter('all');
  }, [sidebarFilter]);

  // Check if viewing a specific category or member selected from Sidebar
  const isCategoryFromSidebar = Boolean(sidebarFilter?.startsWith('cat:'));
  const isMemberFromSidebar = Boolean(sidebarFilter?.startsWith('member:'));

  const selectedSidebarCategory = useMemo(() => {
    if (!isCategoryFromSidebar) return null;
    const catId = sidebarFilter.replace('cat:', '');
    return categories.find((c) => String(c._id) === catId) || null;
  }, [isCategoryFromSidebar, sidebarFilter, categories]);

  const selectedSidebarMember = useMemo(() => {
    if (!isMemberFromSidebar) return null;
    const memberId = sidebarFilter.replace('member:', '');
    return (
      (members || []).find((m) => String(m?.id || m?._id) === memberId) || null
    );
  }, [isMemberFromSidebar, sidebarFilter, members]);

  // Compute tasks in the current category/member scope for accurate status counts
  const categoryScopedTasks = useMemo(() => {
    if (isCategoryFromSidebar) {
      const targetCatId = sidebarFilter.replace('cat:', '');
      return allTasks.filter((task) => {
        const catId = task.categoryId?._id || task.categoryId;
        return String(catId) === String(targetCatId);
      });
    }
    if (isMemberFromSidebar) {
      const targetMemberId = sidebarFilter.replace('member:', '');
      return allTasks.filter((task) => {
        const assignees = Array.isArray(task.assignedTo)
          ? task.assignedTo
          : task.assignedTo ? [task.assignedTo] : [];
        return assignees.some(
          (a) => String(a?._id || a?.id || a) === targetMemberId
        );
      });
    }
    return allTasks;
  }, [allTasks, isCategoryFromSidebar, isMemberFromSidebar, sidebarFilter]);

  // Client-side filtering: 0ms latency, zero layout shift, stable TaskStats!
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      // 1. Sidebar filter
      if (sidebarFilter === 'in-progress') {
        if (task.status !== 'in-progress' && task.status !== 'review') return false;
      } else if (sidebarFilter === 'my-tasks') {
        const assignees = Array.isArray(task.assignedTo)
          ? task.assignedTo
          : task.assignedTo ? [task.assignedTo] : [];
        const isMine = assignees.some(
          (a) => String(a?._id || a?.id || a) === currentUserId
        );
        if (!isMine) return false;
      } else if (sidebarFilter === 'due-soon') {
        if (!task.dueDate || task.status === 'completed') return false;
        const due = new Date(task.dueDate).getTime();
        const now = Date.now();
        if (due < now || due > now + 3 * 24 * 60 * 60 * 1000) return false;
      } else if (sidebarFilter === 'completed') {
        if (task.status !== 'completed') return false;
      } else if (sidebarFilter?.startsWith('cat:')) {
        const targetCatId = sidebarFilter.replace('cat:', '');
        const catId = task.categoryId?._id || task.categoryId;
        if (String(catId) !== String(targetCatId)) return false;
      } else if (sidebarFilter?.startsWith('member:')) {
        const targetMemberId = sidebarFilter.replace('member:', '');
        const assignees = Array.isArray(task.assignedTo)
          ? task.assignedTo
          : task.assignedTo ? [task.assignedTo] : [];
        const isAssigned = assignees.some(
          (a) => String(a?._id || a?.id || a) === targetMemberId
        );
        if (!isAssigned) return false;
      }

      // 2. Priority Filter from Header
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // 3. Search text
      if (search?.trim()) {
        const q = search.trim().toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      // 4. Category Filter
      if (selectedCategoryFilter !== 'all') {
        const catId = task.categoryId?._id || task.categoryId;
        if (catId !== selectedCategoryFilter) return false;
      }

      // 5. Status Filter (active when in a Category or in ListView)
      if (selectedStatusFilter !== 'all') {
        if (task.status !== selectedStatusFilter) return false;
      }

      return true;
    });
  }, [
    allTasks,
    sidebarFilter,
    priorityFilter,
    search,
    selectedCategoryFilter,
    selectedStatusFilter,
    currentUserId,
  ]);

  // Filter metadata when viewing a specific sidebar filter
  const filterMeta = useMemo(() => {
    if (isCategoryFromSidebar) {
      return {
        title: selectedSidebarCategory?.name || t('categories'),
        icon: Tag,
        color: 'text-brand-500 bg-brand-500/10 border-brand-500/20',
        customColor: selectedSidebarCategory?.color || '#4F5AE4',
      };
    }

    if (isMemberFromSidebar) {
      const memberName =
        selectedSidebarMember?.name ||
        selectedSidebarMember?.email?.split('@')[0] ||
        t('teamMembers');
      return {
        title: lang === 'fa' ? `تسک‌های ${memberName}` : `${memberName}'s Tasks`,
        icon: User,
        color: 'text-brand-500 bg-brand-500/10 border-brand-500/20',
      };
    }

    return {
      'in-progress': {
        title: t('quickFilterInProgress'),
        icon: Clock,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      },
      'my-tasks': {
        title: t('quickFilterMyTasks'),
        icon: UserCheck,
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      },
      'due-soon': {
        title: t('quickFilterDueSoon'),
        icon: AlertTriangle,
        color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      },
      'completed': {
        title: t('quickFilterCompleted'),
        icon: CheckCircle2,
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      },
      'notifications': {
        title: t('notificationsTitle'),
        icon: Bell,
        color: 'text-brand-500 bg-brand-500/10 border-brand-500/20',
      },
    }[sidebarFilter];
  }, [
    sidebarFilter,
    isCategoryFromSidebar,
    isMemberFromSidebar,
    selectedSidebarCategory,
    selectedSidebarMember,
    t,
    lang,
  ]);

  return {
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    isCategoryFromSidebar,
    isMemberFromSidebar,
    selectedSidebarCategory,
    selectedSidebarMember,
    categoryScopedTasks,
    filteredTasks,
    filterMeta,
  };
};

