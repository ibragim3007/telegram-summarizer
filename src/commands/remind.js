export function setupRemindCommand(bot) {
  bot.command('remind', (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 2) {
      ctx.reply('❌ Неверный формат. Используйте: /remind {время} {текст}\n\nПримеры:\n• /remind 5m обсудить проект\n• /remind 1h проверить задачи\n• /remind 30s тестовое напоминание');
      return;
    }

    const timeStr = args[0];
    const reminderText = args.slice(1).join(' ');

    // Парсим время
    const timeUnit = timeStr.slice(-1).toLowerCase();
    const timeValue = parseInt(timeStr.slice(0, -1));

    if (isNaN(timeValue) || timeValue <= 0) {
      ctx.reply('❌ Неверное время. Используйте число + единицу времени (s, m, h)\n\nПримеры: 30s, 5m, 2h');
      return;
    }

    let milliseconds;
    switch (timeUnit) {
      case 's':
        milliseconds = timeValue * 1000;
        break;
      case 'm':
        milliseconds = timeValue * 60 * 1000;
        break;
      case 'h':
        milliseconds = timeValue * 60 * 60 * 1000;
        break;
      default:
        ctx.reply('❌ Неверная единица времени. Используйте: s (секунды), m (минуты), h (часы)');
        return;
    }

    // Ограничиваем максимальное время напоминания (24 часа)
    const maxTime = 24 * 60 * 60 * 1000;
    if (milliseconds > maxTime) {
      ctx.reply('❌ Максимальное время напоминания - 24 часа');
      return;
    }

    // Форматируем время для отображения
    const formatTime = (ms) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) return `${hours}ч ${minutes % 60}м`;
      if (minutes > 0) return `${minutes}м`;
      return `${seconds}с`;
    };

    const formattedTime = formatTime(milliseconds);

    ctx.reply(`⏰ Напоминание установлено на ${formattedTime}!\n📝 "${reminderText}"`);

    // Устанавливаем таймер
    setTimeout(() => {
      ctx.reply(`🔔 Напоминание для @${ctx.from.username || ctx.from.first_name}:\n📝 ${reminderText}`);
    }, milliseconds);
  });
}
