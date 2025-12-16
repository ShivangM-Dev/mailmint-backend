# MailMint Email Validation API — Client Guide (RapidAPI Ready)

Use this guide when integrating the API from your app or via RapidAPI. For engineering/operations details, see `DEVELOPER_GUIDE.md`.

## Base URL
- Self-hosted: `https://<your-domain>/api/v1`
- RapidAPI: Use the base URL shown on the RapidAPI listing; all endpoints below are relative to that.

## Authentication
- Send your API key in one of:
  - `Authorization: Bearer <api_key>`
  - `x-api-key: <api_key>`
  - Query: `?api_key=<api_key>`

**API Key Format:**
- Keys follow the pattern: `mmk_<env>_<random>_<checksum>`
- Example: `mmk_live_q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9z0x1c2v3b4n5m6_a1b2c3`
- Environment can be `live` or `test`

## Endpoints

### Health Check
- `GET /health`
- Response: `{ "status": "ok", "message": "Email Validation API is running" }`

### Validate Email
- `POST /validate`
- Headers: `Content-Type: application/json`, plus API key
- Body:
  ```json
  { "email": "user@example.com" }
  ```
- Success response:
  ```json
  {
    "success": true,
    "data": {
      "email": "user@example.com",
      "valid": true,
      "score": 120,
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
- Error responses:
  - `400` missing email: `{ "success": false, "error": "Email is required" }`
  - `401` authentication errors:
    - Missing key: `{ "success": false, "error": "API key is required. Provide it via Authorization header, x-api-key header, or api_key query parameter." }`
    - Invalid format: `{ "success": false, "error": "Invalid API key format." }`
    - Not found: `{ "success": false, "error": "API key not found." }`
    - Inactive: `{ "success": false, "error": "API key is inactive." }`
  - `402` insufficient credits: `{ "success": false, "error": "Insufficient credits" }`
  - `429` rate limited: `{ "success": false, "error": "Too many requests, please slow down" }`
  - `500` server errors: `{ "success": false, "error": "Failed to validate email" }`
  - `503` request timeout: `{ "success": false, "error": "Request timed out" }`
  - `404` endpoint not found: `{ "success": false, "error": "Endpoint not found" }`

## Scoring
- Maximum: 120
- Breakdown: syntax (20) + DNS (20) + MX (40) + not disposable (20) + not role-based (20)

## Rate Limits (defaults)
- 60 requests per minute per IP (configurable). RapidAPI plans may apply additional limits shown on the listing.

## Sample cURL

**Using Authorization header:**
```bash
curl -X POST "https://<base>/api/v1/validate" \
  -H "Authorization: Bearer mmk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Using x-api-key header:**
```bash
curl -X POST "https://<base>/api/v1/validate" \
  -H "x-api-key: mmk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Using query parameter:**
```bash
curl -X POST "https://<base>/api/v1/validate?api_key=mmk_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Common Questions
- **What makes an email invalid?** Any failed check: bad syntax, no DNS, no MX, disposable domain, or role-based address.
- **What if DNS lookups fail temporarily?** The response marks DNS/MX as false and `valid` will be false.
- **How are credits consumed?** 1 credit per request (including early failures like bad syntax). Credits are deducted even if validation fails early.
- **What happens when I run out of credits?** Requests will return a `402` status code with the error message "Insufficient credits".
- **Can I use test API keys in production?** No, test keys (`mmk_test_...`) are intended for development/testing only. Use live keys (`mmk_live_...`) for production.
- **What's the difference between RapidAPI and direct access?** When accessing via RapidAPI, authentication is handled by RapidAPI's gateway. Direct API access requires your own API key using one of the authentication methods above.


