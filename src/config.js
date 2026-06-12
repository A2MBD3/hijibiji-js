/* ============================================================
 * Credit: abdullah al mamun (@A2MBD3)
 * ============================================================ */

require('dotenv').config();

// FIX: parseInt(...) || default fails when OWNER_ID is "0" because parseInt
// returns 0 which is falsy, silently falling back to the hardcoded default.
// Use explicit null/undefined check instead.
const parsedOwnerId = parseInt(process.env.OWNER_ID, 10);

const config = {
  botToken: process.env.BOT_TOKEN,
  ownerId: !isNaN(parsedOwnerId) ? parsedOwnerId : 8074495633,
  port: parseInt(process.env.PORT, 10) || 10000,

  // Rate limiting: max requests per user per time window
  rateLimit: {
    maxRequests: 5,       // max obfuscation jobs
    windowMs: 60 * 1000, // per 60 seconds
  },

  // Auto-cleanup: keep at most this many original files per user
  maxOriginalsPerUser: 20,

  obfuscatorOptions: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: true,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 0.5,
    stringArrayEncoding: ['rc4'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayThreshold: 1,
    stringArrayWrappersCount: 1,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 2,
    stringArrayWrappersType: 'variable',
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
  },

  maxFileSize: 5 * 1024 * 1024, // 5 MB
};

module.exports = config;
