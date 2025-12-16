const pool = require('../database/database');

/**
 * Migration script to add rapidapi_user_id column to users table.
 * Run this once to update your database schema.
 */
async function migrate() {
  try {
    console.log('Starting migration: Add rapidapi_user_id to users table...');

    // Check if column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'rapidapi_user_id'
    `;
    const checkResult = await pool.query(checkQuery);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column rapidapi_user_id already exists. Migration not needed.');
      await pool.end();
      process.exit(0);
    }

    // Add the column
    const alterQuery = `
      ALTER TABLE users 
      ADD COLUMN rapidapi_user_id VARCHAR(255) UNIQUE
    `;
    
    await pool.query(alterQuery);
    console.log('✅ Added rapidapi_user_id column to users table');

    // Create index for better performance
    const indexQuery = `
      CREATE INDEX IF NOT EXISTS idx_users_rapidapi_id ON users(rapidapi_user_id)
    `;
    await pool.query(indexQuery);
    console.log('✅ Created index on rapidapi_user_id');

    console.log('✅ Migration completed successfully!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    try {
      await pool.end();
    } catch (e) {
      // ignore pool close errors
    }
    process.exit(1);
  }
}

migrate();

