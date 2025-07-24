import https from 'https';
import { Buffer } from 'buffer';
import { URLSearchParams } from 'url';

class ImgFlipService {
  constructor() {
    // Популярные шаблоны мемов с их ID
    this.templates = {
      '181913649': { name: 'Drake', boxes: 2 },
      '87743020': { name: 'Two Buttons', boxes: 2 },
      '112126428': { name: 'Distracted Boyfriend', boxes: 3 },
      '93895088': { name: 'Expanding Brain', boxes: 4 },
      '102156234': { name: 'Mocking SpongeBob', boxes: 2 },
      '4087833': { name: 'Waiting Skeleton', boxes: 2 },
      '61579': { name: 'One Does Not Simply', boxes: 2 },
      '124822590': { name: 'Left Exit 12 Off Ramp', boxes: 3 },
      '131087935': { name: 'Running Away Balloon', boxes: 2 },
      '178591752': { name: 'Tuxedo Winnie The Pooh', boxes: 2 }
    };
  }

  /**
   * Создает мем через ImgFlip API
   * @param {string} templateId - ID шаблона мема
   * @param {string} topText - Текст верхней панели
   * @param {string} bottomText - Текст нижней панели
   * @param {string} extraText - Дополнительный текст для шаблонов с 3+ панелями
   * @returns {Promise<string>} URL созданного мема
   */
  async createMeme(templateId, topText, bottomText, extraText = '') {
    return new Promise((resolve, reject) => {
      const template = this.templates[templateId];
      if (!template) {
        reject(new Error(`Неизвестный шаблон: ${templateId}`));
        return;
      }

      // Подготавливаем параметры для API
      const params = new URLSearchParams({
        template_id: templateId,
        username: 'imgflip_hubot',  // Публичный тестовый аккаунт
        password: 'imgflip_hubot',
        text0: topText || '',
        text1: bottomText || ''
      });

      // Добавляем дополнительный текст для шаблонов с 3+ панелями
      if (extraText && template.boxes >= 3) {
        params.append('text2', extraText);
      }

      const postData = params.toString();

      const options = {
        hostname: 'api.imgflip.com',
        path: '/caption_image',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);

            if (response.success) {
              resolve(response.data.url);
            } else {
              reject(new Error(`ImgFlip API error: ${response.error_message}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse ImgFlip response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Получает информацию о доступных шаблонах
   */
  getAvailableTemplates() {
    return this.templates;
  }

  /**
   * Проверяет, существует ли шаблон
   */
  isValidTemplate(templateId) {
    return Object.prototype.hasOwnProperty.call(this.templates, templateId);
  }
}

export const imgFlipService = new ImgFlipService();
