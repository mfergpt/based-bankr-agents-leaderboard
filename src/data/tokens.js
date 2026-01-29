// Token configuration - now powered by Bankr Registry
// This file provides the default/fallback tokens and utility functions
// Live data is fetched from GitHub: https://github.com/BankrBot/tokenized-agents

// Default Bankr agents (fallback if GitHub fetch fails)
// Updated: 2025-01-29
export const WATCHED_TOKENS = {
  primary: [
    {
      id: 'bnkr',
      symbol: 'BNKR',
      name: 'Bankr',
      color: '#4CAF50',
      platform: 'base',
      contract: '0x22af33fe49fd1fa80c7149773dde5890d3c76f3b',
      enabled: true
    },
    {
      id: 'clawd',
      symbol: 'CLAWD',
      name: 'Clawd',
      color: '#9C27B0',
      platform: 'base',
      contract: '0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07',
      enabled: true
    },
    {
      id: 'starkbot',
      symbol: 'STARKBOT',
      name: 'Starkbot',
      color: '#FF5722',
      platform: 'base',
      contract: '0x587cd533f418825521f3a1daa7ccd1e7339a1b07',
      enabled: true
    },
    {
      id: 'clonk',
      symbol: 'CLONK',
      name: 'Clonk',
      color: '#2196F3',
      platform: 'base',
      contract: '0xad6c0fe4fc0c11d46032ee3ef8e1a3c37c677b07',
      enabled: true
    },
    {
      id: 'ember',
      symbol: 'EMBER',
      name: 'Ember',
      color: '#FF9800',
      platform: 'base',
      contract: '0x7ffbe850d2d45242efdb914d7d4dbb682d0c9b07',
      enabled: true
    },
    {
      id: 'molt',
      symbol: 'MOLT',
      name: 'Molt',
      color: '#E91E63',
      platform: 'base',
      contract: '0xb695559b26bb2c9703ef1935c37aeae9526bab07',
      enabled: true
    },
    {
      id: 'clawdia',
      symbol: 'CLAWDIA',
      name: 'Clawdia',
      color: '#00BCD4',
      platform: 'base',
      contract: '0xbbd9ade16525acb4b336b6dad3b9762901522b07',
      enabled: true
    },
    {
      id: 'solvr',
      symbol: 'SOLVR',
      name: 'Solvr',
      color: '#8BC34A',
      platform: 'base',
      contract: '0x6dfb7bfa06e7c2b6c20c22c0afb44852c201eb07',
      enabled: true
    },
    {
      id: 'clawditor',
      symbol: 'CLAWDITOR',
      name: 'Clawditor',
      color: '#673AB7',
      platform: 'base',
      contract: '0xba7cd6d68dd9df817d1a86f534e29afe54461b07',
      enabled: true
    }
  ],
  secondary: [],
  tertiary: []
};

// Get all tokens as a flat array
export function getAllTokens() {
  return [
    ...WATCHED_TOKENS.primary,
    ...WATCHED_TOKENS.secondary,
    ...WATCHED_TOKENS.tertiary
  ];
}

// Get tokens by tier
export function getTokensByTier(tier) {
  return WATCHED_TOKENS[tier] || [];
}
