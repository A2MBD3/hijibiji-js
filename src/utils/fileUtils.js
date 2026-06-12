/* ============================================================
 * Credit: abdullah al mamun (@A2MBD3)
 * ============================================================ */

const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'js-obfuscator-bot');
const ORIGINALS_DIR = path.join(__dirname, '..', '..', 'originals');

/**
 * Ensure the temp directory exists.
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Ensure the originals directory exists.
 */
function ensureOriginalsDir() {
  if (!fs.existsSync(ORIGINALS_DIR)) {
    fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
  }
}

/**
 * Ensure ALL required directories exist at startup.
 */
function ensureAllDirs() {
  ensureTempDir();
  ensureOriginalsDir();
}

/**
 * Save a user's original file into a user-specific folder.
 * Files are organized as: originals/<chatId>/<timestamp>-<filename>
 *
 * @param {number|string} chatId - The Telegram chat/user ID.
 * @param {string} sourceCode - The original JavaScript source code.
 * @param {string} filename - Original filename (e.g., 'script.js').
 * @returns {string} - Path to the saved original file.
 */
function saveUserOriginalFile(chatId, sourceCode, filename) {
  ensureOriginalsDir();

  const userDir = path.join(ORIGINALS_DIR, String(chatId));
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const timestamp = Date.now();
  const safeFilename = `${timestamp}-${filename}`;
  const filePath = path.join(userDir, safeFilename);

  fs.writeFileSync(filePath, sourceCode, 'utf-8');
  console.log(`📁 Original saved: ${filePath}`);

  return filePath;
}

/**
 * Delete old originals for a user, keeping only the newest `maxFiles`.
 * Called after every save to prevent unbounded disk growth.
 *
 * @param {number|string} chatId - Telegram chat/user ID.
 * @param {number} maxFiles - Maximum files to keep per user.
 */
function pruneUserOriginals(chatId, maxFiles = 20) {
  const userDir = path.join(ORIGINALS_DIR, String(chatId));
  if (!fs.existsSync(userDir)) return;

  try {
    const files = fs.readdirSync(userDir)
      .map((name) => ({
        name,
        // Filenames are "<timestamp>-<original>", so sort by leading number
        time: parseInt(name.split('-')[0], 10) || 0,
      }))
      .sort((a, b) => b.time - a.time); // newest first

    const toDelete = files.slice(maxFiles);
    for (const f of toDelete) {
      try {
        fs.unlinkSync(path.join(userDir, f.name));
      } catch (err) {
        console.error(`Failed to delete old original ${f.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Failed to prune originals for', chatId, err.message);
  }
}

/**
 * Clean up a temporary file safely.
 * @param {string} filePath - Path to the temp file.
 */
function cleanupTempFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Failed to cleanup temp file:', err.message);
  }
}

/**
 * Escape Telegram Markdown v1 special characters in plain text.
 * Does NOT escape backticks — those are used intentionally in code spans.
 *
 * @param {string} text - The text to escape.
 * @returns {string} - Escaped text safe for Markdown.
 */
function escapeMarkdown(text) {
  return String(text)
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[');
}

/**
 * Safely edit a Telegram message, falling back to a new message if editing
 * fails (e.g. message is too old or has already been deleted).
 *
 * @param {object} bot - node-telegram-bot-api instance.
 * @param {number|string} chatId - Chat ID.
 * @param {number} messageId - Message ID to edit.
 * @param {string} text - New text content.
 * @param {object} extra - Extra options passed to editMessageText / sendMessage.
 * @returns {Promise}
 */
function safeEditMessage(bot, chatId, messageId, text, extra = {}) {
  return bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    ...extra,
  }).catch((err) => {
    console.error('Failed to edit message, sending new one:', err.message);
    return bot.sendMessage(chatId, text, extra);
  });
}

module.exports = {
  cleanupTempFile,
  saveUserOriginalFile,
  pruneUserOriginals,
  ensureTempDir,
  ensureAllDirs,
  escapeMarkdown,
  safeEditMessage,
};
