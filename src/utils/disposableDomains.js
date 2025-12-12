const axios = require('axios');

// URLs to the disposable domains lists on GitHub
const DISPOSABLE_LISTS = {
  generic: 'https://disposable.github.io/disposable-email-domains/domains.json',
  withDNS: 'https://disposable.github.io/disposable-email-domains/domains_mx.json',
  sha1: 'https://disposable.github.io/disposable-email-domains/domains_sha1.json'
};

// Cache for domains lists
let cachedDomains = {
  generic: null,
  withDNS: null,
  sha1: null,
  combined: null
};
let lastFetchTime = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetches a single disposable domains list
 * @param {string} url - URL to fetch from
 * @returns {Promise<Array>} - Array of domains
 */
async function fetchList(url) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching list from ${url}:`, error.message);
    return [];
  }
}

/**
 * Fetches all disposable domains lists from GitHub
 * @returns {Promise<Object>} - Object with all three lists
 */
async function fetchAllDisposableDomains() {
  try {
    console.log('Fetching disposable domains lists...');
    
    // Fetch all three lists in parallel
    const [generic, withDNS, sha1] = await Promise.all([
      fetchList(DISPOSABLE_LISTS.generic),
      fetchList(DISPOSABLE_LISTS.withDNS),
      fetchList(DISPOSABLE_LISTS.sha1)
    ]);

    console.log(`Fetched ${generic.length} generic domains`);
    console.log(`Fetched ${withDNS.length} domains with DNS`);
    console.log(`Fetched ${sha1.length} SHA1 domains`);

    return { generic, withDNS, sha1 };
  } catch (error) {
    console.error('Error fetching disposable domains:', error.message);
    return { generic: [], withDNS: [], sha1: [] };
  }
}

/**
 * Combines all lists and removes duplicates using Set
 * @param {Object} lists - Object containing all three lists
 * @returns {Set} - Set of unique domains
 */
function combineLists(lists) {
  const allDomains = [
    ...lists.generic,
    ...lists.withDNS,
    ...lists.sha1
  ];
  
  // Use Set to remove duplicates and convert to lowercase
  const uniqueDomains = new Set(allDomains.map(domain => domain.toLowerCase()));
  
  console.log(`Combined total: ${uniqueDomains.size} unique disposable domains`);
  
  return uniqueDomains;
}

/**
 * Gets disposable domains with caching
 * @returns {Promise<Set>} - Set of disposable domains
 */
async function getDisposableDomains() {
  const now = Date.now();
  
  // Return cached domains if still valid
  if (cachedDomains.combined && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedDomains.combined;
  }
  
  // Fetch fresh lists
  const lists = await fetchAllDisposableDomains();
  
  // Combine and deduplicate
  const combined = combineLists(lists);
  
  // Update cache
  cachedDomains.generic = lists.generic;
  cachedDomains.withDNS = lists.withDNS;
  cachedDomains.sha1 = lists.sha1;
  cachedDomains.combined = combined;
  lastFetchTime = now;
  
  return combined;
}

/**
 * Checks if email domain is disposable
 * @param {string} email - Email address to check
 * @returns {Promise<boolean>} - True if disposable, false otherwise
 */
async function isDisposable(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Extract domain from email
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }
  
  const domain = parts[1];
  if (!domain) {
    return false;
  }

  // Convert to lowercase for case-insensitive comparison
  const lowercaseDomain = domain.toLowerCase();

  // Get combined disposable domains set
  const disposableDomains = await getDisposableDomains();

  // Check if domain is in the set (O(1) lookup)
  return disposableDomains.has(lowercaseDomain);
}

/**
 * Force refresh the cache (useful for manual updates)
 */
async function refreshCache() {
  console.log('Force refreshing disposable domains cache...');
  lastFetchTime = null;
  cachedDomains.combined = null;
  return await getDisposableDomains();
}

module.exports = { 
  isDisposable,
  refreshCache // Export in case you want to manually refresh
};