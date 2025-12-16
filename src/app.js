const { randomUUID } = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const pool = require('./database/database');
const { validateSyntax, validateDNS, isDisposable, isRoleBased } = require('./utils/emailValidator');
const { apiKeyAuth } = require('./middleware/apiKeyAuth');
const { deductCredit, logUsage } = require('./services/apiKeyService');

const app = express();

// Support deployments behind proxies (e.g., RapidAPI, ingress)
app.set('trust proxy', 1);

// Global middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request-scoped logging with request IDs
app.use((req, res, next) => {
  const requestId = randomUUID();
  const start = Date.now();
  req.requestId = requestId;

  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'request_start',
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
    })
  );

  res.on('finish', () => {
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'request_complete',
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Date.now() - start,
      })
    );
  });

  next();
});

// Basic request timeout guard
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 10000);
app.use((req, res, next) => {
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'request_timeout',
        requestId: req.requestId,
        path: req.path,
        timeout_ms: REQUEST_TIMEOUT_MS,
      })
    );
    if (!res.headersSent) {
      res.status(503).json({ success: false, error: 'Request timed out' });
    }
  });
  next();
});

// Rate limiting (per IP). Can be tuned via env.
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  limit: Number(process.env.RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please slow down',
    });
  },
});
app.use('/api/', limiter);

// Optional startup DB connectivity check (skipped in tests with SKIP_DB_CHECK=true)
if (process.env.SKIP_DB_CHECK !== 'true') {
  pool.query('SELECT NOW()', (err, dbRes) => {
    if (err) {
      console.error('❌ Database connection failed:', err);
    } else {
      console.log('✅ Database connected at:', dbRes.rows[0].now);
    }
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Email Validation API is running',
  });
});

// RapidAPI webhook endpoint for subscription events
// Note: This endpoint should be protected by RapidAPI's webhook secret or IP whitelist
app.post('/webhooks/rapidapi', express.json(), async (req, res) => {
  try {
    const { handleSubscriptionWebhook } = require('./services/rapidapiWebhookService');
    
    // Optional: Verify webhook signature if RapidAPI provides one
    const webhookSecret = process.env.RAPIDAPI_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-rapidapi-signature'] || req.headers['x-webhook-signature'];
      // TODO: Add signature verification logic here when RapidAPI provides signature format
      // For now, you can protect this endpoint via:
      // 1. IP whitelist (configure in RapidAPI dashboard)
      // 2. Additional secret header check
      // 3. Firewall rules
    }
    
    // Log webhook receipt for debugging
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'webhook_received',
        requestId: req.requestId,
        event: req.body.event || req.body.type,
        rapidapi_user_id: req.body.user?.id || req.body.userId
      })
    );

    const result = await handleSubscriptionWebhook(req.body);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message || 'Webhook processed successfully',
        data: {
          userId: result.userId,
          apiKey: result.apiKey,
          plan: result.plan,
          credits: result.credits
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to process webhook'
      });
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'webhook_error',
        requestId: req.requestId,
        error: error.message,
        stack: error.stack
      })
    );
    res.status(500).json({
      success: false,
      error: 'Internal server error processing webhook'
    });
  }
});

// Main validation endpoint (protected by API key)
app.post('/api/v1/validate', apiKeyAuth, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const syntaxValid = validateSyntax(email);

    if (!syntaxValid) {
      const responsePayload = {
        success: true,
        data: {
          email,
          valid: false,
          score: 0,
          details: {
            syntax: false,
            dns: null,
            mx_records: null,
            disposable: null,
            role_based: null,
          },
        },
      };

      const [deducted] = await Promise.all([
        deductCredit(req.apiKeyData.id),
        logUsage(req.apiKeyData.id, email, responsePayload.data),
      ]);

      if (!deducted) {
        return res.status(402).json({
          success: false,
          error: 'Insufficient credits',
        });
      }

      return res.status(200).json(responsePayload);
    }

    const [dnsResult, disposable, roleBased] = await Promise.all([
      validateDNS(email),
      isDisposable(email),
      Promise.resolve(isRoleBased(email)),
    ]);

    let score = 0;
    if (syntaxValid) score += 20;
    if (dnsResult.dns) score += 20;
    if (dnsResult.mx_records) score += 40;
    if (!disposable) score += 20;
    if (!roleBased) score += 20;

    const responsePayload = {
      success: true,
      data: {
        email,
        valid: syntaxValid && dnsResult.dns && dnsResult.mx_records && !disposable && !roleBased,
        score,
        details: {
          syntax: syntaxValid,
          dns: dnsResult.dns,
          mx_records: dnsResult.mx_records,
          disposable,
          role_based: roleBased,
        },
      },
    };

    const [deducted] = await Promise.all([
      deductCredit(req.apiKeyData.id),
      logUsage(req.apiKeyData.id, email, responsePayload.data),
    ]);

    if (!deducted) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
      });
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'validation_error',
        requestId: req.requestId,
        error: error.message,
      })
    );
    res.status(500).json({
      success: false,
      error: 'Failed to validate email',
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'unhandled_error',
      requestId: req.requestId,
      error: err.stack,
    })
  );
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

module.exports = app;

