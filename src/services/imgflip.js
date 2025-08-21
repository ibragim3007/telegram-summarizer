// Memegen.link-only implementation (no API keys required)
import fetch from 'node-fetch';

class ImgFlipService {
  constructor() {
    // Разрешенные шаблоны (только эти будем использовать)
    this.allowedSlugs = new Set([
      'aag', 'ackbar', 'afraid', 'agnes', 'aint-got-time', 'ams', 'ants', 'apcr', 'astronaut', 'atis', 'away', 'awesome', 'awesome-awkward', 'awkward', 'awkward-awesome', 'bad', 'badchoice', 'balloon', 'bd', 'because', 'bender', 'bihw', 'bilbo', 'biw', 'blb', 'boat', 'bongo', 'both', 'box', 'bs', 'bus', 'buzz', 'cake', 'captain', 'captain-america', 'cb', 'cbb', 'cbg', 'center', 'ch', 'chair', 'cheems', 'chosen', 'cmm', 'country', 'crazypills', 'crow', 'cryingfloor', 'db', 'dbg', 'dg', 'disastergirl', 'dodgson', 'doge', 'dragon', 'drake', 'drowning', 'drunk', 'ds', 'dsm', 'dwight', 'elf', 'elmo', 'ermg', 'exit', 'fa', 'facepalm', 'fbf', 'feelsgood', 'fetch', 'fine', 'firsttry', 'fmr', 'friends', 'fry', 'fwp', 'gandalf', 'gb', 'gears', 'genie', 'ggg', 'glasses', 'gone', 'grave', 'gru', 'grumpycat', 'hagrid', 'handshake', 'happening', 'harold', 'headaches', 'hipster', 'home', 'icanhas', 'imsorry', 'inigo', 'interesting', 'ive', 'iw', 'jd', 'jetpack', 'jim', 'joker', 'jw', 'keanu', 'kermit', 'khaby-lame', 'kk', 'kombucha', 'kramer', 'leo', 'light'
    ]);

    // Кэш шаблонов memegen: slug → { name, lines, slug }
    this.templatesBySlug = new Map();
    this.cacheAt = 0;
    this.cacheTTL = 6 * 60 * 60 * 1000; // 6 часов
  }

  // Транслитерация кириллицы в латиницу (простой, читаемый вариант)
  transliterate(text = '') {
    const map = {
      А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'Zh', З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'Kh', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Shch', Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
      Ї: 'Yi', ї: 'yi', І: 'I', і: 'i', Є: 'Ye', є: 'ye', Ґ: 'G', ґ: 'g'
    };
    return String(text).split('').map(ch => map[ch] ?? ch).join('');
  }

  // Специальное кодирование текста для memegen.link
  encodeForMemegen(text) {
    // Сначала транслитерация в латиницу по требованию, затем чистка
    const t = (this.transliterate(text) || '').trim();
    if (!t) return '_';
    // Правила memegen: https://api.memegen.link/
    return t
      .replace(/\r?\n/g, ' ')        // переносы строк → пробел
      .replace(/_/g, '__')             // _  → __
      .replace(/-/g, '--')             // -  → --
      .replace(/\s+/g, '_')           // пробелы → _
      .replace(/\?/g, '~q')           // ? → ~q
      .replace(/%/g, '~p')             // % → ~p
      .replace(/#/g, '~h')             // # → ~h
      .replace(/\//g, '~s')           // / → ~s
      .replace(/"/g, "''");         // " → ''
  }

  // Создание через memegen.link (без авторизации)
  async createViaMemegen(templateOrId, topText, bottomText, extraText = '') {
    const tpl = await this.resolveTemplate(templateOrId);
    const slug = tpl.slug;
    const linesCount = tpl.lines || 2;

    const l0 = this.encodeForMemegen(topText);
    const l1 = this.encodeForMemegen(bottomText);
    const lExtra = this.encodeForMemegen(extraText);

    let url = `https://api.memegen.link/images/${slug}`;
    if (linesCount === 2) {
      url += `/${l0}/${l1}.jpg`;
    } else if (linesCount === 3) {
      // Для трехпанельных шаблонов: верх / средний / низ
      url += `/${l0}/${lExtra}/${l1}.jpg`;
    } else if (linesCount >= 4) {
      // Для четырехуровневых: используем extra как уровень 2, дублируем нижний
      const l3 = this.encodeForMemegen('');
      url += `/${l0}/${lExtra}/${l1}/${l3}.jpg`;
    } else {
      url += `/${l0}/${l1}.jpg`;
    }
    // Memegen отдаёт прямой контент по этому URL — Telegram должен его принять
    console.log(url)
    return url;
  }

  /**
   * Создает мем через memegen.link
  * @param {string} templateId - slug шаблона memegen (или URL, из которого можно извлечь slug)
   * @param {string} topText - Текст верхней панели
   * @param {string} bottomText - Текст нижней панели
   * @param {string} extraText - Дополнительный текст для шаблонов с 3+ панелями
   * @returns {Promise<string>} Прямой URL с нарисованным текстом
   */
  async createMeme(templateId, topText, bottomText, extraText = '') {
    const resolved = await this.resolveTemplate(templateId);
    if (!resolved) {
      throw new Error(`Неизвестный шаблон: ${templateId}`);
    }
    return this.createViaMemegen(resolved.slug, topText, bottomText, extraText);
  }

  /**
   * Получает информацию о доступных шаблонах
   */
  getAvailableTemplates() {
    // Возвращаем массив разрешенных шаблонов из кэша
    return Array.from(this.templatesBySlug.values()).filter(t => this.allowedSlugs.has(t.slug));
  }

  /**
   * Проверяет, существует ли шаблон
   */
  isValidTemplate(templateId) {
    if (!templateId) return false;
    const key = String(templateId);
    const slug = this.extractSlug(key);
    // Разрешаем только явно разрешенные слаги
    if (!this.allowedSlugs.has(slug)) return false;
    // Если кэш ещё пуст — считаем валидным, проверим при разрешении
    if (this.templatesBySlug.size === 0) return true;
    return this.templatesBySlug.has(slug);
  }

  /**
   * Разрешение шаблона по slug (или URL с ним)
   */
  async resolveTemplate(templateIdOrSlug) {
    await this.loadTemplates();
    if (!templateIdOrSlug) return null;
    const raw = String(templateIdOrSlug).trim();
    const key = this.extractSlug(raw);

    if (this.templatesBySlug.has(key) && this.allowedSlugs.has(key)) {
      return this.templatesBySlug.get(key);
    }
    // Фолбэк на drake, если ничего не нашли
    if (this.templatesBySlug.has('drake') && this.allowedSlugs.has('drake')) {
      return this.templatesBySlug.get('drake');
    }
    // Минимальный фолбэк без кэша
    return { name: 'Drake', lines: 2, slug: 'drake' };
  }

  // Загрузка и кэширование шаблонов memegen
  async loadTemplates() {
    const now = Date.now();
    if (this.templatesBySlug.size > 0 && (now - this.cacheAt) < this.cacheTTL) {
      return;
    }
    try {
      const res = await fetch('https://api.memegen.link/templates/');
      const list = await res.json();
      const map = new Map();
      for (const t of list) {
        if (!t?.id) continue;
        const slug = String(t.id);
        const name = t.name || slug;
        const lines = Number(t.lines) || 2;
        map.set(slug, { name, lines, slug });
      }
      if (map.size > 0) {
        this.templatesBySlug = map;
        this.cacheAt = now;
      }
    } catch {
      // Тихо игнорируем сетевые ошибки: используем предыдущий кэш/фолбэки
      // console.error('Failed to load memegen templates:', e);
    }
  }

  // Извлекаем slug из произвольной строки (в т.ч. URL)
  extractSlug(s) {
    let slug = s.toLowerCase();
    // Если это URL вида https://api.memegen.link/templates/<slug>
    const m = slug.match(/templates\/?([^/?#]+)/);
    if (m && m[1]) return m[1];
    // Если это URL изображения: /images/<slug>/...
    const m2 = slug.match(/images\/?([^/?#]+)/);
    if (m2 && m2[1]) return m2[1];
    return slug;
  }
}

export const imgFlipService = new ImgFlipService();
