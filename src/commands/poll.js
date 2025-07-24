import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { pollPrompt } from '../prompts/index.js';
import { formatMessageForAI, safeReply } from '../utils/telegram.js';

export function setupPollCommand(bot) {
  bot.command('poll', async (ctx) => {
    const chatId = ctx.chat.id;
    const buf = bufferService.getBuffer(chatId);

    if (!buf || buf.length === 0) {
      return ctx.reply('📭 Буфер пуст. Нет сообщений для анализа спорных моментов.');
    }

    try {
      await ctx.reply('🔍 Анализирую сообщения на предмет спорных моментов...');

      const textBasic = buf.map(m => formatMessageForAI(m)).join('\n');
      const result = await geminiService.generateSummary(pollPrompt(textBasic));

      let pollData;
      try {
        // Пытаемся распарсить JSON ответ
        const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        pollData = JSON.parse(cleanResult);
      } catch (parseError) {
        console.error('Ошибка парсинга JSON:', parseError);
        return ctx.reply('❌ Ошибка при анализе сообщений. Попробуйте позже.');
      }

      if (!pollData.hasPoll) {
        return ctx.reply(`🤷‍♂️ Спорных моментов не обнаружено.\n\n${pollData.reason || 'В текущих сообщениях нет явных разногласий или дискуссионных вопросов.'}`);
      }

      // Проверяем валидность данных опроса
      if (!pollData.question || !pollData.options || !Array.isArray(pollData.options) || pollData.options.length < 2) {
        return ctx.reply('❌ Не удалось сформировать корректный опрос из найденных спорных моментов.');
      }

      // Ограничиваем количество вариантов (Telegram поддерживает до 10)
      const options = pollData.options.slice(0, 10);

      // Создаем опрос
      try {
        await ctx.replyWithPoll(
          pollData.question,
          options,
          {
            is_anonymous: false, // Показываем кто голосовал
            allows_multiple_answers: false // Один ответ на человека
          }
        );

        await safeReply(ctx, `📊 Опрос создан на основе анализа ${buf.length} сообщений!`, {
          parse_mode: 'Markdown'
        });

      } catch (pollError) {
        console.error('Ошибка создания опроса:', pollError);

        // Fallback - показываем вопрос и варианты текстом
        let fallbackMessage = `📊 **Найден спорный момент:**\n\n❓ **${pollData.question}**\n\n**Варианты:**\n`;
        options.forEach((option, index) => {
          fallbackMessage += `${index + 1}. ${option}\n`;
        });
        fallbackMessage += '\n_Не удалось создать интерактивный опрос, но вы можете обсудить эти варианты._';

        await safeReply(ctx, fallbackMessage, { parse_mode: 'Markdown' });
      }

    } catch (error) {
      console.error('Ошибка в команде poll:', error);
      await ctx.reply('❌ Произошла ошибка при анализе сообщений. Попробуйте позже.');
    }
  });
}
