# MailMint API - Email Validation Service

A comprehensive email validation API that provides real-time email verification including syntax checking, DNS/MX record validation, and disposable email detection.

## Features

- ✅ **Syntax Validation** - Regex-based email format verification
- ✅ **DNS/MX Records** - Validates domain DNS and mail server records
- ✅ **Disposable Email Detection** - Checks against 3 curated disposable domain lists
- ✅ **Role-Based Email Detection** - Identifies generic business emails (admin@, support@, etc.)
- ✅ **Smart Scoring System** - Returns a validation score (0-120)
- ✅ **Performance Optimized** - Parallel validation with 24-hour caching
- ✅ **RESTful API** - Simple JSON-based endpoints

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- pnpm (v10.24.0)

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm run dev
```

The server will start on `http://localhost:8000`

### Environment Variables

Create a `.env` file in the `backend` directory:

Required:
```env
DATABASE_URL=postgres://user:password@host:5432/dbname
PORT=8000
```

Optional hardening knobs:
```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60
REQUEST_TIMEOUT_MS=10000
SERVER_TIMEOUT_MS=15000
SKIP_DB_CHECK=false
```

## API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "message": "Email Validation API is running"
}
```

### Validate Email

```http
POST /api/v1/validate
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
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

### Validation Criteria

An email is considered **valid** when:
- ✅ Syntax is valid
- ✅ Domain has DNS records
- ✅ Domain has MX (mail server) records
- ✅ Domain is not disposable
- ✅ Email is not role-based

### Scoring System

| Check | Points |
|-------|--------|
| Syntax Valid | +20 |
| DNS Exists | +20 |
| MX Records Found | +40 |
| Not Disposable | +20 |
| Not Role-Based | +20 |
| **Total** | **120** |

## Project Structure

```
backend/
├── src/
│   ├── utils/
│   │   ├── disposableDomains.js    # Disposable domain detection with caching
│   │   └── emailValidator.js       # Email syntax and DNS validation
│   ├── app.js                      # Express app (middleware, routes)
│   └── server.js                   # Express server entry point
├── .env                            # Environment variables (gitignored)
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── README.md
├── CLIENT_GUIDE.md                 # Client-facing usage (RapidAPI ready)
├── DEVELOPER_GUIDE.md              # Internal/developer guide
└── WARP.md
```

## How It Works

1. **Syntax Validation**: Checks email format using regex pattern
2. **Parallel Validation**: Simultaneously checks DNS/MX records, disposable domains, and role-based emails
3. **DNS Lookup**: Verifies domain exists and has mail server (MX) records
4. **Disposable Check**: Compares domain against 3 GitHub-hosted lists (cached for 24 hours)
5. **Role-Based Check**: Identifies generic business email addresses
6. **Score Calculation**: Aggregates results into a 0-120 score

## Performance Features

- **Parallel Execution**: DNS, disposable, and role-based checks run simultaneously using `Promise.all()`
- **Smart Caching**: Disposable domain lists cached for 24 hours
- **O(1) Lookup**: Set-based domain matching for instant results
- **Array Matching**: Efficient role-based prefix detection
- **Graceful Degradation**: Continues operation even if external lists fail

## Error Handling

### 400 Bad Request
```json
{
  "success": false,
  "error": "Email is required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Endpoint not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to validate email"
}
```

## Development

### Run Migrations
```bash
pnpm install
node src/scripts/migrate.js
```

### Create a test API key
```bash
node src/scripts/createTestApiKey.js
```

### Run Tests
```bash
pnpm test
```

### Start Development Server
```bash
pnpm run dev
```

### Manual Start
```bash
node src/server.js
```

## Dependencies

- **express** (^5.2.1) - Web framework
- **cors** (^2.8.5) - CORS middleware
- **axios** (^1.13.2) - HTTP client for fetching disposable lists
- **dotenv** (^17.2.3) - Environment variable management
- **nodemon** (^3.1.11) - Development auto-reload

## Role-Based Email Detection

The API automatically detects 30+ common role-based email prefixes including:
- **Administrative**: admin, administrator
- **Support**: support, help, helpdesk
- **Sales/Marketing**: sales, marketing
- **Contact**: contact, info, hello, hi
- **System**: noreply, no-reply, donotreply, postmaster, webmaster
- **Other**: billing, hr, careers, legal, press, feedback, and more

These emails represent shared mailboxes rather than individual users.

## Future Enhancements

- [ ] SMTP verification (mailbox existence check)
- [ ] Usage analytics dashboard
- [ ] Bulk validation endpoint

## License

ISC

## Support

For issues and questions, please open an issue in the repository.
