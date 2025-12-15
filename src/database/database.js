const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load env from current working dir and fallback to backend/.env to handle script runs from repo root
require('dotenv').config();
const backendEnvPath = path.join(__dirname, '..', '..', '.env');
if (!process.env.DATABASE_URL && fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
}

const connectionString = process.env.DATABASE_URL;

// Basic sanity check to avoid starting without a DB URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please configure it in your environment.');
  process.exit(1);
}

// Produce a safe, redacted descriptor for logging (no passwords)
function describeConnection(urlString) {
  try {
    const url = new URL(urlString);
    return {
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.replace(/^\//, '') || '(none)',
      user: url.username || '(none)',
      ssl: true, // we always enable SSL below
    };
  } catch (err) {
    return { error: 'could not parse DATABASE_URL' };
  }
}

const pool = new Pool({
  connectionString,
  ssl: {
    // Neon requires SSL; rejectUnauthorized=false to avoid local CA issues
    rejectUnauthorized: false
  }
});

const safeInfo = describeConnection(connectionString);

// Connection events
pool.on('connect', () => {
  console.log('Connected to PostgreSQL', safeInfo);
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;