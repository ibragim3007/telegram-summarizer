import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { formatMessageForAI } from '../utils/telegram.js';

export const timelineCommand = async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const messages = bufferService.getBuffer(chatId);

    if (!messages || messages.length < 10) {
      return ctx.reply('Слишком мало истории для создания временных парадоксов. Пишите больше!');
    }

    await ctx.reply('🌀 Запускаю машину времени... Ищу точку бифуркации...');

    // Берем последние 50 сообщений
    const recentMessages = messages.slice(-50);

    // Выбираем сообщение "из прошлого" (примерно 15-20 сообщений назад, если есть, иначе случайное из первой половины)
    const splitIndex = Math.max(0, recentMessages.length - 20);
    const targetMessageIndex = Math.floor(Math.random() * splitIndex);
    const targetMessage = recentMessages[targetMessageIndex];

    if (!targetMessage || !targetMessage.text) {
      return ctx.reply('Временной континуум нестабилен. Попробуйте позже.');
    }

    const chatLog = recentMessages
      .filter(msg => msg.text)
      .map(msg => formatMessageForAI(msg))
      .join('\n');

    let prompt = "Ты - сценарист альтернативных реальностей (эффект бабочки).\n";
    prompt += "Проанализируй этот лог чата и выбери одно поворотное сообщение (или просто случайное) из прошлого.\n";
    prompt += `Вот целевое сообщение для изменения: "${targetMessage.text}" от пользователя ${targetMessage.username || targetMessage.displayName}.\n`;
    prompt += "Придумай, как изменился бы ход разговора, если бы этот пользователь ответил что-то совсем другое (противоположное или неожиданное).\n";
    prompt += "Ответ должен быть коротким (1-2 предложения) и смешным.\n";
    prompt += "Формат:\n";
    prompt += "«🌀 Эффект бабочки: Если бы [Пользователь] вместо \"[Оригинальное сообщение]\" ответил \"[Альтернативный ответ]\", то к этому моменту [описание последствий].»\n";
    prompt += "Пример: «Если бы на вопрос \"Идем пить?\" @Alex ответил \"Нет\", то к этому моменту вы бы уже обсудили смысл жизни и квантовую физику, а не кидали стикеры с котами».\n\n";
    prompt += `Лог чата для контекста:\n${chatLog}`;

    const response = await geminiService.simpleQuery(prompt);
    await ctx.reply(response);

  } catch (error) {
    console.error('Timeline command error:', error);
    await ctx.reply('Машина времени сломалась. Мы застряли в этой реальности.');
  }
};
