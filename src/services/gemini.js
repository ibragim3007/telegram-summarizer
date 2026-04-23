import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
  }

  async makeRequest(prompt) {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      if (text) {
        return text.trim();
      }
      console.error('⚠️ Gemini API error: пустой ответ', response);
      return null;
    } catch (error) {
      console.error('❌ Ошибка Gemini:', error);
      throw error;
    }
  }

  async generateSummary(prompt) {
    const result = await this.makeRequest(prompt);
    return result || '⚠️ Не удалось создать сводку (Gemini не ответил).';
  }

  async generateTopic(prompt) {
    const result = await this.makeRequest(prompt);
    return result || '⚠️ Не удалось определить тему обсуждения.';
  }

  async generateJoke(prompt) {
    const result = await this.makeRequest(prompt);
    return result || '😏 *молчаливо ухмыляется*';
  }

  async generateStats(prompt) {
    const result = await this.makeRequest(prompt);
    return result || '⚠️ Не удалось создать статистику.';
  }

  async simpleQuery(prompt) {
    const result = await this.makeRequest(prompt);
    return result || '⚠️ Не удалось получить ответ от Gemini.';
  }
}

export const geminiService = new GeminiService();
