# MailMint - Email Validation API 

Complete guide for integrating and using the MailMint Email Validation API through RapidAPI.

## Table of Contents

1. [Overview](#overview)
2. [For API Providers (Setup)](#for-api-providers-setup)
3. [For Developers (Using the API)](#for-developers-using-the-api)
4. [Authentication](#authentication)
5. [API Endpoints](#api-endpoints)
6. [Code Examples](#code-examples)
7. [Error Handling](#error-handling)
8. [Rate Limits & Pricing](#rate-limits--pricing)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The MailMint Email Validation API is available on RapidAPI, providing developers with a simple way to validate email addresses with comprehensive checks including:

- ✅ **Syntax Validation** - Regex-based format verification
- ✅ **DNS/MX Records** - Validates domain DNS and mail server records
- ✅ **Disposable Email Detection** - Checks against curated disposable domain lists
- ✅ **Role-Based Email Detection** - Identifies generic business emails
- ✅ **Smart Scoring System** - Returns a validation score (0-120)

### How RapidAPI Integration Works

When you use RapidAPI:
1. **You authenticate with RapidAPI** - RapidAPI handles user authentication and subscription management
2. **RapidAPI Gateway forwards requests** - The gateway adds security headers and forwards to our backend
3. **Backend validates and processes** - Our API validates the email and returns results
4. **Response flows back** - Results are returned through RapidAPI to your application

**Key Benefit:** No need to manage API keys directly - RapidAPI handles authentication, billing, and rate limiting for you.

---

## For API Providers (Setup)

If you're setting up the MailMint API backend to work with RapidAPI, follow these steps:

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- RapidAPI account with API listing created

### Step 1: Generate Internal API Key

Create an internal API key that will be used for all RapidAPI traffic:

```bash
node src/scripts/createRapidApiInternalKey.js [email] [plan] [credits]
```

**Defaults:**
- `email`: `rapidapi@internal.local`
- `plan`: `rapidapi`
- `credits`: `10000`

**Example:**
```bash
node src/scripts/createRapidApiInternalKey.js rapidapi@internal.local rapidapi 50000
```

This will output an API key like:
```
mmk_live_q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9z0x1c2v3b4n5m6_a1b2c3
```

### Step 2: Run Database Migration

Run the migration to add support for tracking individual RapidAPI subscribers:

```bash
node src/scripts/migrateRapidApiUsers.js
```

This adds a `rapidapi_user_id` column to the `users` table to track RapidAPI subscribers.

### Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# RapidAPI Integration
RAPIDAPI_PROXY_SECRET=your-secret-from-rapidapi-dashboard
RAPIDAPI_INTERNAL_API_KEY=mmk_live_YOUR_GENERATED_KEY_HERE
# Optional: Webhook secret for verifying RapidAPI webhook signatures
RAPIDAPI_WEBHOOK_SECRET=your-webhook-secret-from-rapidapi-dashboard
```

**Where to find `RAPIDAPI_PROXY_SECRET`:**
1. Log into your RapidAPI Provider Dashboard
2. Navigate to your API listing
3. Go to "Settings" → "Security"
4. Copy the "Proxy Secret" value
5. Set this as `RAPIDAPI_PROXY_SECRET` in your `.env`

### Step 4: Configure RapidAPI Dashboard

In your RapidAPI Provider Dashboard:

1. **Set Base URL**: Your API's base URL (e.g., `https://api.yourdomain.com`)
2. **Set Proxy Secret**: The same value you set in `RAPIDAPI_PROXY_SECRET`
3. **Configure Endpoints**: Add the `/api/v1/validate` endpoint
4. **Set Rate Limits**: Configure per-plan rate limits
5. **Set Pricing**: Configure pricing tiers for different subscription plans
6. **Configure Webhooks** (Optional but recommended):
   - Go to "Settings" → "Webhooks" in your RapidAPI Provider Dashboard
   - Add webhook URL: `https://your-api-url/webhooks/rapidapi`
   - Enable events: `subscription.created`, `subscription.updated`, `subscription.cancelled`
   - Copy the webhook secret and set it as `RAPIDAPI_WEBHOOK_SECRET` in your `.env`

### Step 5: Test the Integration

Test that RapidAPI can reach your backend:

```bash
# Start your server
pnpm run dev

# Test with RapidAPI test console or use curl with proxy secret header
curl -X POST "https://your-api-url/api/v1/validate" \
  -H "x-rapidapi-proxy-secret: your-secret-from-rapidapi-dashboard" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Architecture Notes

- **Authentication Flow**: RapidAPI sends `x-rapidapi-proxy-secret` header → Backend validates → Uses `RAPIDAPI_INTERNAL_API_KEY` for credits/logging
- **Subscription Management**: When users subscribe via RapidAPI, webhooks create individual user accounts and API keys in your database
- **Credit Management**: Individual API keys are created for each RapidAPI subscriber, allowing per-user credit tracking
- **Logging**: All requests are logged with `source: 'rapidapi'` for analytics
- **Rate Limiting**: RapidAPI handles per-user rate limits; backend applies additional IP-based limits

### Webhook Endpoint

The API includes a webhook endpoint at `/webhooks/rapidapi` that handles subscription events:

- **POST /webhooks/rapidapi**: Receives RapidAPI subscription webhooks
  - Creates user accounts and API keys when subscriptions are created
  - Updates plans when subscriptions are updated
  - Deactivates API keys when subscriptions are cancelled

**Webhook Payload Format** (RapidAPI may vary):
```json
{
  "event": "subscription.created",
  "user": {
    "id": "rapidapi_user_123",
    "email": "user@example.com"
  },
  "subscription": {
    "plan": "pro",
    "status": "active"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "data": {
    "userId": 1,
    "apiKey": "mmk_live_...",
    "plan": "pro",
    "credits": 10000
  }
}
```

---

## For Developers (Using the API)

### Getting Started

1. **Sign up for RapidAPI**
   - Visit [rapidapi.com](https://rapidapi.com)
   - Create an account or log in

2. **Subscribe to MailMint API**
   - Search for "MailMint Email Validation" or find it in your category
   - Choose a subscription plan (Basic, Pro, Ultra, etc.)
   - Subscribe to get your RapidAPI key

3. **Get Your API Key**
   - Go to your RapidAPI Dashboard
   - Navigate to "My Apps" → "Default Application"
   - Copy your `X-RapidAPI-Key` (or find it in the API's code snippets)

### Base URL

The base URL for RapidAPI requests is:
```
https://mailmint-email-validation.p.rapidapi.com
```

**Note:** The exact URL may vary. Always check the RapidAPI API listing page for the current base URL.

---

## Authentication

RapidAPI handles authentication automatically. Include these headers in every request:

### Required Headers

```http
X-RapidAPI-Key: YOUR_RAPIDAPI_KEY
X-RapidAPI-Host: mailmint-email-validation.p.rapidapi.com
Content-Type: application/json
```

**Where to find these:**
- `X-RapidAPI-Key`: Your personal API key from RapidAPI dashboard
- `X-RapidAPI-Host`: The hostname shown on the API's RapidAPI page

### Authentication Example

```bash
curl -X POST "https://mailmint-email-validation.p.rapidapi.com/api/v1/validate" \
  -H "X-RapidAPI-Key: YOUR_RAPIDAPI_KEY" \
  -H "X-RapidAPI-Host: mailmint-email-validation.p.rapidapi.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## API Endpoints

### Health Check

Check if the API is running:

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

Validate an email address:

```http
POST /api/v1/validate
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
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

**Invalid Email Response (200):**
```json
{
  "success": true,
  "data": {
    "email": "invalid-email",
    "valid": false,
    "score": 0,
    "details": {
      "syntax": false,
      "dns": null,
      "mx_records": null,
      "disposable": null,
      "role_based": null
    }
  }
}
```

### Response Fields

- `success` (boolean): Whether the request was successful
- `data.email` (string): The email address that was validated
- `data.valid` (boolean): Overall validation result
- `data.score` (number): Validation score (0-120)
- `data.details.syntax` (boolean|null): Syntax validation result
- `data.details.dns` (boolean|null): DNS lookup result
- `data.details.mx_records` (boolean|null): MX records check result
- `data.details.disposable` (boolean|null): Whether email is from disposable domain
- `data.details.role_based` (boolean|null): Whether email is role-based (admin@, support@, etc.)

### Scoring System

Maximum score: **120 points**

Breakdown:
- Syntax validation: **20 points**
- DNS lookup: **20 points**
- MX records: **40 points**
- Not disposable: **20 points**
- Not role-based: **20 points**

An email is considered **valid** only if all checks pass (score = 120).

---

## Code Examples

### JavaScript (Fetch API)

```javascript
const options = {
  method: 'POST',
  headers: {
    'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY',
    'X-RapidAPI-Host': 'mailmint-email-validation.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com'
  })
};

fetch('https://mailmint-email-validation.p.rapidapi.com/api/v1/validate', options)
  .then(response => response.json())
  .then(data => {
    console.log('Validation result:', data);
    if (data.success && data.data.valid) {
      console.log(`✅ Email ${data.data.email} is valid (score: ${data.data.score})`);
    } else {
      console.log(`❌ Email ${data.data.email} is invalid (score: ${data.data.score})`);
    }
  })
  .catch(error => console.error('Error:', error));
```

### Node.js (Axios)

```javascript
const axios = require('axios');

async function validateEmail(email) {
  try {
    const response = await axios.post(
      'https://mailmint-email-validation.p.rapidapi.com/api/v1/validate',
      { email },
      {
        headers: {
          'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY',
          'X-RapidAPI-Host': 'mailmint-email-validation.p.rapidapi.com',
          'Content-Type': 'application/json'
        }
      }
    );

    const { data } = response.data;
    return {
      valid: data.valid,
      score: data.score,
      details: data.details
    };
  } catch (error) {
    console.error('Validation error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
validateEmail('test@example.com')
  .then(result => console.log('Result:', result))
  .catch(error => console.error('Failed:', error));
```

### Python (Requests)

```python
import requests

url = "https://mailmint-email-validation.p.rapidapi.com/api/v1/validate"

payload = {
    "email": "user@example.com"
}

headers = {
    "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
    "X-RapidAPI-Host": "mailmint-email-validation.p.rapidapi.com",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

if data['success']:
    result = data['data']
    if result['valid']:
        print(f"✅ Email {result['email']} is valid (score: {result['score']})")
    else:
        print(f"❌ Email {result['email']} is invalid (score: {result['score']})")
    print(f"Details: {result['details']}")
else:
    print(f"Error: {data.get('error', 'Unknown error')}")
```

### Python (Async with aiohttp)

```python
import aiohttp
import asyncio

async def validate_email(email):
    url = "https://mailmint-email-validation.p.rapidapi.com/api/v1/validate"
    
    headers = {
        "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
        "X-RapidAPI-Host": "mailmint-email-validation.p.rapidapi.com",
        "Content-Type": "application/json"
    }
    
    payload = {"email": email}
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, headers=headers) as response:
            data = await response.json()
            return data['data'] if data['success'] else None

# Usage
async def main():
    result = await validate_email('test@example.com')
    if result:
        print(f"Valid: {result['valid']}, Score: {result['score']}")

asyncio.run(main())
```

### PHP (cURL)

```php
<?php
$url = 'https://mailmint-email-validation.p.rapidapi.com/api/v1/validate';

$data = json_encode(['email' => 'user@example.com']);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-RapidAPI-Key: YOUR_RAPIDAPI_KEY',
    'X-RapidAPI-Host: mailmint-email-validation.p.rapidapi.com',
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    if ($result['success'] && $result['data']['valid']) {
        echo "✅ Email is valid (score: {$result['data']['score']})\n";
    } else {
        echo "❌ Email is invalid (score: {$result['data']['score']})\n";
    }
} else {
    echo "Error: HTTP $httpCode\n";
}
?>
```

### cURL

```bash
curl -X POST "https://mailmint-email-validation.p.rapidapi.com/api/v1/validate" \
  -H "X-RapidAPI-Key: YOUR_RAPIDAPI_KEY" \
  -H "X-RapidAPI-Host: mailmint-email-validation.p.rapidapi.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Ruby

```ruby
require 'net/http'
require 'json'
require 'uri'

uri = URI('https://mailmint-email-validation.p.rapidapi.com/api/v1/validate')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Post.new(uri.path)
request['X-RapidAPI-Key'] = 'YOUR_RAPIDAPI_KEY'
request['X-RapidAPI-Host'] = 'mailmint-email-validation.p.rapidapi.com'
request['Content-Type'] = 'application/json'
request.body = { email: 'user@example.com' }.to_json

response = http.request(request)
result = JSON.parse(response.body)

if result['success']
  data = result['data']
  puts "Email: #{data['email']}"
  puts "Valid: #{data['valid']}"
  puts "Score: #{data['score']}"
else
  puts "Error: #{result['error']}"
end
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func validateEmail(email string) error {
    url := "https://mailmint-email-validation.p.rapidapi.com/api/v1/validate"
    
    payload := map[string]string{"email": email}
    jsonData, _ := json.Marshal(payload)
    
    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    req.Header.Set("X-RapidAPI-Key", "YOUR_RAPIDAPI_KEY")
    req.Header.Set("X-RapidAPI-Host", "mailmint-email-validation.p.rapidapi.com")
    req.Header.Set("Content-Type", "application/json")
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    
    body, _ := io.ReadAll(resp.Body)
    var result map[string]interface{}
    json.Unmarshal(body, &result)
    
    if result["success"].(bool) {
        data := result["data"].(map[string]interface{})
        fmt.Printf("Valid: %v, Score: %.0f\n", data["valid"], data["score"])
    }
    
    return nil
}

func main() {
    validateEmail("test@example.com")
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | Success | Request processed successfully (even if email is invalid) |
| 400 | Bad Request | Missing or invalid email parameter |
| 401 | Unauthorized | Invalid or missing RapidAPI key |
| 402 | Payment Required | Insufficient credits/quota exceeded |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | Request timeout or service temporarily unavailable |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Errors

**Missing Email:**
```json
{
  "success": false,
  "error": "Email is required"
}
```

**Invalid RapidAPI Key:**
```json
{
  "success": false,
  "error": "Invalid RapidAPI key"
}
```

**Rate Limit Exceeded:**
```json
{
  "success": false,
  "error": "Too many requests, please slow down"
}
```

**Insufficient Credits:**
```json
{
  "success": false,
  "error": "Insufficient credits"
}
```

### Error Handling Example

```javascript
async function validateEmailWithErrorHandling(email) {
  try {
    const response = await fetch(
      'https://mailmint-email-validation.p.rapidapi.com/api/v1/validate',
      {
        method: 'POST',
        headers: {
          'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY',
          'X-RapidAPI-Host': 'mailmint-email-validation.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // Handle HTTP errors
      switch (response.status) {
        case 400:
          throw new Error(`Bad Request: ${data.error}`);
        case 401:
          throw new Error('Invalid API key. Check your RapidAPI key.');
        case 402:
          throw new Error('Insufficient credits. Upgrade your plan.');
        case 429:
          throw new Error('Rate limit exceeded. Please slow down.');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
      }
    }

    if (!data.success) {
      throw new Error(data.error || 'Validation failed');
    }

    return data.data;
  } catch (error) {
    console.error('Validation error:', error.message);
    throw error;
  }
}
```

---

## Rate Limits & Pricing

### Rate Limits

Rate limits depend on your RapidAPI subscription plan:

- **Basic Plan**: Usually 10-100 requests/month
- **Pro Plan**: Usually 1,000-10,000 requests/month
- **Ultra Plan**: Usually 100,000+ requests/month

**Note:** Check the RapidAPI listing page for current rate limits and pricing.

### Rate Limit Headers

RapidAPI includes rate limit information in response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits

```javascript
async function validateWithRetry(email, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(/* ... */);
      
      if (response.status === 429) {
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const waitTime = resetTime ? (resetTime * 1000 - Date.now()) : 60000;
        
        if (i < maxRetries - 1) {
          console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Invalid RapidAPI key" Error

**Problem:** Your API key is incorrect or expired.

**Solutions:**
- Verify your `X-RapidAPI-Key` in the RapidAPI dashboard
- Ensure you've subscribed to the API
- Check that your subscription is active
- Regenerate your API key if needed

#### 2. "Too many requests" Error (429)

**Problem:** You've exceeded your rate limit.

**Solutions:**
- Check your current usage in RapidAPI dashboard
- Upgrade to a higher plan if needed
- Implement request queuing/throttling in your code
- Use the `X-RateLimit-Reset` header to wait before retrying

#### 3. "Insufficient credits" Error (402)

**Problem:** Your plan's monthly quota is exhausted.

**Solutions:**
- Upgrade to a plan with higher limits
- Wait for monthly quota reset
- Contact RapidAPI support for quota increase

#### 4. Connection Timeout

**Problem:** Request takes too long or times out.

**Solutions:**
- Check your internet connection
- Verify the API is operational (check `/health` endpoint)
- Increase timeout settings in your HTTP client
- Retry the request

#### 5. DNS/MX Lookup Failures

**Problem:** Valid emails return `dns: false` or `mx_records: false`.

**Solutions:**
- This is expected for invalid domains
- Check if the domain actually exists
- Some domains may have temporary DNS issues
- Retry validation after a few minutes

### Debugging Tips

1. **Enable Verbose Logging:**
   ```javascript
   console.log('Request URL:', url);
   console.log('Request Headers:', headers);
   console.log('Request Body:', body);
   console.log('Response Status:', response.status);
   console.log('Response Body:', await response.json());
   ```

2. **Test with Health Endpoint:**
   ```bash
   curl -X GET "https://mailmint-email-validation.p.rapidapi.com/health" \
     -H "X-RapidAPI-Key: YOUR_RAPIDAPI_KEY" \
     -H "X-RapidAPI-Host: mailmint-email-validation.p.rapidapi.com"
   ```

3. **Validate Request Format:**
   - Ensure `Content-Type: application/json` header is set
   - Verify JSON body is properly formatted
   - Check that email field is a string

4. **Check Response Headers:**
   ```javascript
   response.headers.forEach((value, key) => {
     console.log(`${key}: ${value}`);
   });
   ```

### Getting Help

- **RapidAPI Support**: [support.rapidapi.com](https://support.rapidapi.com)
- **API Documentation**: Check the RapidAPI listing page
- **Status Page**: Check if there are any known issues
- **Community**: RapidAPI community forums

---

## Best Practices

### 1. Cache Results

Email validation results don't change frequently. Cache results to reduce API calls:

```javascript
const cache = new Map();

async function validateEmailCached(email) {
  if (cache.has(email)) {
    return cache.get(email);
  }
  
  const result = await validateEmail(email);
  cache.set(email, result);
  
  // Expire cache after 24 hours
  setTimeout(() => cache.delete(email), 24 * 60 * 60 * 1000);
  
  return result;
}
```

### 2. Batch Processing

When validating multiple emails, add delays between requests:

```javascript
async function validateEmails(emails) {
  const results = [];
  
  for (const email of emails) {
    const result = await validateEmail(email);
    results.push(result);
    
    // Wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}
```

### 3. Error Recovery

Implement retry logic with exponential backoff:

```javascript
async function validateWithRetry(email, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await validateEmail(email);
    } catch (error) {
      if (i === retries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 4. Validate Before Sending

Always validate emails before sending emails or storing in database:

```javascript
async function registerUser(email, password) {
  const validation = await validateEmail(email);
  
  if (!validation.valid) {
    throw new Error('Invalid email address');
  }
  
  // Proceed with registration
  return createUser(email, password);
}
```

---

## Additional Resources

- **RapidAPI Dashboard**: [rapidapi.com/hub](https://rapidapi.com/hub)
- **API Status**: Check RapidAPI status page
- **Client Guide**: See `CLIENT_GUIDE.md` for direct API usage
- **Developer Guide**: See `DEVELOPER_GUIDE.md` for backend setup

---

**Last Updated:** 2024

**API Version:** v1

