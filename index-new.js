import { Telegraf } from 'telegraf';
import process from 'node:process';
import { config } from './src/config.js';
import { setupAllCommands } from './src/commands/index.js';

// Создаем бота
const bot = new Telegraf(config.telegram.token);

// Настраиваем все команды и обработчики
setupAllCommands(bot);

// Запускаем бота
bot.launch();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('🤖 Telegram Summarizer Bot запущен!');
console.log('📊 Максимальный размер буфера:', config.buffer.maxSize);
console.log('🔍 Проверка задач каждые', config.buffer.taskCheckInterval, 'сообщений');
