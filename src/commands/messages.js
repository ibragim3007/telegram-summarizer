import { bufferService } from '../storage/buffer.js';
// import { formatMessageForAI, safeReply } from '../utils/telegram.js';

export function setupMessageHandler(bot) {
  bot.on('message', async (ctx) => {
    const chatId = ctx.chat.id;
    const message = ctx.message;
    const text = message.text;

    if (!text || text.startsWith('/')) return;

    // Добавляем сообщение в буфер
    bufferService.addMessage(chatId, message);
  });
}

