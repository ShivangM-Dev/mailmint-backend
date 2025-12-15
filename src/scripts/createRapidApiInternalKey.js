const pool = require('../database/database');
const { createApiKey } = require('../services/apiKeyService');

/**
 * Script to create an internal API key used for RapidAPI traffic.
 *
 * Usage:
 *   node src/scripts/createRapidApiInternalKey.js [email] [plan] [credits]
 *
 * Defaults:
 *   email   -> rapidapi@internal.local
 *   plan    -> rapidapi
 *   credits -> 10000
 */
async function createRapidApiInternalKey() {
  const [, , emailArg, planArg, creditsArg] = process.argv;
  const email = emailArg || 'rapidapi@internal.local';
  const plan = planArg || 'rapidapi';
  const credits = Number.isFinite(Number(creditsArg)) ? Number(creditsArg) : 10000;

  try {
    const userQuery = `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id, email
    `;

    const placeholderHash = 'hashed_password_placeholder';
    const userResult = await pool.query(userQuery, [email, placeholderHash]);
    const user = userResult.rows[0];

    console.log(`✅ RapidAPI internal user ready: ${user.email}`);

    const apiKey = await createApiKey(user.id, plan, credits, {
      environment: 'live',
      source: 'rapidapi',
    });

    console.log('\n🔑 RapidAPI Internal API Key Generated:');
    console.log('-----------------------------------');
    console.log(apiKey);
    console.log('-----------------------------------');
    console.log('\nSet this in your .env as:');
    console.log(`RAPIDAPI_INTERNAL_API_KEY=${apiKey}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating RapidAPI internal API key:', error);
    try {
      await pool.end();
    } catch (e) {}
    process.exit(1);
  }
}

createRapidApiInternalKey();


