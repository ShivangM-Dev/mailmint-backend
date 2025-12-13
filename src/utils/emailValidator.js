const dns = require('dns');
const { promisify } = require('util');
const resolveMx = promisify(dns.resolveMx);
const { isDisposable } = require('./disposableDomains');

/**
 * Validates email syntax using regex pattern
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if syntax is valid, false otherwise
 */
function validateSyntax(email) {
  // Check if email is a string and not empty
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Trim whitespace
  email = email.trim();

  // Comprehensive email regex pattern
  // Matches: user@domain.com, user.name@sub.domain.com, user+tag@domain.co.uk
  const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return emailRegex.test(email);
}

/**
 * Checks if domain has valid DNS and MX records
 * @param {string} email - Email address to validate
 * @returns {Promise<Object>} - { dns: boolean, mx_records: boolean, mx_servers: array }
 */
async function validateDNS(email) {
  try {
    const domain = email.split('@')[1];
    if (!domain) {
      return {
        dns: false,
        mx_records: false,
        mx_servers: []
      };
    }
    const mxRecords = await resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      const sortedMx = mxRecords
        .sort((a, b) => a.priority - b.priority)
        .map(record => record.exchange);
      return {
        dns: true,
        mx_records: true,
        mx_servers: sortedMx
      };
    }
    return {
      dns: true,
      mx_records: false,
      mx_servers: []
    };
  } catch (error) {
    return {
      dns: false,
      mx_records: false,
      mx_servers: []
    };
  }
}

/**
 * Checks if email is role-based (generic business emails)
 * @param {string} email - Email address to check
 * @returns {boolean} - True if role-based, false otherwise
 */
function isRoleBased(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Extract local part (before @)
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const localPart = parts[0].toLowerCase();

  // Common role-based email prefixes
  const rolePrefixes = [
    'admin', 'administrator',
    'info', 'information',
    'support', 'help', 'helpdesk',
    'sales', 'marketing',
    'contact', 'hello', 'hi',
    'office', 'team',
    'billing', 'accounts', 'accounting',
    'hr', 'careers', 'jobs', 'recruiting',
    'noreply', 'no-reply', 'donotreply',
    'service', 'services',
    'webmaster', 'hostmaster', 'postmaster',
    'abuse', 'security',
    'legal', 'privacy',
    'press', 'media', 'pr',
    'feedback', 'suggestions'
  ];

  // Check if local part matches any role prefix exactly
  return rolePrefixes.includes(localPart);
}

module.exports = { 
  validateSyntax, 
  validateDNS, 
  isDisposable,
  isRoleBased 
};
