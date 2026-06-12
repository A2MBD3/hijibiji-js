/* ============================================================
 * Credit: abdullah al mamun (@A2MBD3)
 * ============================================================ */

const http = require('http');
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { handleTextMessage } = require('./handlers/messageHandler');
const { handleDocument } = require('./handlers/documentHandler');
const { escapeMarkdown, ensureAllDirs } = require('./utils/fileUtils');

// ════════════════════════════════════════════════════════════
// STARTUP
// ════════════════════════════════════════════════════════════
ensureAllDirs();
console.log('📂 Directories verified at startup.');

const START_TIME = Date.now();

// Shared stats (in-memory, resets on restart)
const stats = {
  processedCount: 0,
  uniqueUsers: new Set(),
};

// ════════════════════════════════════════════════════════════
// HEALTH CHECK HTTP SERVER
// Kept alive so Render (and other platforms) can probe /health.
// For type:worker deployments, this is optional but harmless.
// ════════════════════════════════════════════════════════════
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      bot: 'JavaScript Obfuscator Bot',
      uptime: formatUptime(Date.now() - START_TIME),
      processed: stats.processedCount,
      uniqueUsers: stats.uniqueUsers.size,
      owner: 'abdullah al mamun (@A2MBD3)',
      timestamp: new Date().toISOString(),
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`💓 Health check server running on port ${config.port}`);
});

// ════════════════════════════════════════════════════════════
// VALIDATE BOT TOKEN
// ════════════════════════════════════════════════════════════
if (!config.botToken || config.botToken === 'your_telegram_bot_token_here') {
  console.error('❌ BOT_TOKEN is not set.');
  console.error('   Copy .env.example to .env and set your token from @BotFather,');
  console.error('   or set the BOT_TOKEN environment variable.');
  process.exit(1);
}

// ════════════════════════════════════════════════════════════
// RATE LIMITER
// In-memory per-user sliding window. Prevents bot abuse.
// ════════════════════════════════════════════════════════════
const rateLimitMap = new Map(); // userId → [timestamps]

/**
 * Returns true if the user has exceeded the rate limit.
 * @param {number} userId
 * @returns {boolean}
 */
function isRateLimited(userId) {
  if (isOwner(userId)) return false; // Owner is never rate-limited

  const { maxRequests, windowMs } = config.rateLimit;
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter((ts) => now - ts < windowMs);
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return recent.length > maxRequests;
}

// Clean up stale rate-limit entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - config.rateLimit.windowMs;
  for (const [userId, timestamps] of rateLimitMap) {
    const valid = timestamps.filter((ts) => ts > cutoff);
    if (valid.length === 0) {
      rateLimitMap.delete(userId);
    } else {
      rateLimitMap.set(userId, valid);
    }
  }
}, 5 * 60 * 1000);

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function isOwner(userId) {
  return Number(userId) === Number(config.ownerId);
}

function getOwnerMention() {
  return `👑 *Owner:* abdullah al mamun (@A2MBD3)\n🆔 \`${config.ownerId}\``;
}

/**
 * Format milliseconds as a human-readable uptime string.
 * @param {number} ms
 * @returns {string}
 */
function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

// ════════════════════════════════════════════════════════════
// BOT
// ════════════════════════════════════════════════════════════
const bot = new TelegramBot(config.botToken, { polling: true });

let isShuttingDown = false;

// ════════════════════════════════════════════════════════════
// COMMANDS — public
// ════════════════════════════════════════════════════════════

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const firstName = msg.from.first_name || 'there';

  let text =
    `👋 *Hello ${escapeMarkdown(firstName)}!*\n\n` +
    'Welcome to the *JavaScript Obfuscator Bot* 🔒\n\n' +
    'I can obfuscate your JavaScript code to make it harder to read and reverse-engineer.\n\n' +
    '📤 *How to use:*\n' +
    '• Send JavaScript code as a *text message*\n' +
    '• Upload a `.js` file\n\n' +
    '⚙️ Powered by [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator) ' +
    'with strong default settings.\n\n';

  if (isOwner(userId)) {
    text +=
      '👑 *You are the bot owner!*\n' +
      'Extra commands: `/stats` `/broadcast <msg>`\n\n';
  }

  text += `💡 _Tip:_ Your message must contain typical JS syntax so I can detect it as code.\n\n` +
    `⚠️ _Limit:_ ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000}s.`;

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  let text =
    '*📖 Help — JavaScript Obfuscator Bot*\n\n' +
    '• Send JavaScript code as a message\n' +
    '• Or upload a `.js` file\n' +
    '• I detect and obfuscate it automatically\n\n' +
    '*Commands:*\n' +
    '`/start` — Welcome & instructions\n' +
    '`/help` — This help message\n' +
    '`/about` — About this bot\n' +
    '`/ping` — Check bot is alive\n' +
    '`/uptime` — Show bot uptime\n' +
    '`/owner` — Show owner info\n';

  if (isOwner(userId)) {
    text +=
      '\n*👑 Owner Commands:*\n' +
      '`/stats` — Full bot statistics\n' +
      '`/broadcast <msg>` — Broadcast a message\n';
  }

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

bot.onText(/\/about/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    '*🤖 About*\n\n' +
    'This bot uses [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator) ' +
    'to transform your JavaScript into an obfuscated, hard-to-read version.\n\n' +
    '*Obfuscation features:*\n' +
    '• Control flow flattening\n' +
    '• Dead code injection\n' +
    '• RC4-encoded string arrays\n' +
    '• Self-defending mechanism\n' +
    '• Debug protection\n' +
    '• And many more...\n\n' +
    `${getOwnerMention()}\n\n` +
    '_Note: Obfuscation is not true security. Determined attackers can still reverse it._',
    { parse_mode: 'Markdown', disable_web_page_preview: true }
  );
});

bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, '🏓 *Pong!* Bot is alive and running.', { parse_mode: 'Markdown' });
});

bot.onText(/\/uptime/, (msg) => {
  const uptime = formatUptime(Date.now() - START_TIME);
  bot.sendMessage(msg.chat.id,
    `⏱ *Uptime:* \`${uptime}\``,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/owner/, (msg) => {
  bot.sendMessage(msg.chat.id, getOwnerMention(), { parse_mode: 'Markdown' });
});

// ════════════════════════════════════════════════════════════
// COMMANDS — owner only
// ════════════════════════════════════════════════════════════

bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isOwner(userId)) {
    bot.sendMessage(chatId, '⛔ *Access denied.* Owner only.', { parse_mode: 'Markdown' });
    return;
  }

  // FIX: /stats now shows real uptime and actual processed counts instead of
  // hardcoded "Uptime: Running" which was useless.
  bot.sendMessage(chatId,
    '*📊 Bot Statistics*\n\n' +
    `• *Uptime:* \`${formatUptime(Date.now() - START_TIME)}\`\n` +
    `• *Jobs processed:* \`${stats.processedCount}\`\n` +
    `• *Unique users:* \`${stats.uniqueUsers.size}\`\n` +
    `• *Owner ID:* \`${config.ownerId}\`\n` +
    `• *Mode:* Polling\n` +
    `• *Port:* \`${config.port}\`\n` +
    `• *Rate limit:* \`${config.rateLimit.maxRequests} req/${config.rateLimit.windowMs / 1000}s\``,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/broadcast (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isOwner(userId)) {
    bot.sendMessage(chatId, '⛔ *Access denied.* Owner only.', { parse_mode: 'Markdown' });
    return;
  }

  const broadcastMsg = match[1];
  bot.sendMessage(chatId, `📢 *Broadcast sent:*\n\n${escapeMarkdown(broadcastMsg)}`, { parse_mode: 'Markdown' });
  console.log(`📢 Owner broadcast: ${broadcastMsg}`);
});

// ════════════════════════════════════════════════════════════
// MESSAGE HANDLER (text + documents)
// ════════════════════════════════════════════════════════════

bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;

  const userId = msg.from && msg.from.id;
  const chatId = msg.chat.id;

  // Rate limit check
  if (userId && isRateLimited(userId)) {
    const { maxRequests, windowMs } = config.rateLimit;
    bot.sendMessage(chatId,
      `⏳ *Slow down!* You can send up to *${maxRequests} requests* per *${windowMs / 1000} seconds*.\n\nPlease wait a moment and try again.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (msg.document) {
    handleDocument(bot, msg, stats);
    return;
  }

  if (msg.text) {
    handleTextMessage(bot, msg, stats);
  }
});

// ════════════════════════════════════════════════════════════
// ERROR HANDLING
// ════════════════════════════════════════════════════════════

bot.on('polling_error', (error) => {
  console.error('⚠️ Polling error:', error.message);
});

bot.on('webhook_error', (error) => {
  console.error('⚠️ Webhook error:', error.message);
});

bot.on('error', (error) => {
  console.error('⚠️ Bot error:', error.message);
});

// ════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ════════════════════════════════════════════════════════════

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Give HTTP server 5 s to finish in-flight requests, then exit anyway
  const forceExit = setTimeout(() => {
    console.log('Force exit after timeout.');
    process.exit(0);
  }, 5000);
  forceExit.unref();

  server.close(() => console.log('HTTP server closed.'));

  bot.stopPolling()
    .then(() => {
      console.log('Bot polling stopped.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error stopping polling:', err.message);
      process.exit(1);
    });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

console.log('🤖 JavaScript Obfuscator Bot is running...');
console.log('📡 Waiting for messages...');
console.log(`👑 Owner ID: ${config.ownerId}`);
