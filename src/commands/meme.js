import { bufferService } from '../storage/buffer.js';
import { geminiService } from '../services/gemini.js';
import { imgFlipService } from '../services/imgflip.js';
import { memePrompt } from '../prompts/index.js';
import { formatMessageForAI, safeReply, safeReplyWithPhoto } from '../utils/telegram.js';

export function setupMemeCommand(bot) {
  bot.command('meme', async (ctx) => {
    const chatId = ctx.chat.id;
    const buf = bufferService.getBuffer(chatId);

    if (!buf || buf.length === 0) {
      return ctx.reply('📭 Буфер пуст. Нет материала для создания мема! 😅');
    }

    try {
      await ctx.reply('🎨 Создаю мем на основе вашего обсуждения...');

      const textBasic = buf.map(m => formatMessageForAI(m)).join('\n');
      const result = await geminiService.generateSummary(memePrompt(textBasic));

      let memeData;
      try {
        // Пытаемся распарсить JSON ответ
        const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        memeData = JSON.parse(cleanResult);
      } catch (parseError) {
        console.error('Ошибка парсинга JSON:', parseError);

        // Fallback - создаем простой мем из обычного ответа
        const fallbackMeme = `🎭 **Мем дня:**\n\n😂 ${result}\n\n_На основе ${buf.length} сообщений_`;
        return safeReply(ctx, fallbackMeme, { parse_mode: 'Markdown' });
      }

      if (!memeData.hasMeme) {
        // Создаем текстовый мем про отсутствие контента
        const noContentMemes = [
          '🧠💭 Участники чата: пишут сообщения\n🧠🔥 Тот же чат: абсолютно ничего интересного для мема',
          '❌ Ожидание: яркое обсуждение\n✅ Реальность: обычная переписка без драмы',
          '🐕 *сидит в горящей комнате*\n🔥 Чат без мемного контента 🔥\n🐕 "Это нормально"',
          '👨 Я\n👩 Создание мема\n👩‍🦳 Отсутствие интересного контента в чате'
        ];

        const randomMeme = noContentMemes[Math.floor(Math.random() * noContentMemes.length)];
        const fallbackMessage = `🎭 **Мем дня:**\n\n${randomMeme}\n\n_${memeData.reason || 'В чате пока что слишком серьезно для мемов! 😄'}_`;

        return safeReply(ctx, fallbackMessage, { parse_mode: 'Markdown' });
      }


      console.log(memeData);
      // Проверяем, что у нас есть нужные данные для ImgFlip
      if (!memeData.templateId || !imgFlipService.isValidTemplate(memeData.templateId)) {
        // Fallback к текстовому мему
        const textMeme = `🎭 **Мем дня (${memeData.templateName || 'Custom'}):**\n\n${memeData.topText}\n${memeData.bottomText}\n\n_${memeData.description || ''}_`;
        return safeReply(ctx, textMeme, { parse_mode: 'Markdown' });
      }

      try {
        // Создаем мем через ImgFlip API
        await ctx.reply('🖼️ Генерирую картинку мема...');

        const memeUrl = await imgFlipService.createMeme(
          memeData.templateId,
          memeData.topText,
          memeData.bottomText,
          memeData.extraText
        );

        console.log(memeUrl)

        // Отправляем мем-картинку (безопасно, с ретраем без Markdown при ошибке)
        await safeReplyWithPhoto(ctx, memeUrl, {
          caption: `🎭 **Мем дня** (${memeData.templateName || 'Custom'})\n\n_${memeData.description || `На основе анализа ${buf.length} сообщений`}_ 😄`,
          parse_mode: 'Markdown'
        });

      } catch (imgError) {
        console.error('Ошибка создания мема через ImgFlip:', imgError);

        // Fallback к текстовому мему при ошибке API
        const fallbackText = `🎭 **Мем дня** (${memeData.templateName || 'Custom'}):\n\n📝 **Верх:** ${memeData.topText}\n📝 **Низ:** ${memeData.bottomText}`;
        const fullFallback = memeData.extraText ? `${fallbackText}\n📝 **Доп:** ${memeData.extraText}` : fallbackText;
        const finalMessage = `${fullFallback}\n\n_${memeData.description || `На основе анализа ${buf.length} сообщений`}_ 😄\n\n🤖 _Картинка не загрузилась, но мем всё равно смешной!_`;

        await safeReply(ctx, finalMessage, { parse_mode: 'Markdown' });
      }

    } catch (error) {
      console.error('Ошибка в команде meme:', error);

      // Emergency fallback мем
      const emergencyMemes = [
        '🤖❌ Когда ИИ не может создать мем\n😅 Но попытка была засчитана',
        '🧠💥 Мозг бота:\n"Надо создать мем"\n"Но что-то пошло не так"',
        '🔥🤖🔥\n"Всё хорошо, просто мем-генератор немного сломался"'
      ];

      const randomEmergencyMeme = emergencyMemes[Math.floor(Math.random() * emergencyMemes.length)];
      await ctx.reply(`🎭 **Аварийный мем:**\n\n${randomEmergencyMeme}\n\n_Попробуйте позже! 😊_`);
    }
  });
}
