import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { topicPrompt } from '../prompts/index.js';
import { formatMessageForAI, safeReply } from '../utils/telegram.js';

export function setupLastCommand(bot) {
  bot.command('last', async (ctx) => {
    const chatId = ctx.chat.id;
    const buf = bufferService.getBuffer(chatId);

    if (!buf || buf.length < 3) {
      return ctx.reply('📭 Слишком мало сообщений для анализа.');
    }

    const lastMessages = bufferService.getLastMessages(chatId, 20);
    const textBasic = lastMessages.map(m => formatMessageForAI(m)).join('\n');
    const analysis = await geminiService.generateTopic(topicPrompt(textBasic));

    await safeReply(ctx, `#last \n🧠 Последняя тема обсуждения:\n\n${analysis}`, {
      parse_mode: 'Markdown'
    });
  });
}
