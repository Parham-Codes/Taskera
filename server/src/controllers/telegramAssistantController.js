import User from '../models/user.js';
import { taskCrudService } from '../services/tasks/taskCrudService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Controller to handle task creation from the n8n Telegram Voice Assistant webhook.
 *
 * Requirements:
 * - chatType must be 'private'.
 * - isBot must be false.
 * - telegramUserId and telegramChatId must match and be valid non-empty strings.
 * - Look up user where telegramSettings.chatId === telegramUserId and telegramSettings.assistantEnabled === true.
 * - Ensure exactly ONE user matches; reject with 409 if multiple accounts claim the same Telegram ID.
 * - Task data is validated (title is required).
 * - Task is created in Personal Space (organizationId = null) via taskCrudService.createTask.
 */
export const createTaskFromTelegramAssistant = async (req, res, next) => {
  try {
    const { telegramUserId, telegramChatId, chatType, isBot, task } = req.body;

    // 1. Enforce private non-bot chat policy
    if (isBot === true) {
      return errorResponse(res, {
        message: 'Bots cannot create tasks via Telegram assistant.',
        statusCode: 400,
      });
    }

    if (chatType !== 'private') {
      return errorResponse(res, {
        message: 'Telegram assistant is only supported in private direct chats.',
        statusCode: 400,
      });
    }

    const normalizedUserId = typeof telegramUserId === 'string' ? telegramUserId.trim() : String(telegramUserId || '').trim();
    const normalizedChatId = typeof telegramChatId === 'string' ? telegramChatId.trim() : String(telegramChatId || '').trim();

    if (!normalizedUserId || !normalizedChatId) {
      return errorResponse(res, {
        message: 'telegramUserId and telegramChatId are required.',
        statusCode: 400,
      });
    }

    if (normalizedUserId !== normalizedChatId) {
      return errorResponse(res, {
        message: 'Telegram user ID and chat ID must match for private chats.',
        statusCode: 400,
      });
    }

    // 2. Validate task payload
    if (!task || typeof task !== 'object') {
      return errorResponse(res, {
        message: 'Task payload object is required.',
        statusCode: 400,
      });
    }

    const title = typeof task.title === 'string' ? task.title.trim() : '';
    if (!title) {
      return errorResponse(res, {
        message: 'Task title is required.',
        statusCode: 400,
      });
    }

    // 3. Look up user by chatId with assistantEnabled: true
    const matchingUsers = await User.find({
      'telegramSettings.chatId': normalizedUserId,
      'telegramSettings.assistantEnabled': true,
    }).select('+password'); // taskCrudService only needs user._id and basic fields

    if (!matchingUsers || matchingUsers.length === 0) {
      return errorResponse(res, {
        message: 'No Taskera user found with this Telegram ID or assistant is disabled.',
        statusCode: 404,
      });
    }

    // Security check: reject if more than one user configured this exact Telegram ID
    if (matchingUsers.length > 1) {
      return errorResponse(res, {
        message: 'Ambiguous account association: multiple users share this Telegram ID.',
        statusCode: 409,
      });
    }

    const user = matchingUsers[0];

    // 4. Safely validate and normalize subtasks if provided
    let normalizedSubtasks = [];
    if (Array.isArray(task.subtasks)) {
      normalizedSubtasks = task.subtasks
        .filter((st) => st && typeof st === 'object' && typeof st.title === 'string')
        .map((st) => ({
          title: st.title.trim(),
        }))
        .filter((st) => st.title.length > 0);
    }

    // 5. Create the task via taskCrudService
    const taskData = {
      title,
      description: typeof task.description === 'string' ? task.description.trim() : '',
      priority: ['low', 'medium', 'high', 'urgent'].includes(task.priority) ? task.priority : 'medium',
      status: 'todo',
      dueDate: task.dueDate || null,
      subtasks: normalizedSubtasks,
      organizationId: null, // Always personal space for telegram assistant v1
    };

    const createdTask = await taskCrudService.createTask({
      taskData,
      user,
    });

    return successResponse(res, {
      message: 'Task created successfully via Telegram assistant',
      data: {
        task: createdTask,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

