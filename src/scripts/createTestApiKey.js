const pool = require('../database/database');
const { createApiKey } = require('../services/apiKeyService');

/**
 * Example script to create a test user and API key
 * Run with: node src/scripts/createTestApiKey.js
 */
async function createTestApiKey() {
  try {
    // Create a test user
    const userQuery = `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id, email
    `;
    
    const testEmail = 'test@example.com';
    const testPasswordHash = 'hashed_password_placeholder'; // In production, use bcrypt
    
    const userResult = await pool.query(userQuery, [testEmail, testPasswordHash]);
    const user = userResult.rows[0];
    
    console.log('✅ User created/found:', user.email);
    
    // Create an API key for the user
    const apiKey = await createApiKey(user.id, 'free', 100);
    
    console.log('\n🔑 API Key Generated:');
    console.log('-----------------------------------');
    console.log(apiKey);
    console.log('-----------------------------------');
    console.log('\nYou can now use this API key to test the validation endpoint:');
    console.log('\nExample curl command:');
    console.log(`curl -X POST http://localhost:8000/api/v1/validate \\`);
    console.log(`  -H "x-api-key: ${apiKey}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"email": "test@gmail.com"}'`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test API key:', error);
    process.exit(1);
  }
}

createTestApiKey();
