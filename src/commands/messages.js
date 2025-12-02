import { bufferService } from '../storage/buffer.js';
// import { geminiService } from '../services/gemini.js';
// import { taskService } from '../services/tasks.js';
// import { taskDetectionPrompt } from '../prompts/index.js';
// import { formatMessageForAI, safeReply } from '../utils/telegram.js';

export function setupMessageHandler(bot) {
  bot.on('message', async (ctx) => {
    const chatId = ctx.chat.id;
    const message = ctx.message;
    const text = message.text;

    if (!text || text.startsWith('/')) return;

    // Добавляем сообщение в буфер
    bufferService.addMessage(chatId, message);

    // Проверяем на задачи каждые N сообщений
    // if (bufferService.shouldCheckTasks(chatId)) {
    //   await checkForTasks(ctx, chatId);
    // }
  });
}

// async function checkForTasks(ctx, chatId) {
//   const last10Messages = bufferService.getLastMessages(chatId, 10);
//   const messagesText = last10Messages.map(m => formatMessageForAI(m)).join('\n');

//   try {
//     const taskAnalysis = await geminiService.analyzeForTasks(taskDetectionPrompt(messagesText));

//     if (taskAnalysis.hasTask && taskAnalysis.priority === 'high') {
//       const taskData = {
//         taskText: taskAnalysis.taskText,
//         author: taskAnalysis.author,
//         priority: taskAnalysis.priority,
//         chatId: chatId
//       };

//       const taskId = taskService.addPendingTask(taskData);

//       await safeReply(ctx,
//         `🚨 **ВАЖНАЯ ЗАДАЧА ОБНАРУЖЕНА!**\n\n` +
//         `📝 ${taskAnalysis.taskText}\n` +
//         `👤 Автор: ${taskAnalysis.author}\n` +
//         `⚡ Приоритет: 🔴 Высокий`,
//         {
//           parse_mode: 'Markdown',
//           reply_markup: {
//             inline_keyboard: [[
//               { text: '💾 Сохранить задачу', callback_data: `save_${taskId}` }
//             ]]
//           }
//         }
//       );
//     }
//   } catch (error) {
//     console.error('❌ Ошибка анализа задач:', error);
//   }
// }
