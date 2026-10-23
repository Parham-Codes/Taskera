import mongoose from 'mongoose';
import { Task, Category } from '../../models/index.js';
import { TaskError } from './taskErrors.js';
import {
  assertValidObjectId,
  verifyOrgMembership,
} from './taskAccessHelper.js';

/**
 * Service for Batch Tasks creation and category mapping (e.g. from Markdown AI Import).
 */
export const taskBatchService = {
  /**
   * Batch create tasks with auto-categorization
   */
  async batchCreateTasks({ tasks = [], organizationId = null, user }) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new TaskError('No tasks provided for batch creation', 400);
    }

    if (tasks.length > 50) {
      throw new TaskError('Maximum 50 tasks allowed per batch import', 400);
    }

    let targetOrgId = null;
    if (organizationId) {
      assertValidObjectId(organizationId, 'Organization ID');
      await verifyOrgMembership(organizationId, user._id);
      targetOrgId = organizationId;
    }

    // Cache categories in this workspace to avoid repetitive queries
    const existingCategories = await Category.find({
      organizationId: targetOrgId,
      ...(targetOrgId ? {} : { createdBy: user._id }),
    });

    const categoryMap = new Map();
    existingCategories.forEach((cat) => {
      categoryMap.set(cat.name.trim().toLowerCase(), cat._id);
    });

    const createdTasks = [];

    for (const item of tasks) {
      if (!item.title || !item.title.trim()) continue;

      let categoryId = null;
      if (item.categoryId && mongoose.Types.ObjectId.isValid(item.categoryId)) {
        categoryId = item.categoryId;
      } else if (item.categoryName && item.categoryName.trim()) {
        const catNameTrimmed = item.categoryName.trim();
        const catKey = catNameTrimmed.toLowerCase();
        if (categoryMap.has(catKey)) {
          categoryId = categoryMap.get(catKey);
        } else {
          // Auto-create category with a curated color
          const palette = [
            '#4F5AE4',
            '#8B5CF6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#EC4899',
            '#06B6D4',
            '#64748B',
          ];
          const randomColor = palette[Math.floor(Math.random() * palette.length)];
          const newCat = await Category.create({
            name: catNameTrimmed,
            color: item.categoryColor || randomColor,
            organizationId: targetOrgId,
            createdBy: user._id,
          });
          categoryMap.set(catKey, newCat._id);
          categoryId = newCat._id;
        }
      }

      const validPriorities = ['urgent', 'high', 'medium', 'low'];
      const priority = validPriorities.includes(item.priority)
        ? item.priority
        : 'medium';

      const validStatuses = ['todo', 'in-progress', 'review', 'completed'];
      const status = validStatuses.includes(item.status) ? item.status : 'todo';

      const subtasks = Array.isArray(item.subtasks)
        ? item.subtasks
            .filter(
              (s) =>
                (typeof s === 'string' && s.trim()) ||
                (s && s.title && s.title.trim())
            )
            .map((s) => ({
              title: typeof s === 'string' ? s.trim() : s.title.trim(),
              completed: typeof s === 'object' ? Boolean(s.completed) : false,
            }))
        : [];

      let dueDate = null;
      if (item.dueDate) {
        const parsedDate = new Date(item.dueDate);
        if (!isNaN(parsedDate.getTime())) {
          dueDate = parsedDate;
        }
      }

      const newTask = await Task.create({
        title: item.title.trim(),
        description: item.description?.trim() || '',
        status,
        priority,
        dueDate,
        organizationId: targetOrgId,
        createdBy: user._id,
        assignedTo: user._id,
        categoryId,
        subtasks,
      });

      createdTasks.push(newTask._id);
    }

    const populatedTasks = await Task.find({ _id: { $in: createdTasks } })
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .sort({ createdAt: -1 })
      .lean();

    return populatedTasks;
  },
};
