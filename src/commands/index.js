import { setupSummaryCommand } from './summary.js';
import { setupClearCommand } from './clear.js';
import { setupHelpCommand } from './help.js';
import { setupLastCommand } from './last.js';
import { setupSosalCommand } from './sosal.js';
import { setupTasksCommand } from './tasks.js';
import { setupSimpleQueryCommand } from './simple.js';
import { setupStatsCommand } from './stats.js';
import { setupPollCommand } from './poll.js';
import { setupMemeCommand } from './meme.js';
import { setupRemindCommand } from './remind.js';
import { setupMessageHandler } from './messages.js';
import { setupCallbackHandler } from './callbacks.js';
import { setupContextCommand } from './context.js';
import { psychoCommand } from './psycho.js';
import { dramaCommand } from './drama.js';
import { quoteCommand } from './quote.js';
import { judgeCommand } from './judge.js';

export const setupAllCommands = (bot) => {
  // Команды
  setupSummaryCommand(bot);
  setupClearCommand(bot);
  setupHelpCommand(bot);
  setupLastCommand(bot);
  setupSosalCommand(bot);
  setupTasksCommand(bot);
  setupSimpleQueryCommand(bot);
  setupStatsCommand(bot);
  setupPollCommand(bot);
  setupMemeCommand(bot);
  setupRemindCommand(bot);
  setupContextCommand(bot);
  bot.command('psycho', psychoCommand);
  bot.command('drama', dramaCommand);
  bot.command('quote', quoteCommand);
  bot.command('judge', judgeCommand);

  // Обработчики
  setupMessageHandler(bot);
  setupCallbackHandler(bot);
};
