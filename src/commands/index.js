import { setupSummaryCommand } from './summary.js';
import { setupClearCommand } from './clear.js';
import { setupHelpCommand } from './help.js';
import { setupLastCommand } from './last.js';
import { setupSosalCommand } from './sosal.js';
import { setupTasksCommand } from './tasks.js';
import { setupSimpleQueryCommand } from './simple.js';
import { setupStatsCommand } from './stats.js';
import { setupPredictCommand } from './predict.js';
import { setupRemindCommand } from './remind.js';
import { setupMessageHandler } from './messages.js';
import { setupCallbackHandler } from './callbacks.js';

export function setupAllCommands(bot) {
  // Команды
  setupSummaryCommand(bot);
  setupClearCommand(bot);
  setupHelpCommand(bot);
  setupLastCommand(bot);
  setupSosalCommand(bot);
  setupTasksCommand(bot);
  setupSimpleQueryCommand(bot);
  setupStatsCommand(bot);
  setupPredictCommand(bot);
  setupRemindCommand(bot);

  // Обработчики
  setupMessageHandler(bot);
  setupCallbackHandler(bot);
}
