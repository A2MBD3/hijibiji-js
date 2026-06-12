/* ============================================================
 * Credit: abdullah al mamun (@A2MBD3)
 * ============================================================ */

const { obfuscateCode } = require('../services/obfuscatorService');
const {
  saveUserOriginalFile,
  pruneUserOriginals,
  safeEditMessage,
} = require('../utils/fileUtils');
const config = require('../config');

/**
 * Check if a user is the bot owner (from config).
 * @param {number} userId - Telegram user ID.
 * @returns {boolean}
 */
function isOwner(userId) {
  return Number(userId) === Number(config.ownerId);
}

/**
 * Get the output filename based on the user role.
 * Owner → .js | Other users → .mjs
 *
 * FIX: Removed the second aggressive .replace(/\.[^.]+$/, '') that incorrectly
 * stripped valid filename parts (e.g. "script.min.js" → "script" instead of
 * "script.min").
 *
 * @param {string} originalName - Original filename.
 * @param {number} userId - Telegram user ID.
 * @returns {string}
 */
function getOutputFilename(originalName, userId) {
  const baseName = originalName.replace(/\.(js|mjs)$/i, '');
  const ext = isOwner(userId) ? '.js' : '.mjs';
  return `obfuscated-${baseName}${ext}`;
}

/**
 * Handle incoming text messages that look like JavaScript code.
 * Non-owner users always receive .mjs output.
 * Owner receives .js output.
 *
 * @param {object} bot - node-telegram-bot-api instance.
 * @param {object} msg - Telegram message object.
 * @param {object} stats - Shared stats object { processedCount, uniqueUsers }.
 */
function handleTextMessage(bot, msg, stats) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (text.startsWith('/')) return;

  // Detect whether the message looks like JavaScript
  const jsIndicators = [
    /function\s*\(/,
    /=>/,
    /const\s+/,
    /let\s+/,
    /var\s+/,
    /console\./,
    /document\./,
    /module\.exports/,
    /require\(/,
    /import\s+/,
    /export\s+/,
    /class\s+/,
    /new\s+\w+\(/,
    /;\s*$/m,
    /[{}\[\]]/,
  ];

  const looksLikeCode = jsIndicators.some((pattern) => pattern.test(text));
  if (!looksLikeCode) return;

  bot.sendMessage(chatId, '🔒 *Obfuscating your JavaScript...*', { parse_mode: 'Markdown' })
    .then((statusMsg) => {
      try {
        const result = obfuscateCode(text);

        if (!result.success) {
          return safeEditMessage(bot, chatId, statusMsg.message_id,
            `❌ *Obfuscation Failed*\n\n${result.error}`,
            { parse_mode: 'Markdown' }
          );
        }

        const obfuscated = result.result;

        // Persist original and prune old files
        saveUserOriginalFile(chatId, text, 'message.js');
        pruneUserOriginals(chatId, config.maxOriginalsPerUser);

        // Update shared stats
        if (stats) {
          stats.processedCount++;
          stats.uniqueUsers.add(userId);
        }

        const outputFilename = getOutputFilename('message.js', userId);

        // FIX: Obfuscated output always contains backticks (hex string
        // literals), which break Telegram Markdown code blocks. The old code
        // tried to send short results inline in a ```js block — this caused
        // Telegram to render garbled or truncated output. Always send as a
        // file for reliable, correct delivery.
        //
        // FIX: filename must be in the 4th argument (fileOptions), NOT the
        // 3rd (sendOptions) — otherwise Telegram ignores the filename.
        return bot.deleteMessage(chatId, statusMsg.message_id)
          .catch(() => {})
          .then(() => bot.sendDocument(
            chatId,
            Buffer.from(obfuscated, 'utf-8'),
            {
              caption: `✅ *Obfuscated JavaScript*\n📄 \`${outputFilename}\``,
              parse_mode: 'Markdown',
            },
            {
              filename: outputFilename,
              contentType: 'application/javascript',
            }
          ));
      } catch (err) {
        console.error('Error during text obfuscation:', err.message);
        return safeEditMessage(bot, chatId, statusMsg.message_id,
          '❌ *Unexpected Error*\n\nAn error occurred while obfuscating your code. Please try again.',
          { parse_mode: 'Markdown' }
        );
      }
    })
    .catch((err) => {
      console.error('Error sending status message:', err.message);
      bot.sendMessage(chatId, '❌ An unexpected error occurred. Please try again.');
    });
}

module.exports = { handleTextMessage };
