// Bankr Tokenized Agents Registry Fetcher
// Pulls token list from: https://github.com/BankrBot/tokenized-agents/blob/main/AGENTS.md

const AGENTS_RAW_URL = 'https://raw.githubusercontent.com/BankrBot/tokenized-agents/main/AGENTS.md';

// Cache for the agents list
let cachedAgents = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Generate a bright, visible color based on agent name
function generateTokenColor(name) {
  // Hash the name to get a consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate HSL color with high saturation and lightness for visibility
  const hue = Math.abs(hash % 360);
  const saturation = 70 + (Math.abs(hash >> 8) % 20); // 70-90%
  const lightness = 55 + (Math.abs(hash >> 16) % 15); // 55-70%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Parse AGENTS.md markdown table into token array
 * Expected format:
 * | Agent | Token Address | GeckoTerminal |
 * |-------|---------------|---------------|
 * | BNKR | `0x...` | [View](...) |
 */
function parseAgentsMd(markdown) {
  const lines = markdown.split('\n');
  const tokens = [];
  
  // Find table rows (skip header and separator)
  let inTable = false;
  let headerPassed = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect table start
    if (trimmed.startsWith('|') && trimmed.includes('Agent')) {
      inTable = true;
      continue;
    }
    
    // Skip separator line
    if (inTable && trimmed.match(/^\|[-\s|]+\|$/)) {
      headerPassed = true;
      continue;
    }
    
    // Parse data rows
    if (inTable && headerPassed && trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
      
      if (cells.length >= 2) {
        const agentName = cells[0].trim();
        // Extract address from backticks: `0x...`
        const addressMatch = cells[1].match(/`(0x[a-fA-F0-9]+)`/);
        const address = addressMatch ? addressMatch[1].toLowerCase() : null;
        
        if (agentName && address) {
          tokens.push({
            id: agentName.toLowerCase(),
            symbol: agentName.toUpperCase(),
            name: agentName,
            color: generateTokenColor(agentName),
            platform: 'base', // All Bankr tokens are on Base
            contract: address,
            enabled: true, // Enable all by default for leaderboard
            source: 'bankr-registry'
          });
        }
      }
    }
  }
  
  return tokens;
}

/**
 * Fetch and parse the Bankr tokenized agents list from GitHub
 * @param {boolean} forceRefresh - Bypass cache
 * @returns {Promise<Array>} Array of token objects
 */
export async function fetchBankrAgents(forceRefresh = false) {
  const now = Date.now();
  
  // Return cached if valid
  if (!forceRefresh && cachedAgents && (now - lastFetchTime) < CACHE_TTL) {
    console.log('Using cached Bankr agents list');
    return cachedAgents;
  }
  
  try {
    console.log('Fetching Bankr agents from GitHub...');
    const response = await fetch(AGENTS_RAW_URL, {
      cache: 'no-cache',
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch AGENTS.md: ${response.status}`);
    }
    
    const markdown = await response.text();
    const tokens = parseAgentsMd(markdown);
    
    if (tokens.length === 0) {
      throw new Error('No tokens parsed from AGENTS.md');
    }
    
    console.log(`Fetched ${tokens.length} Bankr agents`);
    
    // Update cache
    cachedAgents = tokens;
    lastFetchTime = now;
    
    return tokens;
  } catch (error) {
    console.error('Error fetching Bankr agents:', error);
    
    // Return cached data if available, even if stale
    if (cachedAgents) {
      console.warn('Using stale cached agents due to fetch error');
      return cachedAgents;
    }
    
    // Fallback to hardcoded list if fetch fails completely
    return getFallbackAgents();
  }
}

/**
 * Fallback agents list in case GitHub is unreachable
 * This should be updated periodically as a backup
 */
function getFallbackAgents() {
  console.warn('Using fallback agents list');
  const fallback = [
    { symbol: 'BNKR', contract: '0x22af33fe49fd1fa80c7149773dde5890d3c76f3b' },
    { symbol: 'CLAWD', contract: '0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07' },
    { symbol: 'STARKBOT', contract: '0x587cd533f418825521f3a1daa7ccd1e7339a1b07' },
    { symbol: 'CLONK', contract: '0xad6c0fe4fc0c11d46032ee3ef8e1a3c37c677b07' },
    { symbol: 'EMBER', contract: '0x7ffbe850d2d45242efdb914d7d4dbb682d0c9b07' },
    { symbol: 'MOLT', contract: '0xb695559b26bb2c9703ef1935c37aeae9526bab07' },
    { symbol: 'CLAWDIA', contract: '0xbbd9ade16525acb4b336b6dad3b9762901522b07' },
    { symbol: 'SOLVR', contract: '0x6dfb7bfa06e7c2b6c20c22c0afb44852c201eb07' },
    { symbol: 'CLAWDITOR', contract: '0xba7cd6d68dd9df817d1a86f534e29afe54461b07' }
  ];
  
  return fallback.map(t => ({
    id: t.symbol.toLowerCase(),
    symbol: t.symbol,
    name: t.symbol,
    color: generateTokenColor(t.symbol),
    platform: 'base',
    contract: t.contract,
    enabled: true,
    source: 'fallback'
  }));
}

/**
 * Get cached agents (synchronous, for initial render)
 */
export function getCachedAgents() {
  return cachedAgents || getFallbackAgents();
}

/**
 * Clear the agents cache
 */
export function clearAgentsCache() {
  cachedAgents = null;
  lastFetchTime = 0;
}

/**
 * Get the raw GitHub URL for reference
 */
export function getRegistryUrl() {
  return 'https://github.com/BankrBot/tokenized-agents';
}
