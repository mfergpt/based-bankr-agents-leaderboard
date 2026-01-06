// CoinGecko API service (backup)
// Free tier: No API key required, 10-30 calls/min
// Historical market cap data directly available
// Note: Uses coin ID search, not contract addresses - best for major coins
// Docs: https://www.coingecko.com/en/api/documentation

import { startRateLimitWait } from './rateLimitState';

const BASE_URL = 'https://api.coingecko.com/api/v3';

// Simple cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting - CoinGecko free tier is ~10-30 calls/min
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000; // 3 seconds between requests

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function rateLimitedFetch(url, retryCount = 0) {
  const MAX_RETRIES = 2;
  const RATE_LIMIT_WAIT = 60; // seconds

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 429) {
      if (retryCount >= MAX_RETRIES) {
        console.warn('CoinGecko: Max retries reached after rate limiting');
        return null;
      }

      console.warn(`CoinGecko rate limited, waiting ${RATE_LIMIT_WAIT}s... (retry ${retryCount + 1}/${MAX_RETRIES})`);
      startRateLimitWait('CoinGecko', RATE_LIMIT_WAIT);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WAIT * 1000));
      return rateLimitedFetch(url, retryCount + 1);
    }

    return response;
  } catch (error) {
    console.error('CoinGecko fetch error:', error);
    return null;
  }
}

/**
 * Search for a coin by symbol
 * Returns the best matching coin ID
 */
export async function searchCoin(symbol, name) {
  const cacheKey = `coingecko_search_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/search?query=${encodeURIComponent(symbol)}`;
    const response = await rateLimitedFetch(url);

    if (!response || !response.ok) {
      console.warn(`CoinGecko: Search failed for ${symbol}`);
      return null;
    }

    const data = await response.json();

    if (!data?.coins || data.coins.length === 0) {
      return null;
    }

    // Find exact symbol match first
    const coins = data.coins;
    let bestMatch = coins.find(c =>
      c.symbol.toLowerCase() === symbol.toLowerCase()
    );

    // If no exact symbol match, try name match
    if (!bestMatch && name) {
      bestMatch = coins.find(c =>
        c.name.toLowerCase() === name.toLowerCase()
      );
    }

    // Fall back to first result if it's reasonably close
    if (!bestMatch && coins.length > 0) {
      if (coins[0].symbol.toLowerCase().startsWith(symbol.toLowerCase().slice(0, 2))) {
        bestMatch = coins[0];
      }
    }

    if (bestMatch) {
      setCache(cacheKey, bestMatch);
    }
    return bestMatch;
  } catch (error) {
    console.error(`CoinGecko search error:`, error);
    return null;
  }
}

/**
 * Get historical market chart data for a coin
 * Returns prices and market_caps arrays
 * @param {string} coinId - CoinGecko coin ID (e.g., 'bitcoin')
 * @param {number} days - Number of days of history to fetch
 */
export async function getMarketChart(coinId, days = 30) {
  const cacheKey = `coingecko_chart_${coinId}_${days}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    const response = await rateLimitedFetch(url);

    if (!response || !response.ok) {
      console.warn(`CoinGecko: No market chart for ${coinId}`);
      return null;
    }

    const data = await response.json();

    if (data) {
      setCache(cacheKey, data);
    }
    return data;
  } catch (error) {
    console.error(`CoinGecko market chart error:`, error);
    return null;
  }
}

/**
 * Get current coin data
 * @param {string} coinId - CoinGecko coin ID
 */
export async function getCoinData(coinId) {
  const cacheKey = `coingecko_coin_${coinId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const response = await rateLimitedFetch(url);

    if (!response || !response.ok) {
      return null;
    }

    const data = await response.json();
    if (data) {
      setCache(cacheKey, data);
    }
    return data;
  } catch (error) {
    console.error(`CoinGecko coin data error:`, error);
    return null;
  }
}

/**
 * Fetch market cap data for a token from CoinGecko
 * Note: This works best for major coins listed on CoinGecko
 */
export async function fetchCoinGeckoBackupMarketCap(token, days = 30) {
  try {
    // Step 1: Search for the coin by symbol
    const coin = await searchCoin(token.symbol, token.name);

    if (!coin) {
      console.warn(`CoinGecko backup: Coin not found for ${token.symbol}`);
      return null;
    }

    // Step 2: Get historical market chart data
    const chartData = await getMarketChart(coin.id, days);

    if (!chartData || !chartData.market_caps || chartData.market_caps.length === 0) {
      console.warn(`CoinGecko backup: No market data for ${token.symbol}`);
      return null;
    }

    // CoinGecko returns market_caps as [[timestamp, market_cap], ...]
    const data = chartData.market_caps
      .map(([timestamp, marketCap]) => ({
        x: timestamp,
        y: Math.round(marketCap)
      }))
      .filter(point => !isNaN(point.x) && !isNaN(point.y) && point.y > 0)
      .sort((a, b) => a.x - b.x);

    if (data.length === 0) {
      return null;
    }

    // Get current price from prices array
    const currentPrice = chartData.prices?.length > 0
      ? chartData.prices[chartData.prices.length - 1][1]
      : 0;

    const currentMarketCap = data[data.length - 1]?.y || 0;

    return {
      ...token,
      data,
      currentMarketCap,
      currentPrice,
      coinGeckoId: coin.id,
      source: 'coingecko',
      lastUpdated: Date.now()
    };
  } catch (error) {
    console.error(`CoinGecko backup error for ${token.symbol}:`, error);
    return null;
  }
}

/**
 * Clear cache
 */
export function clearCache() {
  cache.clear();
}
