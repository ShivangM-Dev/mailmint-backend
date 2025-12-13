const pool = require('../database/database');

async function fixApiKeyLength() {
  try {
    // Alter the api_key column to accommodate longer keys
    await pool.query(`
      ALTER TABLE api_keys 
      ALTER COLUMN api_key TYPE VARCHAR(128)
    `);
    
    console.log('✅ Successfully updated api_key column to VARCHAR(128)');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

fixApiKeyLength();
