import 'dotenv/config';
import process from 'node:process';

export const config = {
  telegram: {
    token: process.env.TELEGRAM_API,
  },
  gemini: {
    apiKey: process.env.GOOGLE_GEMINI_API,
    model: 'gemini-2.0-flash',
  },
  imgflip: {
    username: process.env.IMGFLIP_USERNAME || 'imgflip_hubot',
    password: process.env.IMGFLIP_PASSWORD || 'imgflip_hubot',
  },
  buffer: {
    maxSize: parseInt(process.env.MESSAGES_SIZE) || 1000,
    taskCheckInterval: 10, // проверка задач каждые 10 сообщений
  },
  tasks: {
    timeout: 10 * 60 * 1000, // 10 минут для сохранения задач
  },
};
