// Token merger utility
// Groups tokens by symbol and keeps the one with the most data points

/**
 * Groups tokens by symbol and returns the best variant for each
 * @param {Array} tokens - Array of token objects with data
 * @returns {Array} - Deduplicated tokens, each with bestVariant info
 */
export function mergeTokenVariants(tokens) {
  // Group tokens by symbol (case-insensitive)
  const groups = new Map();

  tokens.forEach(token => {
    const key = token.symbol.toUpperCase();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(token);
  });

  // For each group, pick the best variant
  const merged = [];

  groups.forEach((variants, symbol) => {
    if (variants.length === 1) {
      // Only one variant, use as-is
      merged.push(variants[0]);
    } else {
      // Multiple variants - pick the one with most data points
      const sorted = [...variants].sort((a, b) => {
        const aPoints = a.data?.length || 0;
        const bPoints = b.data?.length || 0;
        return bPoints - aPoints;
      });

      const best = sorted[0];
      const others = sorted.slice(1);

      // Create merged token with info about all variants
      const mergedToken = {
        ...best,
        // Store info about all variants for reference
        variants: variants.map(v => ({
          id: v.id,
          platform: v.platform,
          contract: v.contract,
          dataPoints: v.data?.length || 0
        })),
        // IDs of other variants that should be hidden
        hiddenVariantIds: others.map(v => v.id),
        // Flag that this is a merged token
        isMerged: variants.length > 1
      };

      merged.push(mergedToken);

      // Also include the hidden variants but mark them
      others.forEach(variant => {
        merged.push({
          ...variant,
          isHiddenVariant: true,
          primaryVariantId: best.id
        });
      });
    }
  });

  return merged;
}

/**
 * Get display tokens (excludes hidden variants)
 * @param {Array} tokens - Array of tokens (possibly with hidden variants)
 * @returns {Array} - Tokens to display in UI
 */
export function getDisplayTokens(tokens) {
  return tokens.filter(t => !t.isHiddenVariant);
}

/**
 * Check if a token has variants on other chains
 * @param {Object} token - Token object
 * @returns {boolean}
 */
export function hasVariants(token) {
  return token.isMerged && token.variants?.length > 1;
}

/**
 * Get platform label for a merged token
 * @param {Object} token - Token object
 * @returns {string} - e.g., "Base" or "Base, Solana"
 */
export function getPlatformLabel(token) {
  if (!token.variants || token.variants.length <= 1) {
    return token.platform;
  }
  // Just show the best platform
  return token.platform;
}
