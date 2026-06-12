/* ============================================================
 * Credit: abdullah al mamun (@A2MBD3)
 * ============================================================ */

const path = require('path');
const fs = require('fs');
const { obfuscateCode } = require('../services/obfuscatorService');
const {
  ensureTempDir,
  cleanupTempFile,
  saveUserOriginalFile,
  pruneUserOriginals,
  safeEditMessage,
} = require('../utils/fileUtils');
const config = require('../config');

const TEMP_DIR = path.join(require('os').tmpdir(), 'js-obfuscator-bot');

/**
 * Check if a user is the bot owner (from config).
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
 */
function getOutputFilename(originalName, userId) {
  const baseName = originalName.replace(/\.(js|mjs)$/i, '');
  const ext = isOwner(userId) ? '.js' : '.mjs';
  return `obfuscated-${baseName}${ext}`;
}

/**
 * Handle uploaded .js documents — obfuscate and return the result.
 * Non-owner users always receive .mjs output.
 * Owner receives .js output.
 *
 * @param {object} bot - node-telegram-bot-api instance.
 * @param {object} msg - Telegram message object.
 * @param {object} stats - Shared stats object { processedCount, uniqueUsers }.
 */
function handleDocument(bot, msg, stats) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const document = msg.document;

  if (!document) return;

  const fileName = document.file_name || 'script.js';
  const ext = path.extname(fileName).toLowerCase();

  if (ext !== '.js') {
    bot.sendMessage(chatId, '⚠️ Please upload a `.js` file. Other file types are not supported.');
    return;
  }

  if (document.file_size > config.maxFileSize) {
    bot.sendMessage(
      chatId,
      `⚠️ File is too large. Maximum allowed size is ${config.maxFileSize / 1024 / 1024} MB.`
    );
    return;
  }

  ensureTempDir();

  bot.sendMessage(chatId, '🔒 *Obfuscating your JavaScript...*', { parse_mode: 'Markdown' })
    .then((statusMsg) => {
      return bot.downloadFile(document.file_id, TEMP_DIR)
        .then((downloadedPath) => {
          // Read and immediately clean up the temp file
          let sourceCode;
          try {
            sourceCode = fs.readFileSync(downloadedPath, 'utf-8');
          } finally {
            cleanupTempFile(downloadedPath);
          }

          const result = obfuscateCode(sourceCode);

          if (!result.success) {
            return safeEditMessage(bot, chatId, statusMsg.message_id,
              `❌ *Obfuscation Failed*\n\n${result.error}`,
              { parse_mode: 'Markdown' }
            );
          }

          const obfuscated = result.result;

          // Persist the original and prune old files
          saveUserOriginalFile(chatId, sourceCode, fileName);
          pruneUserOriginals(chatId, config.maxOriginalsPerUser);

          // Update shared stats
          if (stats) {
            stats.processedCount++;
            stats.uniqueUsers.add(userId);
          }

          const outputFilename = getOutputFilename(fileName, userId);

          // FIX: filename must be in the 4th argument (fileOptions), NOT the
          // 3rd (sendOptions). Previously the file was sent with a random
          // Telegram-assigned name because filename was in the wrong param.
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
        })
        .catch((err) => {
          console.error('Error downloading/processing file:', err.message);
          return safeEditMessage(bot, chatId, statusMsg.message_id,
            '❌ *Download Failed*\n\nFailed to download the file. Please try again.',
            { parse_mode: 'Markdown' }
          );
        });
    })
    .catch((err) => {
      console.error('Error handling document:', err.message);
      bot.sendMessage(chatId, '❌ An unexpected error occurred. Please try again.');
    });
}

module.exports = { handleDocument };
