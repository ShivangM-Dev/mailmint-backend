const crypto = require('crypto');

/**
 * Generate a random API key using crypto.randomBytes
 * @param {number} length - Length in bytes (default 32, resulting in 64 hex characters)
 * @returns {string} - Hex-encoded API key with 'mk_' prefix
 */
function generateApiKey(length = 32) {
  const randomBytes = crypto.randomBytes(length);
  const hexKey = randomBytes.toString('hex');
  return `mk_${hexKey}`;
}

module.exports = { generateApiKey };
