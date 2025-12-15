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
  - `401` auth issues: `{ "success": false, "error": "API key is required..." }`
  - `402` low credits: `{ "success": false, "error": "Insufficient credits" }`
  - `429` rate limited: `{ "success": false, "error": "Too many requests, please slow down" }`
  - `500` server errors: `{ "success": false, "error": "Failed to validate email" }`

## Scoring
- Maximum: 120
- Breakdown: syntax (20) + DNS (20) + MX (40) + not disposable (20) + not role-based (20)

## Rate Limits (defaults)
- 60 requests per minute per IP (configurable). RapidAPI plans may apply additional limits shown on the listing.

## Sample cURL
```bash
curl -X POST "https://<base>/api/v1/validate" \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Common Questions
- **What makes an email invalid?** Any failed check: bad syntax, no DNS, no MX, disposable domain, or role-based address.
- **What if DNS lookups fail temporarily?** The response marks DNS/MX as false and `valid` will be false.
- **How are credits consumed?** 1 credit per request (including early failures like bad syntax).


