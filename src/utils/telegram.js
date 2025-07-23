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
    // Удаляем лишние пробелы
    .replace(/\s+/g, ' ')
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
