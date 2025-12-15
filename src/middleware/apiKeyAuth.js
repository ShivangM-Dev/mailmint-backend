const { validateApiKey } = require('../services/apiKeyService');

// Optional RapidAPI integration:
// - RapidAPI clients authenticate with RapidAPI itself.
// - RapidAPI gateway calls your backend with an `x-rapidapi-proxy-secret` you configure.
// - You map those calls onto a single internal API key for credits/usage tracking.
const RAPIDAPI_PROXY_SECRET = process.env.RAPIDAPI_PROXY_SECRET || null;
const RAPIDAPI_INTERNAL_API_KEY = process.env.RAPIDAPI_INTERNAL_API_KEY || null;

/**
 * Middleware to authenticate requests using API key.
 *
 * Supports two modes:
 * 1) RapidAPI gateway:
 *    - Verify `x-rapidapi-proxy-secret` matches `RAPIDAPI_PROXY_SECRET`
 *    - Use `RAPIDAPI_INTERNAL_API_KEY` for credits + logging
 *
 * 2) First‑party / direct clients (your website, direct consumers):
 *    - Authorization: Bearer <api_key>
 *    - x-api-key: <api_key>
 *    - ?api_key=<api_key>
 */
async function apiKeyAuth(req, res, next) {
  try {
    // 1) RapidAPI gateway authentication (no per-consumer key here, RapidAPI handles that)
    const rapidSecretHeader = req.headers['x-rapidapi-proxy-secret'];

    if (rapidSecretHeader && RAPIDAPI_PROXY_SECRET) {
      if (rapidSecretHeader !== RAPIDAPI_PROXY_SECRET) {
        return res.status(401).json({
          success: false,
          error: 'Invalid RapidAPI proxy secret.',
        });
      }

      if (!RAPIDAPI_INTERNAL_API_KEY) {
        console.error('RAPIDAPI_INTERNAL_API_KEY is not configured');
        return res.status(500).json({
          success: false,
          error: 'Server authentication configuration error',
        });
      }

      const validation = await validateApiKey(RAPIDAPI_INTERNAL_API_KEY);

      if (!validation.ok) {
        return res.status(401).json({
          success: false,
          error: 'RapidAPI internal key is invalid or inactive.',
        });
      }

      req.apiKeyData = validation.keyData;
      req.authSource = 'rapidapi';
      return next();
    }

    // 2) First‑party / direct API key authentication
    let apiKey = null;

    // Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }

    // x-api-key header
    if (!apiKey && req.headers['x-api-key']) {
      apiKey = req.headers['x-api-key'];
    }

    // api_key query parameter
    if (!apiKey && req.query.api_key) {
      apiKey = req.query.api_key;
    }

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error:
          'API key is required. Provide it via Authorization header, x-api-key header, or api_key query parameter.',
      });
    }

    const validation = await validateApiKey(apiKey);

    if (!validation.ok) {
      const messageMap = {
        invalid_format: 'Invalid API key format.',
        not_found: 'API key not found.',
        inactive: 'API key is inactive.',
      };
      const errorMessage = messageMap[validation.reason] || 'API key is invalid.';
      return res.status(401).json({
        success: false,
        error: errorMessage,
      });
    }

    req.apiKeyData = validation.keyData;
    req.authSource = 'first_party';

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

module.exports = { apiKeyAuth };
