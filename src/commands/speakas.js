import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { formatMessageForAI } from '../utils/telegram.js';

export const speakAsCommand = async (ctx) => {
  try {
    const input = ctx.message.text.split(' ').slice(1); // Убираем саму команду
    if (input.length === 0) {
      return ctx.reply('Использование: /speakas {имя_пользователя} {тема (опционально)}');
    }

    let targetName = input[0];
    const topic = input.slice(1).join(' ');

    // Нормализуем имя (убираем @ если есть)
    if (targetName.startsWith('@')) {
      targetName = targetName.substring(1);
    }

    const chatId = ctx.chat.id;
    const messages = bufferService.getBuffer(chatId);

    if (!messages || messages.length === 0) {
      return ctx.reply('История чата пуста.');
    }

    const nameLower = targetName.toLowerCase();

    // Проверяем наличие пользователя в истории (чтобы было что анализировать)
    // Ищем в последних 200 сообщениях (если они есть) для точности
    const messagesToCheck = messages.slice(-200);
    const userMessages = messagesToCheck.filter(msg => {
      const uName = (msg.username || '').toLowerCase();
      const dName = (msg.displayName || '').toLowerCase();
      // Ищем точное совпадение юзернейма или частичное дисплейнейма
      return uName === nameLower || dName.includes(nameLower);
    });

    if (userMessages.length < 3) {
      return ctx.reply(`Слишком мало сообщений от пользователя "${targetName}" для анализа стиля (нужно хотя бы 3).`);
    }
    // Для контекста берем последние 100 сообщений
    const recentMessages = messages.slice(-100);
    const chatLog = recentMessages
      .filter(msg => msg.text)
      .map(msg => formatMessageForAI(msg))
      .join('\n');

    let prompt = `Ты - гениальный пародист. Твоя задача - полностью перевоплотиться в пользователя "${targetName}" (или с похожим именем из лога).\n`;
    prompt += "Проанализируй его сообщения в предоставленном логе. Скопируй его стиль до мелочей:\n";
    prompt += "1. Лексика: используй его любимые слова, сленг, паразиты.\n";
    prompt += "2. Грамматика и пунктуация: пишет ли он с большой буквы? ставит ли точки? много восклицательных знаков? капс?\n";
    prompt += "3. Эмодзи: используй те же смайлы и в том же количестве.\n";
    prompt += "4. Формат: короткие или длинные сообщения?\n\n";

    if (topic) {
      prompt += `Сгенерируй сообщение от его лица на тему: "${topic}".\n`;
    } else {
      prompt += `Сгенерируй сообщение от его лица, которое органично впишется в текущий контекст беседы (или просто в его типичном стиле).\n`;
    }

    prompt += "Важно: Не пиши никаких вступлений типа 'Вот сообщение'. Просто выдай текст сообщения как будто это написал он сам.\n\n";
    prompt += `Лог чата:\n${chatLog}`;

    const response = await geminiService.simpleQuery(prompt);
    await ctx.reply(response);

  } catch (error) {
    console.error('Speakas command error:', error);
    await ctx.reply('Маска треснула. Не удалось спародировать.');
  }
};
