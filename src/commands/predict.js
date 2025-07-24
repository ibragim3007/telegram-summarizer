import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { predictPrompt } from '../prompts/index.js';
import { formatMessageForAI, safeReply } from '../utils/telegram.js';

export function setupPredictCommand(bot) {
  bot.command('predict', async (ctx) => {
    const chatId = ctx.chat.id;
    const buf = bufferService.getBuffer(chatId);

    if (!buf || buf.length === 0) {
      return ctx.reply('📭 Буфер пуст. Нечего анализировать для предсказания.');
    }

    // Используем последние сообщения для более актуального предсказания
    const recentMessages = buf.slice(-20); // Берём последние 20 сообщений
    const textBasic = recentMessages.map(m => formatMessageForAI(m)).join('\n');

    try {
      const prediction = await geminiService.generatePrediction(predictPrompt(textBasic));

      await safeReply(ctx, `🔮 ${prediction}`, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('❌ Ошибка при генерации предсказания:', error);
      await safeReply(ctx, '⚠️ Произошла ошибка при предсказании развития чата. Попробуйте позже.');
    }
  });
}
