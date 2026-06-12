/* ============================================================
 * Credit: abdullah al mamun (@A2MBD3)
 * ============================================================ */

const JavaScriptObfuscator = require('javascript-obfuscator');
const config = require('../config');

/**
 * Obfuscate JavaScript source code.
 * @param {string} sourceCode - The JavaScript code to obfuscate.
 * @returns {object} - { success: boolean, result: string, error?: string }
 */
function obfuscateCode(sourceCode) {
  try {
    const obfuscationResult = JavaScriptObfuscator.obfuscate(
      sourceCode,
      config.obfuscatorOptions
    );
    return {
      success: true,
      result: obfuscationResult.getObfuscatedCode(),
    };
  } catch (err) {
    return {
      success: false,
      result: null,
      error: `Obfuscation error: ${err.message}`,
    };
  }
}

module.exports = { obfuscateCode };
