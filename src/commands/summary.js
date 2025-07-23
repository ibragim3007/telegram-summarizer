import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { summaryPrompt } from '../prompts/index.js';
import { formatMessageForAI, safeReply } from '../utils/telegram.js';

export function setupSummaryCommand(bot) {
  bot.command('summary', async (ctx) => {
    const chatId = ctx.chat.id;
    const buf = bufferService.getBuffer(chatId);

    if (!buf || buf.length === 0) {
      return ctx.reply('📭 Буфер пуст. Пока нечего суммировать.');
    }

    const textBasic = buf.map(m => formatMessageForAI(m)).join('\n');
    const summary = await geminiService.generateSummary(summaryPrompt(textBasic));

    await safeReply(ctx, `#summary \n📝 Сводка (${buf.length} сообщений):\n\n${summary}`, {
      parse_mode: 'Markdown'
    });
  });
}
