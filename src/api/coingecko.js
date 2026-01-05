// Main API service - token data fetching with fallback chain
// 1. GeckoTerminal: 30 calls/min, 6 months historical OHLCV (primary)
// 2. CoinGecko: 10-30 calls/min, historical market cap (secondary)
// 3. DexScreener: No limits, current data only (last resort)
// DexPaprika: DISABLED - CORS blocked from browser-based apps (GitHub Pages)

import {
  fetchGeckoTerminalMarketCap,
  fetchAllTokensMarketCap as fetchAllGeckoTerminal,
  clearCache as clearGeckoTerminalCache,
  daysToApiParam
} from './geckoterminal';

// DexPaprika disabled - CORS blocked from browser-based apps (GitHub Pages)
// import {
//   fetchDexPaprikaMarketCap,
//   clearCache as clearDexPaprikaCache
// } from './dexpaprika';

import { fetchDexScreenerMarketCap } from './dexscreener';

import {
  fetchCoinGeckoBackupMarketCap,
  clearCache as clearCoinGeckoBackupCache
} from './coingecko-backup';

// Re-export the GeckoTerminal functions as the main API
export { daysToApiParam };

// Simple cache for combined results
const resultCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const cached = resultCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  resultCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch market cap data for a token
 * Fallback chain: GeckoTerminal -> CoinGecko -> DexScreener
 */
export async function fetchTokenMarketCap(token, days = 30) {
  const cacheKey = `token_${token.id}_${days}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let result = null;

  // 1. Try GeckoTerminal first (has historical OHLCV, up to 6 months)
  try {
    console.log(`Fetching ${token.symbol} from GeckoTerminal...`);
    result = await fetchGeckoTerminalMarketCap(token, days);

    if (result && result.data && result.data.length > 0) {
      console.log(`✓ ${token.symbol}: ${result.data.length} data points from GeckoTerminal`);
      setCache(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.warn(`GeckoTerminal failed for ${token.symbol}:`, error.message);
  }

  // 2. Try CoinGecko (has historical market cap data)
  try {
    console.log(`Trying CoinGecko for ${token.symbol}...`);
    result = await fetchCoinGeckoBackupMarketCap(token, days);

    if (result && result.data && result.data.length > 0) {
      console.log(`✓ ${token.symbol}: ${result.data.length} data points from CoinGecko`);
      setCache(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.warn(`CoinGecko failed for ${token.symbol}:`, error.message);
  }

  // 3. Last resort: DexScreener (only current data, no history)
  try {
    console.log(`Trying DexScreener for ${token.symbol}...`);
    result = await fetchDexScreenerMarketCap(token);

    if (result && result.data && result.data.length > 0) {
      console.log(`✓ ${token.symbol}: current data from DexScreener`);
      setCache(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.warn(`DexScreener failed for ${token.symbol}:`, error.message);
  }

  console.warn(`✗ ${token.symbol}: No data from any source`);
  return null;
}

/**
 * Fetch market cap data for multiple tokens
 */
export async function fetchAllTokensMarketCap(tokens, days = 30, onProgress) {
  const results = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: tokens.length,
        token: token.symbol
      });
    }

    const result = await fetchTokenMarketCap(token, days);

    if (result) {
      results.push(result);
    } else {
      results.push({
        ...token,
        data: [],
        error: true,
        source: 'none'
      });
    }
  }

  return results;
}

/**
 * Clear all caches
 */
export function clearCache() {
  resultCache.clear();
  clearGeckoTerminalCache();
  // clearDexPaprikaCache(); // Disabled
  clearCoinGeckoBackupCache();
}

/**
 * Get token info (for AddToken component)
 */
export async function getTokenByContract(platform, contractAddress) {
  // Import dynamically to avoid circular deps
  const { getTokenInfo } = await import('./geckoterminal');
  return getTokenInfo(platform, contractAddress);
}
