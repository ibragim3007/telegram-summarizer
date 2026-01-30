import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { formatMessageForAI } from '../utils/telegram.js';

export const judgeCommand = async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const messages = bufferService.getBuffer(chatId);

    if (!messages || messages.length === 0) {
      return ctx.reply('Зал суда пуст. Нет дела для рассмотрения.');
    }

    await ctx.reply('⚖️ Встать! Суд идет! Изучаю материалы дела...');

    // Берем последние 100 сообщений
    const recentMessages = messages.slice(-100);

    const chatLog = recentMessages
      .filter(msg => msg.text)
      .map(msg => formatMessageForAI(msg))
      .join('\n');

    let prompt = "Ты - беспристрастный (или слегка саркастичный) судья. Твоя задача - разрешить спор в чате.\n";
    prompt += "Проанализируй последние сообщения, найди предмет спора (если он есть) и вынеси вердикт: кто прав, кто виноват и почему.\n";
    prompt += "Если явного спора нет, вынеси шуточный вердикт насчет общей атмосферы или самого активного участника.\n";
    prompt += "Ответ должен быть в формате:\n";
    prompt += "«👨‍⚖️ ВЕРДИКТ СУДА:\n\n[Описание ситуации]\n\n[Решение: кто прав/виноват]\n\n[Наказание или поощрение]»\n";
    prompt += "Пример: \"Проанализировав доводы, суд постановляет: @User1 прав, потому что @User2 перешел на личности. Дело закрыто.\"\n\n";
    prompt += `Материалы дела (лог чата):\n${chatLog}`;

    const response = await geminiService.simpleQuery(prompt);
    await ctx.reply(response);

  } catch (error) {
    console.error('Judge command error:', error);
    await ctx.reply('Судья ушел на обед. Заседание переносится.');
  }
};
