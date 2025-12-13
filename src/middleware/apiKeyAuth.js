const { validateApiKey } = require('../services/apiKeyService');

/**
 * Middleware to authenticate requests using API key
 * Expects API key in either:
 * - Authorization header as "Bearer <api_key>"
 * - x-api-key header
 * - api_key query parameter
 */
async function apiKeyAuth(req, res, next) {
  try {
    // Extract API key from different possible locations
    let apiKey = null;
    
    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }
    
    // Check x-api-key header
    if (!apiKey && req.headers['x-api-key']) {
      apiKey = req.headers['x-api-key'];
    }
    
    // Check query parameter
    if (!apiKey && req.query.api_key) {
      apiKey = req.query.api_key;
    }
    
    // If no API key provided
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key is required. Provide it via Authorization header, x-api-key header, or api_key query parameter.'
      });
    }
    
    // Validate the API key
    const keyData = await validateApiKey(apiKey);
    
    if (!keyData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key, or insufficient credits.'
      });
    }
    
    // Attach key data to request object for use in route handlers
    req.apiKeyData = keyData;
    
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

module.exports = { apiKeyAuth };
