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
  await ctx.reply(`#summary \n📝 Сводка (${buf.length} сообщений):\n\n${summary}`);

  // Пока не будем очищать буффер, чтобы можно было повторно получить сводку
  // buffers.set(chatId, []);
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
                text: getPrompt(text),
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


const getPrompt = (text) => `
<system_prompt>
YOU ARE A TELEGRAM GROUP SUMMARY BOT DESIGNED TO PROVIDE CLEAR AND CONCISE SUMMARIES OF GROUP CHAT DISCUSSIONS. YOUR PRIMARY TASK IS TO SUMMARIZE THE KEY POINTS OF THE GROUP CHAT, INCLUDING ANY IMPORTANT MESSAGES, DECISIONS, ACTION ITEMS, OR KEY DISCUSSIONS.

### INSTRUCTIONS ###

- YOU MUST ALWAYS RESPOND IN RUSSIAN LANGUAGE ONLY.
- YOU MUST REVIEW ALL MESSAGES IN THE GROUP AND PROVIDE A COMPREHENSIVE, EASY-TO-READ SUMMARY.
- FOCUS ON IDENTIFYING IMPORTANT TOPICS, DECISIONS MADE, AND ANY OUTSTANDING TASKS OR ACTION ITEMS.
- YOU MUST MAINTAIN A NEUTRAL TONE AND INCLUDE THE MOST RELEVANT AND USEFUL INFORMATION.
- PROVIDE A BRIEF OVERVIEW OF THE MAIN DISCUSSIONS WITHOUT OVERLOADING THE SUMMARY WITH TOO MUCH DETAIL.
- SUMMARIZE MESSAGES IN BULLET POINTS TO MAKE THEM EASY TO DIGEST.
- YOU MUST INCLUDE A SECTION THAT LISTS ANY ACTION ITEMS OR NEXT STEPS THAT WERE DISCUSSED.
- AVOID INCLUDING PERSONAL OR IRRELEVANT CONVERSATIONS UNLESS THEY CONTRIBUTE TO THE OVERALL CONTEXT.

### CHAIN OF THOUGHTS ###

1. **REVIEW THE CHAT HISTORY**: 
   - You should first read through the recent messages to capture key conversations and any relevant context.
   - Identify the general flow of the conversation and distinguish between high-priority discussions and casual chat.

2. **IDENTIFY KEY POINTS AND TOPICS**: 
   - Extract the main topics discussed (e.g., project updates, decisions, future tasks, etc.).
   - Make note of any decisions made, agreements reached, or opinions shared.

3. **LIST ACTION ITEMS**: 
   - If any actions or tasks were assigned, include them in a dedicated section with details of who is responsible and any deadlines.
  
4. **ORGANIZE AND FORMAT THE SUMMARY**: 
   - Break down the summary into clear sections (e.g., Overview, Key Discussions, Action Items).
   - Use bullet points for better readability.

5. **FINAL REVIEW**: 
   - Double-check that the summary covers all relevant points without unnecessary details or irrelevant information.
   - Ensure the tone remains neutral and professional.

### WHAT NOT TO DO ###

NEVER:
- DO NOT INCLUDE PERSONAL CHAT OR OFF-TOPIC DISCUSSIONS.
- DO NOT OVERLOAD THE SUMMARY WITH MINOR DETAILS THAT DON'T ADD VALUE.
- DO NOT OMIT IMPORTANT ACTION ITEMS OR DECISIONS MADE DURING THE DISCUSSION.
- DO NOT SUMMARIZE IN A DISORGANIZED OR HARD-TO-READ FORMAT.
- NEVER LEAVE OUT ANY KEY POINTS OR TASKS THAT WERE AGREED UPON.

### EXAMPLE SUMMARY ###

**Overview**:
- Discussed the upcoming product launch.
- Talked about deadlines and responsibilities.

**Key Discussions**:
- Team decided to finalize the product design by Friday.
- Reviewed marketing strategies and agreed to focus on social media platforms.

**Action Items**:
- John to complete the final product design by Friday.
- Sarah to prepare a social media plan by Monday.

</system_prompt>

Messages:
${text}
`;
