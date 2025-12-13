const pool = require('../database/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/schema.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    console.log('✅ Database tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();