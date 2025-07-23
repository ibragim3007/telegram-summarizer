import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { jokePrompt } from '../prompts/index.js';
import { formatMessageForAI, safeReply, getUniqueUsers } from '../utils/telegram.js';

export function setupSosalCommand(bot) {
  bot.command('sosal', async (ctx) => {
    const chatId = ctx.chat.id;
    const buf = bufferService.getBuffer(chatId);

    if (!buf || buf.length === 0) {
      return ctx.reply('📭 Буфер пуст. Пока некого выбирать.');
    }

    const uniqueUsers = getUniqueUsers(buf);

    if (uniqueUsers.length === 0) {
      return ctx.reply('🤷‍♂️ Не найдено пользователей в буфере.');
    }

    // Случайно выбираем пользователя
    const randomUser = uniqueUsers[Math.floor(Math.random() * uniqueUsers.length)];

    // Получаем контекст чата для генерации шутки
    const lastMessages = bufferService.getLastMessages(chatId, 20);
    const chatText = lastMessages.map(m => formatMessageForAI(m)).join('\n');

    // Сначала отправляем основное сообщение
    await ctx.reply(`${randomUser.displayName} – сосал 🍭`);

    // Затем генерируем и отправляем шутку
    const joke = await geminiService.generateJoke(jokePrompt(randomUser.displayName, chatText));
    await safeReply(ctx, joke, { parse_mode: 'Markdown' });
  });
}
