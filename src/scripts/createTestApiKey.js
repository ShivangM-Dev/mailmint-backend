const pool = require('../database/database');
const { createApiKey } = require('../services/apiKeyService');

/**
 * Quick script to create a test user and API key.
 *
 * Usage:
 *   node src/scripts/createTestApiKey.js [email] [plan] [credits] [env] [source]
 *
 * Defaults:
 *   email   -> test@example.com
 *   plan    -> free
 *   credits -> 100
 */
async function createTestApiKey() {
  // Accept simple positional args for convenience
  const [, , emailArg, planArg, creditsArg, envArg, sourceArg] = process.argv;
  const email = emailArg || 'test@example.com';
  const plan = planArg || 'free';
  const credits = Number.isFinite(Number(creditsArg)) ? Number(creditsArg) : 100;
  const environment = envArg === 'test' ? 'test' : 'live';
  const source = sourceArg === 'rapidapi' ? 'rapidapi' : 'direct';

  try {
    // Create or fetch the user
    const userQuery = `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id, email
    `;

    const placeholderHash = 'hashed_password_placeholder'; // For tests only; replace with bcrypt in prod
    const userResult = await pool.query(userQuery, [email, placeholderHash]);
    const user = userResult.rows[0];

    console.log(`✅ User ready: ${user.email}`);

    // Create an API key for the user
    const apiKey = await createApiKey(user.id, plan, credits, { environment, source });

    console.log('\n🔑 API Key Generated:');
    console.log('-----------------------------------');
    console.log(apiKey);
    console.log('-----------------------------------');
    console.log('\nExample curl command:');
    console.log(`curl -X POST http://localhost:8000/api/v1/validate \\`);
    console.log(`  -H "x-api-key: ${apiKey}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"email": "test@gmail.com"}'`);

    // Cleanly close pool
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test API key:', error);
    try {
      await pool.end();
    } catch (e) {
      // ignore pool close errors
    }
    process.exit(1);
  }
}

createTestApiKey();
