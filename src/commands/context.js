import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { contextQueryPrompt } from '../prompts/index.js';
import { formatMessageForAI, safeReply } from '../utils/telegram.js';

export function setupContextCommand(bot) {
  bot.command('askchat', async (ctx) => {
    const chatId = ctx.chat.id;
    const input = ctx.message?.text ?? '';
    const query = input.replace(/^\/askchat(@\w+)?/i, '').trim();

    if (!query) {
      return ctx.reply('🧠 Использование: /askchat ваш вопрос\n\nПример: /askchat Что решили по последнему обсуждению?');
    }

    const buffer = bufferService.getBuffer(chatId);

    if (!buffer || buffer.length === 0) {
      return ctx.reply('📭 Буфер пуст — нечего анализировать.');
    }

    await ctx.reply('🗂️ Собираю историю чата...');

    try {
      const history = buffer.map((message) => formatMessageForAI(message)).join('\n');
      const response = await geminiService.simpleQuery(contextQueryPrompt(history, query));

      await safeReply(ctx, `🧠 **Ответ с учетом ${buffer.length} сообщений:**\n\n${response}`, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('❌ Ошибка команды /askchat:', error);
      await ctx.reply('❗ Не удалось обработать запрос, попробуйте позже.');
    }
  });
}
