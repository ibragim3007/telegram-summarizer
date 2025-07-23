import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { statsPrompt } from '../prompts/index.js';
import { sanitizeMarkdown, safeReply } from '../utils/telegram.js';

export function setupStatsCommand(bot) {
  bot.command('stats', async (ctx) => {
    const chatId = ctx.chat.id;
    const buf = bufferService.getBuffer(chatId);

    if (!buf || buf.length === 0) {
      return ctx.reply('📭 Буфер пуст. Пока нет данных для статистики.');
    }

    // Показываем что бот анализирует
    await ctx.reply('📊 Анализирую статистику чата...');

    try {
      const stats = await generateChatStats(buf);
      const sanitizedStats = sanitizeMarkdown(stats);
      await safeReply(ctx, sanitizedStats, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('❌ Ошибка команды /stats:', error);
      await ctx.reply('❗ Произошла ошибка при анализе статистики.');
    }
  });
}

async function generateChatStats(messages) {
  // Подготавливаем базовую статистику
  const userStats = {};
  const timeStats = {};
  const totalMessages = messages.length;
  let totalWords = 0;
  let totalCharacters = 0;

  // Анализируем сообщения
  messages.forEach(msg => {
    // Статистика пользователей
    const userName = msg.displayName || msg.username || 'Аноним';
    if (!userStats[userName]) {
      userStats[userName] = { count: 0, words: 0, chars: 0 };
    }
    userStats[userName].count++;

    const words = msg.text.split(/\s+/).length;
    const chars = msg.text.length;

    userStats[userName].words += words;
    userStats[userName].chars += chars;
    totalWords += words;
    totalCharacters += chars;

    // Статистика по времени (час дня)
    const date = new Date(msg.date * 1000);
    const hour = date.getHours();
    timeStats[hour] = (timeStats[hour] || 0) + 1;
  });

  // Находим самый активный час
  const mostActiveHour = Object.entries(timeStats)
    .sort(([, a], [, b]) => b - a)[0];

  // Топ пользователей по сообщениям
  const topUsers = Object.entries(userStats)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5);

  // Создаем запрос для ИИ
  const aiPrompt = statsPrompt({
    totalMessages,
    totalWords,
    totalCharacters,
    avgWordsPerMessage: Math.round(totalWords / totalMessages),
    avgCharsPerMessage: Math.round(totalCharacters / totalMessages),
    topUsers: topUsers.map(([name, stats]) => ({
      name,
      messages: stats.count,
      avgWords: Math.round(stats.words / stats.count)
    })),
    mostActiveHour: mostActiveHour ? `${mostActiveHour[0]}:00 (${mostActiveHour[1]} сообщений)` : 'Нет данных',
    uniqueUsers: Object.keys(userStats).length
  });

  return await geminiService.generateStats(aiPrompt);
}
