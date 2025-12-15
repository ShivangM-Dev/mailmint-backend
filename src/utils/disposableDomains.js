const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

const fallbackCachePath = path.join(__dirname, '..', '..', 'cache', 'disposable-domains.json');
const CACHE_PATH = process.env.DISPOSABLE_CACHE_PATH || fallbackCachePath;

function ensureCacheDir() {
  const dir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readDiskCache() {
  try {
    const stat = fs.statSync(CACHE_PATH);
    if (Date.now() - stat.mtimeMs > CACHE_DURATION) {
      return null;
    }
    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.generic) && Array.isArray(parsed.withDNS) && Array.isArray(parsed.sha1)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function writeDiskCache(lists) {
  try {
    ensureCacheDir();
    fs.writeFileSync(CACHE_PATH, JSON.stringify(lists), 'utf8');
  } catch (err) {
    console.warn('Unable to persist disposable domains cache:', err.message);
  }
}

/**
 * Fetches a single disposable domains list
 * @param {string} url - URL to fetch from
 * @returns {Promise<Array>} - Array of domains
 */
async function fetchList(url) {
  try {
    const response = await axios.get(url, { timeout: 8000 });
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

  // Allow overriding domain list for testing or offline mode
  if (process.env.DISPOSABLE_DOMAINS_OVERRIDE) {
    const domains = process.env.DISPOSABLE_DOMAINS_OVERRIDE.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
    const combined = new Set(domains);
    cachedDomains = {
      generic: domains,
      withDNS: [],
      sha1: [],
      combined
    };
    lastFetchTime = now;
    return combined;
  }

  if (cachedDomains.combined && lastFetchTime && now - lastFetchTime < CACHE_DURATION) {
    return cachedDomains.combined;
  }

  // Try disk cache first
  const disk = readDiskCache();
  if (disk) {
    cachedDomains = {
      ...disk,
      combined: combineLists(disk),
    };
    lastFetchTime = now;
    return cachedDomains.combined;
  }

  const lists = await fetchAllDisposableDomains();
  const combined = combineLists(lists);

  cachedDomains.generic = lists.generic;
  cachedDomains.withDNS = lists.withDNS;
  cachedDomains.sha1 = lists.sha1;
  cachedDomains.combined = combined;
  lastFetchTime = now;

  writeDiskCache(lists);

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