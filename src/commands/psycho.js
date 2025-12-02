import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { formatMessageForAI } from '../utils/telegram.js';

export const psychoCommand = async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const messages = bufferService.getBuffer(chatId);

    if (!messages || messages.length === 0) {
      return ctx.reply('Слишком мало материала для диагноза. Пишите больше, пациенты!');
    }

    await ctx.reply('⏳ Собираю консилиум психиатров... Анализирую ваши отклонения...');

    // Берем последние 100 сообщений для анализа
    const recentMessages = messages.slice(-100);

    // Формируем единый лог чата
    const chatLog = recentMessages
      .filter(msg => msg.text)
      .map(msg => {
        // Адаптируем объект сообщения, если он в сыром формате Telegram (есть msg.from),
        // чтобы formatMessageForAI корректно подхватил имя
        const msgForAI = {
          ...msg,
          displayName: msg.displayName || (msg.from ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') : undefined),
          username: msg.username || msg.from?.username
        };
        return formatMessageForAI(msgForAI);
      })
      .join('\n');

    // Prepare prompt for AI
    let prompt = "Проведи жесткий и смешной психологический анализ участников чата на основе их сообщений.\n";
    prompt += "Для каждого пользователя, который встречается в логе, напиши короткое 1 предложение. Стиль: прожарка (roast), цинично, как доктор Хаус или злой стендапер.\n\n";
    prompt += `Лог чата:\n${chatLog}`;

    const response = await geminiService.generatePrediction(prompt);
    await ctx.reply(response);

  } catch (error) {
    console.error('Psycho command error:', error);
    await ctx.reply('Доктор сейчас сам не в себе. Попробуйте позже.');
  }
};
