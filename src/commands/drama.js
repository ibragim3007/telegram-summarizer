import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { formatMessageForAI } from '../utils/telegram.js';

export const dramaCommand = async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const messages = bufferService.getBuffer(chatId);

    if (!messages || messages.length === 0) {
      return ctx.reply('Тишина... Уровень драмы: 0%.');
    }

    await ctx.reply('🍿 Достаю попкорн... Измеряю уровень драмы...');

    // Берем последние 100 сообщений
    const recentMessages = messages.slice(-100);

    const chatLog = recentMessages
      .filter(msg => msg.text)
      .map(msg => formatMessageForAI(msg))
      .join('\n');

    let prompt = "Оцени уровень накала страстей (драмы) в этом чате от 0 до 100% на основе последних сообщений.\n";
    prompt += "Ответ должен быть в формате:\n";
    prompt += "\"Уровень драмы: X%. [Твой смешной и саркастичный комментарий]\"\n";
    prompt += "Пример: \"Уровень драмы: 85%. Чувствую запах бана и разбитых сердец. Продолжайте.\"\n\n";
    prompt += `Лог чата:\n${chatLog}`;

    const response = await geminiService.simpleQuery(prompt);
    await ctx.reply(response);

  } catch (error) {
    console.error('Drama command error:', error);
    await ctx.reply('Драма-метр зашкалило. Попробуйте позже.');
  }
};
