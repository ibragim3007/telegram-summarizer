import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import 'dotenv/config';

const bot = new Telegraf(process.env.TELEGRAM_API);
const googleGeminiApi = process.env.GOOGLE_GEMINI_API; // Google API Key

const buffers = new Map();
const SIZE = process.env.MESSAGES_SIZE || 100;

// Команда /summary
bot.command('summary', async ctx => {
  const chatId = ctx.chat.id;
  const buf = buffers.get(chatId);

  if (!buf || buf.length === 0) {
    return ctx.reply('📭 Буфер пуст. Пока нечего суммировать.');
  }

  const summary = await makeSummary(buf.join('\n'));
  await ctx.reply(`📝 Сводка (${buf.length} сообщений):\n\n${summary}`);
  buffers.set(chatId, []);
});

// Команда /clear
bot.command('clear', ctx => {
  const chatId = ctx.chat.id;
  buffers.set(chatId, []);
  ctx.reply('🧹 Буфер очищен.');
});

// Приём сообщений
bot.on('message', async ctx => {
  const { id: chatId } = ctx.chat;
  const text = ctx.message.text;
  if (!text || text.startsWith('/')) return;

  const buf = buffers.get(chatId) ?? [];
  buf.push(text);
  if (buf.length < SIZE) {
    buffers.set(chatId, buf);
    return;
  }

  buffers.set(chatId, []);
  const summary = await makeSummary(buf.join('\n'));
  await ctx.reply(`📝 Авто-сводка (${SIZE} сообщений):\n\n${summary}`);
});

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// 👉 Сводка через Google Gemini Pro (REST API)
async function makeSummary(text) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleGeminiApi}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Проанализируй сообщения ниже и сделай краткое резюме на русском языке. Выведи 3–7 ключевых тем, которые обсуждали чаще всего. Для каждой укажи:
  • краткий заголовок с эмодзи  
  • сколько раз тему упоминали (примерно)  
  • короткое пояснение
  Формат:
  1. 💬 [Тема] — ~X раз. [Краткое пояснение]
  Если тем мало — покажи только важные. Пиши просто, без сложных слов.
Сообщения:\n\n${text}`
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    } else {
      console.error('⚠️ Gemini API error:', data);
      return '⚠️ Не удалось создать сводку (Gemini не ответил).';
    }
  } catch (error) {
    console.error('❌ Ошибка Gemini:', error);
    return '❗ Ошибка при обращении к Gemini API.';
  }
}
