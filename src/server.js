const PORT = process.env.PORT || 8000;
const express = require('express');
const cors = require('cors');
const app = express();
const pool = require('./database/database');
const { validateSyntax, validateDNS, isDisposable, isRoleBased } = require('./utils/emailValidator');
const { apiKeyAuth } = require('./middleware/apiKeyAuth');
const { deductCredit, logUsage } = require('./services/apiKeyService');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Email Validation API is running' 
  });
});

// Main validation endpoint (protected by API key)
app.post('/api/v1/validate', apiKeyAuth, async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email is provided
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }

    // Run syntax validation
    const syntaxValid = validateSyntax(email);

    // If syntax is invalid, no need to check DNS
    if (!syntaxValid) {
      const responsePayload = {
        success: true,
        data: {
          email: email,
          valid: false,
          score: 0,
          details: {
            syntax: false,
            dns: null,
            mx_records: null,
            disposable: null,
            role_based: null
          }
        }
      };

      // Log usage and attempt credit deduction even for invalid syntax
      const [deducted] = await Promise.all([
        deductCredit(req.apiKeyData.id),
        logUsage(req.apiKeyData.id, email, responsePayload.data)
      ]);

      if (!deducted) {
        return res.status(402).json({
          success: false,
          error: 'Insufficient credits'
        });
      }

      return res.status(200).json(responsePayload);
    }

    // Run DNS validation, disposable check, and role-based check in parallel
    const [dnsResult, disposable, roleBased] = await Promise.all([
      validateDNS(email),
      isDisposable(email),
      Promise.resolve(isRoleBased(email))
    ]);

    // Calculate score (out of 120, then normalize)
    let score = 0;
    if (syntaxValid) score += 20;
    if (dnsResult.dns) score += 20;
    if (dnsResult.mx_records) score += 40;
    if (!disposable) score += 20;
    if (!roleBased) score += 20;

    // Build response
    const responsePayload = {
      success: true,
      data: {
        email: email,
        valid: syntaxValid && dnsResult.dns && dnsResult.mx_records && !disposable && !roleBased,
        score: score,
        details: {
          syntax: syntaxValid,
          dns: dnsResult.dns,
          mx_records: dnsResult.mx_records,
          disposable: disposable,
          role_based: roleBased
        }
      }
    };
    // Deduct credit and log usage. Logging failures are non-blocking inside service.
    const [deducted] = await Promise.all([
      deductCredit(req.apiKeyData.id),
      logUsage(req.apiKeyData.id, email, responsePayload.data)
    ]);

    if (!deducted) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits'
      });
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate email'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint not found' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error' 
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});