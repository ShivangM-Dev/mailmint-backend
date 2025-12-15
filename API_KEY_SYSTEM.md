# API Key System

This document describes the API key authentication system for the MailMint Email Validation API.

## Overview

The API key system provides secure authentication for API requests, tracks usage, manages credits, and logs all validation requests.

## Components

### 1. API Key Generator (`src/utils/apiKeyGenerator.js`)
- Uses `crypto.randomBytes()` with a Base62 alphabet plus checksum
- Keys are structured with environment and checksum for quick format validation
- Format: `mmk_<env>_<random>_<checksum>` (env = `live` or `test`)

### 2. API Key Service (`src/services/apiKeyService.js`)
Provides functions for managing API keys:

- **`validateApiKey(apiKey)`** - Validates an API key against the database
  - Checks if the key exists and is active
  - Verifies sufficient credits remain
  - Returns key data with user information

- **`createApiKey(userId, planType, credits)`** - Creates a new API key for a user
  - Generates a unique random key
  - Stores it in the database with user relationship
  - Returns the generated key

- **`deductCredit(apiKeyId)`** - Deducts one credit from an API key

- **`logUsage(apiKeyId, email, result)`** - Logs API usage to the database

- **`deactivateApiKey(apiKey, userId)`** - Deactivates an API key

- **`getUserApiKeys(userId)`** - Retrieves all API keys for a user

### 3. Authentication Middleware (`src/middleware/apiKeyAuth.js`)
Express middleware that protects routes requiring API key authentication.

**Accepts API keys from:**
- `Authorization` header as `Bearer <api_key>`
- `x-api-key` header
- `api_key` query parameter

**Behavior:**
- Returns 401 if no key is provided
- Returns 401 if the key is invalid, inactive, or has no credits
- Attaches `req.apiKeyData` for use in route handlers

## Database Schema

The system uses three tables:

### `users`
```sql
id SERIAL PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### `api_keys`
```sql
id SERIAL PRIMARY KEY
user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
api_key VARCHAR(128) UNIQUE NOT NULL
plan_type VARCHAR(50) DEFAULT 'free'
credits_remaining INTEGER DEFAULT 100
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
is_active BOOLEAN DEFAULT true
```

### `usage_logs`
```sql
id SERIAL PRIMARY KEY
api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE
email_validated VARCHAR(255)
result JSONB
timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

## Usage

### Creating an API Key

Use the test script to create a user and generate an API key:

```bash
node src/scripts/createTestApiKey.js
```

Or programmatically:

```javascript
const { createApiKey } = require('./services/apiKeyService');

// Create an API key for user ID 1 with free plan and 100 credits
const apiKey = await createApiKey(1, 'free', 100);
console.log('Generated API key:', apiKey);
```

### Making Authenticated Requests

**Option 1: Using Authorization header**
```bash
curl -X POST http://localhost:8000/api/v1/validate \
  -H "Authorization: Bearer mk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Option 2: Using x-api-key header**
```bash
curl -X POST http://localhost:8000/api/v1/validate \
  -H "x-api-key: mk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Option 3: Using query parameter**
```bash
curl -X POST "http://localhost:8000/api/v1/validate?api_key=mk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Credit System

- Each API key has a credit balance (default: 100 for free plan)
- Each successful validation request deducts 1 credit
- Requests with 0 credits remaining will be rejected with 401
- Usage is logged to `usage_logs` table for analytics

### Protected Endpoints

The `/api/v1/validate` endpoint is protected with API key authentication. All requests must include a valid API key. Each request deducts one credit and is logged, even when validation fails early (e.g., bad syntax).

### Key Generation Notes
- Keys validate format quickly (`mmk_live|test_<random>_<checksum>`)
- Database schema stays the same (`VARCHAR(128)`), no migration needed
- Collisions are retried on insert; up to 5 attempts before failing

## Security Features

1. **Cryptographically Secure Keys** - Uses `crypto.randomBytes()` for generation
2. **Database Validation** - Keys are validated against the database on every request
3. **Credit Tracking** - Prevents abuse through credit limits
4. **Usage Logging** - All requests are logged for audit and analytics
5. **Key Deactivation** - Keys can be deactivated without deletion
6. **User Association** - Keys are tied to specific users for accountability

## Error Responses

**Missing API Key (401)**
```json
{
  "success": false,
  "error": "API key is required. Provide it via Authorization header, x-api-key header, or api_key query parameter."
}
```

**Invalid/Inactive Key or No Credits (401)**
```json
{
  "success": false,
  "error": "Invalid or inactive API key, or insufficient credits."
}
```

## Future Enhancements

- Rate limiting per API key
- Different plan types with varying credit limits
- Automatic credit renewal
- API key expiration dates
- Webhook notifications for low credits
- Dashboard for key management
