import { Telegraf } from 'telegraf';
import process from 'node:process';
import { config } from './src/config.js';
import { setupAllCommands } from './src/commands/index.js';
import { bufferService } from './src/storage/buffer.js';

// Создаем бота
const bot = new Telegraf(config.telegram.token);

// Middleware для сбора сообщений в буфер
bot.on('text', (ctx, next) => {
  // Сохраняем только обычные сообщения, не команды
  if (ctx.message.text && !ctx.message.text.startsWith('/')) {
    bufferService.addMessage(ctx.chat.id, ctx.message);
  }
  return next();
});

// Настраиваем все команды и обработчики
setupAllCommands(bot);

// Запускаем бота
bot.launch();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('🤖 Telegram Summarizer Bot запущен!');
console.log('📊 Максимальный размер буфера:', config.buffer.maxSize);
