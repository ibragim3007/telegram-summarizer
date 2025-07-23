import { config } from '../config.js';
import { getMessageLink } from '../utils/telegram.js';

class BufferService {
  constructor() {
    this.buffers = new Map();
    this.maxSize = config.buffer.maxSize;
  }

  getBuffer(chatId) {
    return this.buffers.get(chatId) || [];
  }

  addMessage(chatId, message) {
    const buf = this.getBuffer(chatId);

    const user = message.from;
    const messageObj = {
      username: user.username ?? '',
      userId: user.id,
      displayName: [user.first_name, user.last_name].filter(Boolean).join(' '),
      date: message.date,
      text: message.text,
      link: getMessageLink(message.chat || { id: chatId }, message.message_id),
    };

    buf.push(messageObj);

    // Если буфер превысил лимит, удаляем самые старые сообщения
    if (buf.length >= this.maxSize) {
      buf.shift();
    }

    this.buffers.set(chatId, buf);
    return buf;
  }

  clearBuffer(chatId) {
    this.buffers.set(chatId, []);
  }

  getBufferSize(chatId) {
    return this.getBuffer(chatId).length;
  }

  getLastMessages(chatId, count = 20) {
    const buf = this.getBuffer(chatId);
    return buf.slice(-count);
  }

  shouldCheckTasks(chatId) {
    const buf = this.getBuffer(chatId);
    return buf.length % config.buffer.taskCheckInterval === 0 && buf.length >= config.buffer.taskCheckInterval;
  }
}

export const bufferService = new BufferService();
