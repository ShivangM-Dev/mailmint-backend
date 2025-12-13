# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

MailMint is an email validation API that provides comprehensive email validation including syntax checking, DNS/MX record validation, and disposable email detection.

## Development Commands

### Package Manager
This project uses **pnpm** (v10.24.0). Always use `pnpm` instead of `npm` or `yarn`.

### Running the Server
```bash
# Development mode with auto-reload
pnpm run dev

# Manual start
node src/server.js
```

The server runs on port 8000 by default (configurable via `PORT` environment variable).

## Project Structure

```
backend/
├── src/
│   ├── utils/
│   │   ├── disposableDomains.js    # Disposable domain detection with caching
│   │   └── emailValidator.js       # Email syntax and DNS validation
│   └── server.js                   # Express server entry point
├── .env                            # Environment variables (gitignored)
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── README.md
└── WARP.md
```

## Architecture

### Application Structure

**Entry Point**: `src/server.js`
- Express.js server with CORS enabled
- Single main validation endpoint: `POST /api/v1/validate`
- Health check endpoint: `GET /health`

**Validation Flow**:
1. Syntax validation (regex-based)
2. DNS & MX record validation, disposable check, and role-based detection (all in parallel)
3. Score calculation (0-120 scale)
4. Final validity determination

### Core Modules

**`src/utils/emailValidator.js`**
- `validateSyntax(email)`: Regex-based email format validation
- `validateDNS(email)`: Checks domain DNS and MX records using Node.js `dns` module
- `isRoleBased(email)`: Detects generic business/role-based emails (admin@, support@, etc.)
- Returns DNS status and sorted MX servers by priority

**`src/utils/disposableDomains.js`**
- `isDisposable(email)`: Checks if email domain is disposable
- Fetches from 3 GitHub sources: generic, withDNS, and SHA1 lists
- **Caching**: 24-hour cache duration to minimize API calls
- Uses Set for O(1) domain lookup performance
- `refreshCache()`: Force refresh (if needed manually)


## Validation Scoring System

- Syntax valid: +20 points
- DNS exists: +20 points
- MX records found: +40 points
- Not disposable: +20 points
- Not role-based: +20 points
- **Total**: 120 points

An email is considered **valid** only if: syntax is valid AND DNS exists AND MX records exist AND domain is not disposable AND not role-based.

## API Response Structure

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "valid": true,
    "score": 100,
    "details": {
      "syntax": true,
      "dns": true,
      "mx_records": true,
      "disposable": false,
      "role_based": false
    }
  }
}
```

## Environment Variables

- `PORT`: Server port (default: 8000)

Environment variables should be stored in `.env` file (gitignored).

## Key Implementation Details

### Performance Optimization
- Parallel execution of DNS validation, disposable check, and role-based detection using `Promise.all()`
- 24-hour caching for disposable domains to reduce external API calls
- Set-based lookup for domain matching (O(1) complexity)
- Array-based role prefix matching for role-based detection

### Error Handling
- Graceful degradation: if disposable lists fail to fetch, returns empty arrays
- DNS lookup failures return `dns: false` without crashing
- Global error handlers for 404 and 500 responses

### Dependencies
- **express**: ^5.2.1 - Web framework
- **cors**: ^2.8.5 - CORS middleware
- **axios**: ^1.13.2 - HTTP client for fetching disposable lists
- **dotenv**: ^17.2.3 - Environment variable management
- **nodemon**: ^3.1.11 - Development auto-reload

## Role-Based Email Detection

Detects common business/generic email addresses such as:
- Administrative: admin@, administrator@
- Support: support@, help@, helpdesk@
- Sales/Marketing: sales@, marketing@
- Contact: contact@, info@, hello@
- System: noreply@, postmaster@, webmaster@
- And 30+ other common role-based prefixes

These emails are typically shared mailboxes rather than individual users.
