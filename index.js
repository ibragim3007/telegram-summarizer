import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import 'dotenv/config';
import process from 'node:process';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'node:path';

const bot = new Telegraf(process.env.TELEGRAM_API);
const googleGeminiApi = process.env.GOOGLE_GEMINI_API; // Google API Key

const buffers = new Map();
const tasks = new Map(); // Хранение задач по chatId
const pendingTasks = new Map(); // Временное хранение задач для кнопок
const SIZE = process.env.MESSAGES_SIZE || 100;

// Команда /summary
bot.command('summary', async ctx => {
  const { id: chatId } = ctx.chat;
  const buf = buffers.get(chatId);

  if (!buf || buf.length === 0) {
    return ctx.reply('📭 Буфер пуст. Пока нечего суммировать.');
  }

  const textBasic = buf.map(m => formatMessageForAI(m)).join('\n');

  const summary = await makeSummary(textBasic);

  await safeReply(ctx, `#summary \n📝 Сводка (${buf.length} сообщений):\n\n${summary}`, { parse_mode: 'Markdown' });

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
  \n- /last - Показать последнюю тему обсуждения.
  \n- /tasks - Показать все сохраненные задачи.
  \n- /clear - Очистить буфер сводки.
  \n- /sosal - Случайно выбрать пользователя 🍭
  \n- Просто напиши сообщение, и я буду собирать их для сводки.
  \n\n🤖 Я автоматически отслеживаю упоминания задач и идей каждые 10 сообщений!
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
  ;

  await safeReply(ctx, `#last \n🧠 Последняя тема обсуждения:\n\n${analysis}`, {
    parse_mode: 'Markdown'
  });
});

bot.command('sosal', async ctx => {
  const chatId = ctx.chat.id;
  const buf = buffers.get(chatId);

  if (!buf || buf.length === 0) {
    return ctx.reply('📭 Буфер пуст. Пока некого выбирать.');
  }

  // Получаем уникальных пользователей из буфера
  const uniqueUsers = [];
  const seenUserIds = new Set();

  for (const msg of buf) {
    if (!seenUserIds.has(msg.userId)) {
      seenUserIds.add(msg.userId);
      uniqueUsers.push({
        displayName: msg.displayName || msg.username || 'Аноним',
        username: msg.username
      });
    }
  }

  if (uniqueUsers.length === 0) {
    return ctx.reply('🤷‍♂️ Не найдено пользователей в буфере.');
  }

  // Случайно выбираем пользователя
  const randomUser = uniqueUsers[Math.floor(Math.random() * uniqueUsers.length)];

  // Получаем контекст чата для генерации шутки
  const chatText = buf.slice(-20).map(m => formatMessageForAI(m)).join('\n');

  // Сначала отправляем основное сообщение
  await ctx.reply(`${randomUser.displayName} – сосал 🍭`);

  // Затем генерируем и отправляем шутку
  const joke = await makeSosalJoke(randomUser.displayName, chatText);

  await safeReply(ctx, joke, { parse_mode: 'Markdown' });
});

bot.command('tasks', async ctx => {
  const chatId = ctx.chat.id;
  const savedTasks = await getTasksFromFile(chatId);

  if (savedTasks.length === 0) {
    return ctx.reply('📝 Нет сохраненных задач для этого чата.');
  }

  let message = '📋 **Сохраненные задачи:**\n\n';
  savedTasks.forEach((task, index) => {
    const date = new Date(task.createdAt).toLocaleDateString('ru-RU');
    const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
    message += `${index + 1}. ${priority} **${task.taskText}**\n`;
    message += `   👤 Автор: ${task.author}\n`;
    message += `   📅 ${date}\n\n`;
  });

  await ctx.reply(message, { parse_mode: 'Markdown' });
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

  // Проверяем на задачи каждые 10 сообщений
  if (buf.length % 10 === 0 && buf.length >= 10) {
    const last10Messages = buf.slice(-10).map(m => formatMessageForAI(m)).join('\n');
    const taskAnalysis = await analyzeForTasks(last10Messages);

    if (taskAnalysis.hasTask) {
      const taskData = {
        taskText: taskAnalysis.taskText,
        author: taskAnalysis.author,
        priority: taskAnalysis.priority,
        chatId: chatId
      };

      // Генерируем короткий ID для задачи
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      pendingTasks.set(taskId, taskData);


      // Удаляем задачу через 10 минут, если она не была сохранена
      setTimeout(() => {
        pendingTasks.delete(taskId);
      }, 10 * 60 * 1000);

      await safeReply(ctx,
        `🎯 **Обнаружена задача/идея!**\n\n` +
        `📝 ${taskAnalysis.taskText}\n` +
        `👤 Автор: ${taskAnalysis.author}\n` +
        `⚡ Приоритет: ${taskAnalysis.priority === 'high' ? '🔴 Высокий' : taskAnalysis.priority === 'medium' ? '🟡 Средний' : '🟢 Низкий'}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '💾 Сохранить задачу', callback_data: `save_${taskId}` }
            ]]
          }
        }
      );
    }
  }

  if (buf.length < SIZE) {
    buffers.set(chatId, buf);
    return;
  }

  buffers.set(chatId, []);
  const textBasic = buf.map(m => formatMessageForAI(m)).join('\n');

  const summary = await makeSummary(textBasic);


  await safeReply(ctx, `📝 Авто-сводка (${SIZE} сообщений):\n\n${summary}`, {
    parse_mode: 'Markdown'
  });
});

// Обработчик для кнопки сохранения задач
bot.on('callback_query', async ctx => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith('save_')) {
    const taskId = data.replace('save_', '');
    const taskData = pendingTasks.get(taskId);

    if (!taskData) {
      await ctx.answerCbQuery('❌ Задача больше недоступна (истекло время)');
      return;
    }

    try {
      const savedTaskId = await saveTaskToFile(taskData.chatId, taskData);

      if (savedTaskId) {
        await ctx.answerCbQuery('✅ Задача сохранена!');
        await ctx.editMessageText(
          `✅ **Задача сохранена!**\n\n` +
          `📝 ${taskData.taskText}\n` +
          `👤 Автор: ${taskData.author}\n` +
          `🆔 ID: ${savedTaskId}`,
          { parse_mode: 'Markdown' }
        );

        // Удаляем задачу из временного хранения
        pendingTasks.delete(taskId);
      } else {
        await ctx.answerCbQuery('❌ Ошибка сохранения');
      }
    } catch (error) {
      console.error('❌ Ошибка обработки callback:', error);
      await ctx.answerCbQuery('❌ Ошибка обработки');
    }
  }
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

async function makeSosalJoke(userName, chatText) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleGeminiApi}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: getSosalJokePrompt(userName, chatText),
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
      return '😏 *молчаливо ухмыляется*';
    }
  } catch (error) {
    console.error('❌ Ошибка Gemini:', error);
    return '🤖 *сломался от смеха*';
  }
}

async function analyzeForTasks(messages) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleGeminiApi}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: getTaskDetectionPrompt(messages),
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const responseText = data.candidates[0].content.parts[0].text.trim();
      try {
        // Очищаем ответ от markdown форматирования если есть
        const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        return JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError);
        return { hasTask: false };
      }
    } else {
      console.error('⚠️ Gemini API error:', data);
      return { hasTask: false };
    }
  } catch (error) {
    console.error('❌ Ошибка анализа задач:', error);
    return { hasTask: false };
  }
}

async function saveTaskToFile(chatId, taskData) {
  try {
    const tasksDir = path.join(process.cwd(), 'tasks');
    await fs.mkdir(tasksDir, { recursive: true });

    const fileName = `chat_${chatId}_tasks.json`;
    const filePath = path.join(tasksDir, fileName);

    let existingTasks = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      existingTasks = JSON.parse(fileContent);
    } catch (error) {
      // Файл не существует, создаем новый
    }

    const newTask = {
      ...taskData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      chatId
    };

    existingTasks.push(newTask);
    await fs.writeFile(filePath, JSON.stringify(existingTasks, null, 2));

    return newTask.id;
  } catch (error) {
    console.error('❌ Ошибка сохранения задачи:', error);
    return null;
  }
}

async function getTasksFromFile(chatId) {
  try {
    const tasksDir = path.join(process.cwd(), 'tasks');
    const fileName = `chat_${chatId}_tasks.json`;
    const filePath = path.join(tasksDir, fileName);

    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    return [];
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

const getSosalJokePrompt = (userName, chatText) => `
Ты — злобный и остроумный бот в Telegram чате. Только что случайно выбрали пользователя "${userName}" для шуточной фразы "${userName} - сосал".

Твоя задача: написать короткую (1-2 предложения), смешную и слегка оскорбительную шутку про этого пользователя, основываясь на стиле общения в чате.

Требования:
- Используй стиль общения участников чата
- Можешь быть грубым и саркастичным  
- Шутка должна быть смешной и жестокой
- 1-2 предложения максимум
- Используй эмодзи для усиления эффекта
- Можешь играть на особенностях речи или поведении пользователя из истории чата

Контекст чата:
${chatText}
`;

const getTaskDetectionPrompt = (messages) => `
Ты — бот-анализатор Telegram чата, который ищет упоминания задач, планов и идей в сообщениях.

Проанализируй последние сообщения и определи, есть ли в них:
- Задания или поручения (например: "нужно сделать", "давайте...", "надо бы")
- Планы (например: "планируем", "собираемся", "будем делать")
- Идеи (например: "предлагаю", "как насчет", "может быть")
- TODO items или действия для выполнения
- Договоренности о встречах или событиях

ВАЖНО: Отвечай ТОЛЬКО в формате JSON:
{
  "hasTask": true/false,
  "taskText": "краткое описание задачи/идеи/плана",
  "author": "имя автора идеи",
  "priority": "low/medium/high"
}

Если задач нет, верни:
{
  "hasTask": false
}

Сообщения для анализа:
${messages}
`;


function formatMessageForAI(msg) {
  const date = new Date(msg.date * 1000).toLocaleString('ru-RU');
  return `[${msg.displayName || msg.username} | ${date} | ${msg.link}]: ${msg.text}`;
}

function sanitizeMarkdown(text) {
  if (!text) return text;

  // Удаляем или исправляем проблемные Markdown символы
  return text
    // Экранируем одиночные звездочки, которые не являются парными
    .replace(/\*([^*]*?)\*/g, (match, content) => {
      // Если содержимое пустое или содержит переносы строк, удаляем звездочки
      if (!content.trim() || content.includes('\n')) {
        return content;
      }
      return match;
    })
    // Удаляем неправильные bullet points
    .replace(/^\s*\*\s+/gm, '• ')
    // Исправляем двойные звездочки
    .replace(/\*\*([^*]*?)\*\*/g, '*$1*')
    // Удаляем одиночные звездочки в начале строк
    .replace(/^\*\s*/gm, '• ')
    // Очищаем лишние символы
    .replace(/[_~`]/g, '')
    // Исправляем ссылки в квадратных скобках
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)')
    // Удаляем лишние пробелы
    .replace(/\s+/g, ' ')
    .trim();
}

async function safeReply(ctx, text, options = {}) {
  try {
    // Сначала пробуем с Markdown
    if (options.parse_mode === 'Markdown') {
      await ctx.reply(text, options);
    } else {
      await ctx.reply(text, options);
    }
  } catch (error) {
    console.error('❌ Ошибка отправки с Markdown, отправляем без форматирования:', error);
    // Если не получилось с Markdown, отправляем без форматирования
    const cleanText = sanitizeMarkdown(text);
    const optionsWithoutMarkdown = { ...options };
    delete optionsWithoutMarkdown.parse_mode;
    await ctx.reply(cleanText, optionsWithoutMarkdown);
  }
}


function getMessageLink(chat, messageId) {
  const removeNegativeSign = chat.id.toString().replace('-', '');
  const remove100FromId = removeNegativeSign.startsWith('100') ? removeNegativeSign.slice(3) : removeNegativeSign;
  return `https://t.me/c/${remove100FromId}/${messageId}`;

}