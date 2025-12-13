const pool = require('../database/database');
const { generateApiKey } = require('../utils/apiKeyGenerator');

/**
 * Validate an API key from the database
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<Object|null>} - Returns the API key record if valid, null otherwise
 */
async function validateApiKey(apiKey) {
  try {
    const query = `
      SELECT 
        api_keys.id,
        api_keys.user_id,
        api_keys.api_key,
        api_keys.plan_type,
        api_keys.credits_remaining,
        api_keys.is_active,
        users.email as user_email
      FROM api_keys
      JOIN users ON api_keys.user_id = users.id
      WHERE api_keys.api_key = $1 AND api_keys.is_active = true
    `;
    
    const result = await pool.query(query, [apiKey]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const keyData = result.rows[0];
    
    // Check if credits are available
    if (keyData.credits_remaining <= 0) {
      return null;
    }
    
    return keyData;
  } catch (error) {
    console.error('Error validating API key:', error);
    throw error;
  }
}

/**
 * Create a new API key for a user
 * @param {number} userId - The user ID
 * @param {string} planType - The plan type (default 'free')
 * @param {number} credits - Initial credits (default 100)
 * @returns {Promise<string>} - The generated API key
 */
async function createApiKey(userId, planType = 'free', credits = 100) {
  try {
    const apiKey = generateApiKey();
    
    const query = `
      INSERT INTO api_keys (user_id, api_key, plan_type, credits_remaining)
      VALUES ($1, $2, $3, $4)
      RETURNING api_key
    `;
    
    const result = await pool.query(query, [userId, apiKey, planType, credits]);
    return result.rows[0].api_key;
  } catch (error) {
    console.error('Error creating API key:', error);
    throw error;
  }
}

/**
 * Deduct a credit from an API key
 * @param {number} apiKeyId - The API key ID
 * @returns {Promise<boolean>} - Returns true if successful
 */
async function deductCredit(apiKeyId) {
  try {
    const query = `
      UPDATE api_keys
      SET credits_remaining = credits_remaining - 1
      WHERE id = $1 AND credits_remaining > 0
      RETURNING credits_remaining
    `;
    
    const result = await pool.query(query, [apiKeyId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deducting credit:', error);
    throw error;
  }
}

/**
 * Log API usage
 * @param {number} apiKeyId - The API key ID
 * @param {string} emailValidated - The email that was validated
 * @param {Object} result - The validation result
 * @returns {Promise<void>}
 */
async function logUsage(apiKeyId, emailValidated, result) {
  try {
    const query = `
      INSERT INTO usage_logs (api_key_id, email_validated, result)
      VALUES ($1, $2, $3)
    `;
    
    await pool.query(query, [apiKeyId, emailValidated, JSON.stringify(result)]);
  } catch (error) {
    console.error('Error logging usage:', error);
    // Don't throw - logging failure shouldn't break the API
  }
}

/**
 * Deactivate an API key
 * @param {string} apiKey - The API key to deactivate
 * @param {number} userId - The user ID (for authorization)
 * @returns {Promise<boolean>} - Returns true if successful
 */
async function deactivateApiKey(apiKey, userId) {
  try {
    const query = `
      UPDATE api_keys
      SET is_active = false
      WHERE api_key = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await pool.query(query, [apiKey, userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deactivating API key:', error);
    throw error;
  }
}

/**
 * Get all API keys for a user
 * @param {number} userId - The user ID
 * @returns {Promise<Array>} - Array of API key records
 */
async function getUserApiKeys(userId) {
  try {
    const query = `
      SELECT 
        id,
        api_key,
        plan_type,
        credits_remaining,
        created_at,
        is_active
      FROM api_keys
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching user API keys:', error);
    throw error;
  }
}

module.exports = {
  validateApiKey,
  createApiKey,
  deductCredit,
  logUsage,
  deactivateApiKey,
  getUserApiKeys
};
