import fetch from 'node-fetch';
import { config } from '../config.js';

class GeminiService {
  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.model = config.gemini.model;
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  async makeRequest(prompt) {
    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();

      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
      } else {
        console.error('⚠️ Gemini API error:', data);
        return null;
      }
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

  async analyzeForTasks(prompt) {
    try {
      const result = await this.makeRequest(prompt);
      if (!result) {
        return { hasTask: false };
      }

      // Очищаем ответ от markdown форматирования если есть
      const cleanResponse = result.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON:', parseError);
      return { hasTask: false };
    }
  }

  async simpleQuery(prompt) {
    const result = await this.makeRequest(prompt);
    return result || '⚠️ Не удалось получить ответ от Gemini.';
  }
}

export const geminiService = new GeminiService();
