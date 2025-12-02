import { messageBuffer } from '../services/buffer.js'; // Assuming this exists based on context
import { ai } from '../services/openai.js'; // Assuming an AI service exists

export const psychoCommand = async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const messages = messageBuffer.getMessages(chatId);

    if (!messages || messages.length === 0) {
      return ctx.reply('Слишком мало материала для диагноза. Пишите больше, пациенты!');
    }

    await ctx.reply('⏳ Собираю консилиум психиатров... Анализирую ваши отклонения...');

    // Group messages by user
    const userMessages = {};
    messages.forEach(msg => {
      const username = msg.username || msg.from || 'Аноним';
      if (!userMessages[username]) userMessages[username] = [];
      userMessages[username].push(msg.text);
    });

    // Prepare prompt for AI
    let prompt = "Проведи жесткий и смешной психологический анализ участников чата на основе их сообщений. ";
    prompt += "Для каждого пользователя напиши 1-2 предложения. Стиль: прожарка (roast), цинично, как доктор Хаус или злой стендапер. \n\n";

    for (const [user, msgs] of Object.entries(userMessages)) {
      const textSample = msgs.slice(-10).join(" "); // Take last 10 messages
      prompt += `Пользователь ${user}: "${textSample}"\n`;
    }

    const response = await ai.generate(prompt); // Abstracted AI call
    await ctx.reply(response);

  } catch (error) {
    console.error('Psycho command error:', error);
    await ctx.reply('Доктор сейчас сам не в себе. Попробуйте позже.');
  }
};
