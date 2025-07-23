import { config } from '../config.js';
import { storageService } from '../storage/tasks.js';

class TaskService {
  constructor() {
    this.pendingTasks = new Map();
  }

  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  addPendingTask(taskData) {
    const taskId = this.generateTaskId();
    this.pendingTasks.set(taskId, taskData);

    // Удаляем задачу через таймаут, если она не была сохранена
    setTimeout(() => {
      this.pendingTasks.delete(taskId);
    }, config.tasks.timeout);

    return taskId;
  }

  getPendingTask(taskId) {
    return this.pendingTasks.get(taskId);
  }

  removePendingTask(taskId) {
    this.pendingTasks.delete(taskId);
  }

  async saveTask(chatId, taskData) {
    return await storageService.saveTask(chatId, taskData);
  }

  async getTasks(chatId) {
    return await storageService.getTasks(chatId);
  }

  async clearTasks(chatId) {
    return await storageService.clearTasks(chatId);
  }

  formatTasksMessage(tasks) {
    let message = '📋 **Сохраненные задачи:**\n\n';
    tasks.forEach((task, index) => {
      const date = new Date(task.createdAt).toLocaleDateString('ru-RU');
      const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      message += `${index + 1}. ${priority} **${task.taskText}**\n`;
      message += `   👤 Автор: ${task.author}\n`;
      message += `   📅 ${date}\n\n`;
    });
    return message;
  }

  createTaskNotificationMessage(taskAnalysis, chatId) {
    const taskData = {
      taskText: taskAnalysis.taskText,
      author: taskAnalysis.author,
      priority: taskAnalysis.priority,
      chatId: chatId
    };

    const taskId = this.addPendingTask(taskData);

    return {
      text: `🚨 **ВАЖНАЯ ЗАДАЧА ОБНАРУЖЕНА!**\n\n` +
        `📝 ${taskAnalysis.taskText}\n` +
        `👤 Автор: ${taskAnalysis.author}\n` +
        `⚡ Приоритет: 🔴 Высокий`,
      options: {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '💾 Сохранить задачу', callback_data: `save_${taskId}` }
          ]]
        }
      }
    };
  }
}

export const taskService = new TaskService();
