const pool = require('../database/database');
const { createApiKey } = require('./apiKeyService');

/**
 * Handle RapidAPI subscription webhook events.
 * Creates a user and API key when a subscription is created.
 * 
 * @param {Object} webhookData - The webhook payload from RapidAPI
 * @returns {Promise<Object>} - { success: boolean, apiKey?: string, userId?: number, error?: string }
 */
async function handleSubscriptionWebhook(webhookData) {
  try {
    // RapidAPI webhook format may vary, but typically includes:
    // - event: 'subscription.created', 'subscription.updated', 'subscription.cancelled'
    // - user: { id, email, name }
    // - subscription: { plan, status }
    
    const event = webhookData.event || webhookData.type;
    const rapidapiUserId = webhookData.user?.id || webhookData.userId || webhookData.rapidapi_user_id;
    const userEmail = webhookData.user?.email || webhookData.email;
    const planName = webhookData.subscription?.plan || webhookData.plan || 'rapidapi';
    
    if (!rapidapiUserId) {
      return {
        success: false,
        error: 'Missing RapidAPI user ID in webhook payload'
      };
    }

    if (!userEmail) {
      return {
        success: false,
        error: 'Missing user email in webhook payload'
      };
    }

    // Handle different event types
    if (event === 'subscription.created' || event === 'subscription.activated') {
      return await createRapidApiUser(rapidapiUserId, userEmail, planName);
    } else if (event === 'subscription.cancelled' || event === 'subscription.deactivated') {
      return await deactivateRapidApiUser(rapidapiUserId);
    } else if (event === 'subscription.updated') {
      // Handle plan upgrades/downgrades
      return await updateRapidApiUser(rapidapiUserId, planName);
    }

    return {
      success: false,
      error: `Unhandled event type: ${event}`
    };
  } catch (error) {
    console.error('Error handling RapidAPI webhook:', error);
    return {
      success: false,
      error: error.message || 'Internal server error'
    };
  }
}

/**
 * Create a new user and API key for a RapidAPI subscriber
 */
async function createRapidApiUser(rapidapiUserId, email, planName) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if user already exists with this RapidAPI ID
    const existingUserQuery = `
      SELECT id, email FROM users 
      WHERE rapidapi_user_id = $1
      LIMIT 1
    `;
    const existingUser = await client.query(existingUserQuery, [rapidapiUserId]);

    let userId;
    let isNewUser = false;

    if (existingUser.rows.length > 0) {
      // User exists, check if they have an active API key
      userId = existingUser.rows[0].id;
      
      const existingKeyQuery = `
        SELECT id, is_active FROM api_keys 
        WHERE user_id = $1 AND source = 'rapidapi'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const existingKey = await client.query(existingKeyQuery, [userId]);

      if (existingKey.rows.length > 0 && existingKey.rows[0].is_active) {
        // User already has an active key
        await client.query('COMMIT');
        return {
          success: true,
          message: 'User already has an active API key',
          userId,
          existing: true
        };
      }
    } else {
      // Create new user
      const placeholderHash = 'rapidapi_user_no_password';
      const insertUserQuery = `
        INSERT INTO users (email, password_hash, rapidapi_user_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE 
          SET rapidapi_user_id = COALESCE(EXCLUDED.rapidapi_user_id, users.rapidapi_user_id)
        RETURNING id, email
      `;
      
      const userResult = await client.query(insertUserQuery, [email, placeholderHash, rapidapiUserId]);
      userId = userResult.rows[0].id;
      isNewUser = true;
    }

    // Determine credits based on plan
    const credits = getCreditsForPlan(planName);

    // Create API key
    const apiKey = await createApiKeyForUser(client, userId, planName, credits);

    await client.query('COMMIT');

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'rapidapi_subscription_created',
        rapidapi_user_id: rapidapiUserId,
        email,
        plan: planName,
        credits,
        api_key_id: apiKey.id,
        is_new_user: isNewUser
      })
    );

    return {
      success: true,
      apiKey: apiKey.api_key,
      userId,
      plan: planName,
      credits,
      isNewUser
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating RapidAPI user:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Deactivate a RapidAPI user's API key
 */
async function deactivateRapidApiUser(rapidapiUserId) {
  try {
    const query = `
      UPDATE api_keys
      SET is_active = false
      FROM users
      WHERE api_keys.user_id = users.id
        AND users.rapidapi_user_id = $1
        AND api_keys.source = 'rapidapi'
    `;
    
    const result = await pool.query(query, [rapidapiUserId]);
    
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'rapidapi_subscription_cancelled',
        rapidapi_user_id: rapidapiUserId,
        keys_deactivated: result.rowCount
      })
    );

    return {
      success: true,
      message: 'User API keys deactivated',
      keysDeactivated: result.rowCount
    };
  } catch (error) {
    console.error('Error deactivating RapidAPI user:', error);
    throw error;
  }
}

/**
 * Update a RapidAPI user's plan
 */
async function updateRapidApiUser(rapidapiUserId, planName) {
  try {
    const credits = getCreditsForPlan(planName);
    
    const query = `
      UPDATE api_keys
      SET plan_type = $1, credits_remaining = credits_remaining + $2
      FROM users
      WHERE api_keys.user_id = users.id
        AND users.rapidapi_user_id = $3
        AND api_keys.source = 'rapidapi'
        AND api_keys.is_active = true
      RETURNING api_keys.id
    `;
    
    const result = await pool.query(query, [planName, credits, rapidapiUserId]);
    
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'rapidapi_subscription_updated',
        rapidapi_user_id: rapidapiUserId,
        plan: planName,
        credits_added: credits
      })
    );

    return {
      success: true,
      message: 'User plan updated',
      plan: planName,
      creditsAdded: credits
    };
  } catch (error) {
    console.error('Error updating RapidAPI user:', error);
    throw error;
  }
}

/**
 * Create an API key for a user (internal helper)
 */
async function createApiKeyForUser(client, userId, planType, credits) {
  const { generateApiKey } = require('../utils/apiKeyGenerator');
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = generateApiKey({ environment: 'live' });

    try {
      const query = `
        INSERT INTO api_keys (user_id, api_key, plan_type, credits_remaining, source)
        VALUES ($1, $2, $3, $4, 'rapidapi')
        RETURNING id, api_key
      `;
      
      const result = await client.query(query, [userId, apiKey, planType, credits]);
      return result.rows[0];
    } catch (error) {
      // Retry on unique constraint violations
      if (error.code === '23505' && attempt < maxAttempts - 1) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate a unique API key after multiple attempts');
}

/**
 * Get credits based on plan name
 */
function getCreditsForPlan(planName) {
  const planCredits = {
    'basic': 1000,
    'pro': 10000,
    'ultra': 100000,
    'rapidapi': 10000, // Default for RapidAPI
    'free': 100
  };

  const normalizedPlan = planName?.toLowerCase() || 'rapidapi';
  return planCredits[normalizedPlan] || planCredits.rapidapi;
}

module.exports = {
  handleSubscriptionWebhook,
  createRapidApiUser,
  deactivateRapidApiUser,
  updateRapidApiUser
};

