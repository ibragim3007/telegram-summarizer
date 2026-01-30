import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { formatMessageForAI } from '../utils/telegram.js';

export const quoteCommand = async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const messages = bufferService.getBuffer(chatId);

    if (!messages || messages.length === 0) {
      return ctx.reply('В чате пусто... Некого цитировать.');
    }
    // Берем последние 100 сообщений
    const recentMessages = messages.slice(-100);

    const chatLog = recentMessages
      .filter(msg => msg.text && msg.text.length > 5) // Игнорируем совсем короткие
      .map(msg => formatMessageForAI(msg))
      .join('\n');

    let prompt = "Проанализируй этот лог чата и найди одно самое абсурдное, смешное без контекста или случайно философское сообщение.\n";
    prompt += "Оформи его как великую цитату известного мыслителя.\n";
    prompt += "Формат ответа (строго один вариант):\n";
    prompt += "«[Текст сообщения]»\n— (с) [Имя автора] [добавь эпитет, например: Великий Кормчий, Мыслитель, Диванный Эксперт], 2026 г.\n\n";
    prompt += "Пример: «А че если макароны это просто длинное тесто?» — (с) Великий Мыслитель Артем, 2026 г.\n\n";
    prompt += `Лог чата:\n${chatLog}`;

    const response = await geminiService.simpleQuery(prompt);
    await ctx.reply(response);

  } catch (error) {
    console.error('Quote command error:', error);
    await ctx.reply('Муза покинула чат. Попробуйте позже.');
  }
};
