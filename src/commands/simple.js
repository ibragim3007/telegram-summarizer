import { geminiService } from '../services/gemini.js';
import { simpleQueryPrompt } from '../prompts/index.js';
import { safeReply } from '../utils/telegram.js';

export function setupSimpleQueryCommand(bot) {
  bot.command('s', async (ctx) => {
    const input = ctx.message.text;
    const query = input.substring(2).trim(); // Убираем "/s" и пробелы

    if (!query) {
      return ctx.reply('💭 Использование: /s ваш вопрос к Gemini\n\nПример: /s Расскажи анекдот');
    }

    // Показываем что бот думает
    await ctx.reply('🤔 Думаю...');

    try {
      const response = await geminiService.simpleQuery(simpleQueryPrompt(query));
      await safeReply(ctx, `🤖 **Gemini отвечает:**\n\n${response}`, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('❌ Ошибка команды /s:', error);
      await ctx.reply('❗ Произошла ошибка при обращении к Gemini.');
    }
  });
}
