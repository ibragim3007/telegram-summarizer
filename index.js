/**
 * Старый монолит перенесён в index.legacy.js (не запускайте его — там тоже bot.launch).
 * Единственная точка входа: index-new.js (npm start).
 * Два процесса с long polling на один TELEGRAM_API → Telegram 409 Conflict.
 */
import process from 'node:process';

console.error(
  'Этот файл не запускает бота. Используйте:\n' +
  '  npm start\n' +
  'или:\n' +
  '  node index-new.js\n' +
  '\n' +
  'Старый код для справки: index.legacy.js'
);
process.exit(1);
