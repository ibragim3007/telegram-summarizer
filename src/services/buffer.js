export const messageBuffer = {
  storage: {},

  add(chatId, message) {
    if (!this.storage[chatId]) {
      this.storage[chatId] = [];
    }

    // Store minimal necessary data
    const msgData = {
      username: message.from?.username || message.from?.first_name || 'Anonymous',
      text: message.text || '',
      date: message.date
    };

    this.storage[chatId].push(msgData);

    // Keep last 100 messages per chat
    if (this.storage[chatId].length > 100) {
      this.storage[chatId].shift();
    }
  },

  getMessages(chatId) {
    return this.storage[chatId] || [];
  }
};
