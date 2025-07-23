import { bufferService } from '../storage/buffer.js';

export function setupClearCommand(bot) {
  bot.command('clear', (ctx) => {
    const chatId = ctx.chat.id;
    bufferService.clearBuffer(chatId);
    ctx.reply('🧹 Буфер очищен.');
  });
}
