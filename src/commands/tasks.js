import { taskService } from '../services/tasks.js';

export function setupTasksCommand(bot) {
  bot.command('tasks', async (ctx) => {
    const chatId = ctx.chat.id;
    const savedTasks = await taskService.getTasks(chatId);

    if (savedTasks.length === 0) {
      return ctx.reply('📝 Нет сохраненных задач для этого чата.');
    }

    const message = taskService.formatTasksMessage(savedTasks);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🗑️ Очистить все задачи', callback_data: `clear_tasks_${chatId}` }
        ]]
      }
    });
  });
}
