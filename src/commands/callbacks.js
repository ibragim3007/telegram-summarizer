import { taskService } from '../services/tasks.js';

export function setupCallbackHandler(bot) {
  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('save_')) {
      await handleSaveTask(ctx, data);
    } else if (data.startsWith('clear_tasks_')) {
      await handleClearTasksConfirmation(ctx, data);
    } else if (data.startsWith('confirm_clear_')) {
      await handleConfirmClear(ctx, data);
    } else if (data.startsWith('cancel_clear_')) {
      await handleCancelClear(ctx);
    }
  });
}

async function handleSaveTask(ctx, data) {
  const taskId = data.replace('save_', '');
  const taskData = taskService.getPendingTask(taskId);

  if (!taskData) {
    await ctx.answerCbQuery('❌ Задача больше недоступна (истекло время)');
    return;
  }

  try {
    const savedTaskId = await taskService.saveTask(taskData.chatId, taskData);

    if (savedTaskId) {
      await ctx.answerCbQuery('✅ Задача сохранена!');
      await ctx.editMessageText(
        `✅ **Задача сохранена!**\n\n` +
        `📝 ${taskData.taskText}\n` +
        `👤 Автор: ${taskData.author}\n` +
        `🆔 ID: ${savedTaskId}`,
        { parse_mode: 'Markdown' }
      );

      taskService.removePendingTask(taskId);
    } else {
      await ctx.answerCbQuery('❌ Ошибка сохранения');
    }
  } catch (error) {
    console.error('❌ Ошибка обработки callback:', error);
    await ctx.answerCbQuery('❌ Ошибка обработки');
  }
}

async function handleClearTasksConfirmation(ctx, data) {
  const chatId = parseInt(data.replace('clear_tasks_', ''));

  await ctx.editMessageText(
    '⚠️ **Подтверждение удаления**\n\n' +
    '🗑️ Вы уверены, что хотите удалить ВСЕ задачи?\n' +
    '📝 Это действие нельзя отменить!',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Да, удалить все', callback_data: `confirm_clear_${chatId}` },
            { text: '❌ Отмена', callback_data: `cancel_clear_${chatId}` }
          ]
        ]
      }
    }
  );
}

async function handleConfirmClear(ctx, data) {
  const chatId = parseInt(data.replace('confirm_clear_', ''));

  try {
    const success = await taskService.clearTasks(chatId);

    if (success) {
      await ctx.answerCbQuery('🗑️ Все задачи удалены!');
      await ctx.editMessageText(
        '✅ **Все задачи удалены!**\n\n' +
        '📝 Список задач для этого чата очищен.',
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.answerCbQuery('❌ Ошибка при удалении');
    }
  } catch (error) {
    console.error('❌ Ошибка удаления задач:', error);
    await ctx.answerCbQuery('❌ Ошибка обработки');
  }
}

async function handleCancelClear(ctx) {
  await ctx.answerCbQuery('❌ Отменено');
  await ctx.editMessageText(
    '❌ **Очистка отменена**\n\n' +
    '📝 Задачи остались без изменений.',
    { parse_mode: 'Markdown' }
  );
}
