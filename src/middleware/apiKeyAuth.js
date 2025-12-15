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
    const validation = await validateApiKey(apiKey);
    
    if (!validation.ok) {
      const messageMap = {
        invalid_format: 'Invalid API key format.',
        not_found: 'API key not found.',
        inactive: 'API key is inactive.'
      };
      const errorMessage = messageMap[validation.reason] || 'API key is invalid.';
      return res.status(401).json({
        success: false,
        error: errorMessage
      });
    }
    
    // Attach key data to request object for use in route handlers
    req.apiKeyData = validation.keyData;
    
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
