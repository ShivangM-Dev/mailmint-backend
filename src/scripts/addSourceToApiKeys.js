const pool = require('../database/database');

async function addSourceColumn() {
  try {
    await pool.query(`
      ALTER TABLE api_keys
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'direct' NOT NULL
    `);

    console.log('✅ api_keys.source column ensured (default: direct)');
  } catch (error) {
    console.error('❌ Failed to add source column to api_keys:', error);
  } finally {
    await pool.end();
  }
}

addSourceColumn();


