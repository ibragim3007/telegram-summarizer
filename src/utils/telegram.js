import fetch from 'node-fetch';
import { Buffer } from 'node:buffer';

export function formatMessageForAI(msg) {
  const date = new Date(msg.date * 1000).toLocaleString('ru-RU');
  return `[${msg.displayName || msg.username} | ${date} | ${msg.link}]: ${msg.text}`;
}

export function sanitizeMarkdown(text) {
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
    // Удаляем только лишние пробелы внутри строк, сохраняем переносы
    .replace(/[ \t]+/g, ' ')
    // Удаляем лишние пустые строки (больше 2 подряд)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function safeReply(ctx, text, options = {}) {
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

// Безопасная отправка фото с подписью: пробуем с заданным parse_mode,
// при ошибке очищаем подпись и отправляем без форматирования
export async function safeReplyWithPhoto(ctx, photo, options = {}) {
  try {
    // Если это memegen URL — сразу скачиваем и отправляем как буфер,
    // чтобы Telegram не пытался сам тянуть по URL (что иногда падает)
    if (typeof photo === 'string' && /https?:\/\/api\.memegen\.link\//i.test(photo)) {
      const res = await fetch(photo);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const opt = { ...options };
      await ctx.replyWithPhoto({ source: buffer, filename: 'meme.jpg' }, opt);
      return;
    }

    await ctx.replyWithPhoto(photo, options);
  } catch (error) {
    console.error('❌ Ошибка отправки фото (возможно, из‑за Markdown):', error);
    const cleanOptions = { ...options };
    if (cleanOptions.caption) {
      cleanOptions.caption = sanitizeMarkdown(cleanOptions.caption);
    }
    delete cleanOptions.parse_mode;
    try {
      // Повторяем попытку: если URL memegen — отправляем как буфер
      if (typeof photo === 'string' && /https?:\/\/api\.memegen\.link\//i.test(photo)) {
        const res = await fetch(photo);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await ctx.replyWithPhoto({ source: buffer, filename: 'meme.jpg' }, cleanOptions);
      } else {
        await ctx.replyWithPhoto(photo, cleanOptions);
      }
    } catch (secondError) {
      console.error('❌ Повторная ошибка отправки фото, пробуем загрузить файл напрямую:', secondError);
      // Последняя попытка: скачать картинку и отправить как файл-источник (если это URL)
      try {
        if (typeof photo === 'string' && /^https?:\/\//i.test(photo)) {
          const res = await fetch(photo);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await ctx.replyWithPhoto({ source: buffer }, cleanOptions);
        } else {
          throw secondError;
        }
      } catch (downloadError) {
        console.error('❌ Не удалось отправить фото даже после скачивания:', downloadError);
        // Бросаем дальше, чтобы вызывающая сторона могла сделать текстовый фолбэк
        throw downloadError;
      }
    }
  }
}

export function getMessageLink(chat, messageId) {
  const removeNegativeSign = chat.id.toString().replace('-', '');
  const remove100FromId = removeNegativeSign.startsWith('100') ? removeNegativeSign.slice(3) : removeNegativeSign;
  return `https://t.me/c/${remove100FromId}/${messageId}`;
}

export function getUniqueUsers(messages) {
  const uniqueUsers = [];
  const seenUserIds = new Set();

  for (const msg of messages) {
    if (!seenUserIds.has(msg.userId)) {
      seenUserIds.add(msg.userId);
      uniqueUsers.push({
        displayName: msg.displayName || msg.username || 'Аноним',
        username: msg.username,
        userId: msg.userId
      });
    }
  }

  return uniqueUsers;
}
