import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import 'dotenv/config';
import process from 'node:process';

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

  const textBasic = buf.map(m => formatMessageForAI(m)).join('\n');
  const summary = await makeSummary(textBasic);
  await ctx.reply(`#summary \n📝 Сводка (${buf.length} сообщений):\n\n${summary}`, { parse_mode: 'Markdown' });

  // Пока не будем очищать буффер, чтобы можно было повторно получить сводку
  // buffers.set(chatId, []);
});

// Команда /clear
bot.command('clear', ctx => {
  const chatId = ctx.chat.id;
  buffers.set(chatId, []);
  ctx.reply('🧹 Буфер очищен.');
});

bot.command('help', ctx => {
  ctx.reply(`👋 Привет! Я бот для создания сводок в групповых чатах.)
  \n\nВот что я умею:
  \n- /summary - Создать сводку из последних ${SIZE} сообщений.
  \n- /clear - Очистить буфер сводки.
  \n- Просто напиши сообщение, и я буду собирать их для сводки.
  \n\nЯ использую Google Gemini Pro для создания сводок. Просто напиши что-нибудь в чате, и я соберу информацию для сводки.`);
});

bot.command('last', async ctx => {
  const chatId = ctx.chat.id;
  const buf = buffers.get(chatId);

  if (!buf || buf.length < 3) {
    return ctx.reply('📭 Слишком мало сообщений для анализа.');
  }

  // Возьмём последние 15 сообщений (если меньше — сколько есть)
  const lastMessages = buf.slice(-20);
  const textBasic = lastMessages.map(m => formatMessageForAI(m)).join('\n');

  const analysis = await makeTopicSummary(textBasic);

  await ctx.reply(`#last \n🧠 Последняя тема обсуждения:\n\n${analysis}`, {
    parse_mode: 'Markdown'
  });
});
// Приём сообщений
bot.on('message', async ctx => {
  const { id: chatId } = ctx.chat;
  const message = ctx.message;
  const text = message.text;
  if (!text || text.startsWith('/')) return;

  const user = message.from;
  const buf = buffers.get(chatId) ?? [];

  // Формируем объект
  const messageObj = {
    username: user.username ?? '',
    userId: user.id,
    displayName: [user.first_name, user.last_name].filter(Boolean).join(' '),
    date: message.date,
    text,
    link: getMessageLink(ctx.chat, message.message_id), // ссылка на сообщение
  };

  buf.push(messageObj);
  if (buf.length < SIZE) {
    buffers.set(chatId, buf);
    return;
  }

  buffers.set(chatId, []);
  const textBasic = buf.map(m => formatMessageForAI(m)).join('\n');

  const summary = await makeSummary(textBasic);

  await ctx.reply(`📝 Авто-сводка (${SIZE} сообщений):\n\n${summary}`, {
    parse_mode: 'Markdown'
  });
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
                text: getPromptV2(text),
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

async function makeTopicSummary(text) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleGeminiApi}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: getLastTopicPrompt(text),
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
      return '⚠️ Не удалось определить тему обсуждения.';
    }
  } catch (error) {
    console.error('❌ Ошибка Gemini:', error);
    return '❗ Ошибка при обращении к Gemini API.';
  }
}

const getPromptV2 = (text) => `
Ты — бот Telegram, анализирующий последние сообщения в чате.
На основе сообщений ниже кратко определи, о чём шло обсуждение:
— назови основную тему или вопрос;
- укажи кто инициировал обсуждение;
- кто активно участвовал;
- что было важного сказано;
- если обсуждение бессвязное или фоновое — так и скажи.

Ответ должен быть на русском языке, с эмодзи в начале каждой строки
и в 1-2 строках.

Чем короче, тем лучше. Не используй сложные слова и конструкции.
Отвечай в формате общеения участников в чате.
Так же укажи ссылку на сообщение, где началось обсуждение в формате: [перейти к сообщению](https://t.me/c/ID/MESSAGE_ID)


Так же используй форматирование Markdown, чтобы выделить важные моменты и улучшить читаемость.

Вот сам чат: ${text}
`;


// const getPrompt = (text) => `
// <system_prompt>
// YOU ARE A TELEGRAM GROUP SUMMARY BOT DESIGNED TO PROVIDE CLEAR AND CONCISE SUMMARIES OF GROUP CHAT DISCUSSIONS. YOUR PRIMARY TASK IS TO SUMMARIZE THE KEY POINTS OF THE GROUP CHAT, INCLUDING ANY IMPORTANT MESSAGES, DECISIONS, ACTION ITEMS, OR KEY DISCUSSIONS.

// ### INSTRUCTIONS ###

// - YOU MUST ALWAYS RESPOND IN RUSSIAN LANGUAGE ONLY.
// - YOU MUST REVIEW ALL MESSAGES IN THE GROUP AND PROVIDE A COMPREHENSIVE, EASY-TO-READ SUMMARY.
// - FOCUS ON IDENTIFYING IMPORTANT TOPICS, DECISIONS MADE, AND ANY OUTSTANDING TASKS OR ACTION ITEMS.
// - YOU MUST MAINTAIN A NEUTRAL TONE AND INCLUDE THE MOST RELEVANT AND USEFUL INFORMATION.
// - PROVIDE A BRIEF OVERVIEW OF THE MAIN DISCUSSIONS WITHOUT OVERLOADING THE SUMMARY WITH TOO MUCH DETAIL.
// - SUMMARIZE MESSAGES IN BULLET POINTS TO MAKE THEM EASY TO DIGEST.
// - YOU MUST INCLUDE A SECTION THAT LISTS ANY ACTION ITEMS OR NEXT STEPS THAT WERE DISCUSSED.
// - AVOID INCLUDING PERSONAL OR IRRELEVANT CONVERSATIONS UNLESS THEY CONTRIBUTE TO THE OVERALL CONTEXT.

// ### CHAIN OF THOUGHTS ###

// 1. **REVIEW THE CHAT HISTORY**: 
//    - You should first read through the recent messages to capture key conversations and any relevant context.
//    - Identify the general flow of the conversation and distinguish between high-priority discussions and casual chat.

// 2. **IDENTIFY KEY POINTS AND TOPICS**: 
//    - Extract the main topics discussed (e.g., project updates, decisions, future tasks, etc.).
//    - Make note of any decisions made, agreements reached, or opinions shared.

// 3. **LIST ACTION ITEMS**: 
//    - If any actions or tasks were assigned, include them in a dedicated section with details of who is responsible and any deadlines.

// 4. **ORGANIZE AND FORMAT THE SUMMARY**: 
//    - Break down the summary into clear sections (e.g., Overview, Key Discussions, Action Items).
//    - Use bullet points for better readability.

// 5. **FINAL REVIEW**: 
//    - Double-check that the summary covers all relevant points without unnecessary details or irrelevant information.
//    - Ensure the tone remains neutral and professional.

// ### WHAT NOT TO DO ###

// NEVER:
// - DO NOT INCLUDE PERSONAL CHAT OR OFF-TOPIC DISCUSSIONS.
// - DO NOT OVERLOAD THE SUMMARY WITH MINOR DETAILS THAT DON'T ADD VALUE.
// - DO NOT OMIT IMPORTANT ACTION ITEMS OR DECISIONS MADE DURING THE DISCUSSION.
// - DO NOT SUMMARIZE IN A DISORGANIZED OR HARD-TO-READ FORMAT.
// - NEVER LEAVE OUT ANY KEY POINTS OR TASKS THAT WERE AGREED UPON.

// ### EXAMPLE SUMMARY ###

// **Overview**:
// - Discussed the upcoming product launch.
// - Talked about deadlines and responsibilities.

// **Key Discussions**:
// - Team decided to finalize the product design by Friday.
// - Reviewed marketing strategies and agreed to focus on social media platforms.

// **Action Items**:
// - John to complete the final product design by Friday.
// - Sarah to prepare a social media plan by Monday.

// </system_prompt>

// Messages:
// ${text}
// `;

const getLastTopicPrompt = (text) => `
Ты — бот Telegram, анализирующий последние сообщения в чате.

На основе сообщений ниже кратко определи, о чём шло обсуждение:
— назови основную тему или вопрос;
— укажи примерное количество реплик;
— если обсуждение бессвязное или фоновое — так и скажи.

Ответ должен быть на русском языке, с эмодзи и в 1–3 строках.

Сообщения:
${text}
`;


function formatMessageForAI(msg) {
  const date = new Date(msg.date * 1000).toLocaleString('ru-RU');
  return `[${msg.displayName || msg.username} | ${date} | ${msg.link}]: ${msg.text}`;
}


function getMessageLink(chat, messageId) {
  const removeNegativeSign = chat.id.toString().replace('-', '');
  const remove100FromId = removeNegativeSign.startsWith('100') ? removeNegativeSign.slice(3) : removeNegativeSign;
  return `https://t.me/c/${remove100FromId}/${messageId}`;

}