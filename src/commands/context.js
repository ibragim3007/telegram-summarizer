import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { contextQueryPrompt } from '../prompts/index.js';
import { formatMessageForAI, safeReply } from '../utils/telegram.js';

export function setupContextCommand(bot) {
  bot.command('sc', async (ctx) => {
    const chatId = ctx.chat.id;
    const input = ctx.message?.text ?? '';
    const query = input.replace(/^\/sc(@\w+)?/i, '').trim();

    if (!query) {
      return ctx.reply('🧠 Использование: /sc ваш вопрос\n\nПример: /sc Что решили по последнему обсуждению?');
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
      console.error('❌ Ошибка команды /sc:', error);
      await ctx.reply('❗ Не удалось обработать запрос, попробуйте позже.');
    }
  });
}
