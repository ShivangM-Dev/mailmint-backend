const crypto = require('crypto');

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function randomBase62(length = 40) {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

function checksum(input, length = 6) {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, length);
}

/**
 * Generate a structured API key.
 * Format: mmk_<env>_<random>_<checksum>
 * Example: mmk_live_q1w2e3..._a1b2c3
 */
function generateApiKey({ environment = 'live' } = {}) {
  const env = environment === 'test' ? 'test' : 'live';
  const randomPart = randomBase62(40); // ~40 chars from 40 random bytes
  const check = checksum(`${env}:${randomPart}`, 6);
  return `mmk_${env}_${randomPart}_${check}`;
}

/**
 * Basic format validation for generated keys.
 */
function isApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length > 128) return false;
  const pattern = /^mmk_(live|test)_([0-9A-Za-z]{20,80})_([0-9a-f]{6})$/;
  return pattern.test(apiKey);
}

module.exports = { generateApiKey, isApiKeyFormat };
