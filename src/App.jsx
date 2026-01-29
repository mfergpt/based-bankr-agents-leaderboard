import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Chart from './components/Chart';
import TokenList from './components/TokenList';
import AddToken from './components/AddToken';
import { getAllTokens } from './data/tokens';
import { fetchBankrAgents, getRegistryUrl, clearAgentsCache } from './api/bankrAgents';
import { fetchAllTokensMarketCap, fetchGeckoTerminalMarketCap, clearCache, daysToApiParam } from './api/geckoterminal';
import { getSavedTokens, saveTokens, mergeTokenPreferences } from './utils/storage';
import { subscribe as subscribeRateLimit, getRateLimitState } from './api/rateLimitState';
import { mergeTokenVariants, getDisplayTokens } from './utils/tokenMerger';

// Auto-refresh interval for checking registry updates (5 minutes)
const REGISTRY_REFRESH_INTERVAL = 5 * 60 * 1000;

export default function App() {
  const [tokens, setTokens] = useState(() => {
    const defaultTokens = getAllTokens();
    const saved = getSavedTokens();
    if (saved) {
      return mergeTokenPreferences(defaultTokens, saved);
    }
    return defaultTokens;
  });

  const [selectedRange, setSelectedRange] = useState(30);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, token: '' });
  const [error, setError] = useState(null);
  const [lastFetchedRange, setLastFetchedRange] = useState(null);
  const [rateLimitState, setRateLimitState] = useState(getRateLimitState());
  const [registryStatus, setRegistryStatus] = useState({ lastUpdate: null, source: 'loading' });

  // Subscribe to rate limit state changes
  useEffect(() => {
    const unsubscribe = subscribeRateLimit(setRateLimitState);
    return unsubscribe;
  }, []);

  // Fetch agents from Bankr registry on mount and periodically
  useEffect(() => {
    async function loadAgentsFromRegistry() {
      try {
        const agents = await fetchBankrAgents();
        const saved = getSavedTokens();
        
        // Merge with saved preferences (enabled state)
        const mergedAgents = saved 
          ? mergeTokenPreferences(agents, saved)
          : agents;
        
        setTokens(mergedAgents);
        setRegistryStatus({
          lastUpdate: new Date().toLocaleTimeString(),
          source: 'github',
          count: agents.length
        });
      } catch (err) {
        console.error('Failed to load agents from registry:', err);
        setRegistryStatus({
          lastUpdate: null,
          source: 'fallback',
          count: tokens.length
        });
      }
    }

    // Initial load
    loadAgentsFromRegistry();

    // Periodic refresh
    const interval = setInterval(loadAgentsFromRegistry, REGISTRY_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge token variants and get display tokens
  const mergedTokens = useMemo(() => mergeTokenVariants(tokens), [tokens]);
  const displayTokens = useMemo(() => getDisplayTokens(mergedTokens), [mergedTokens]);

  // Get tokens for chart - only show enabled tokens
  const chartTokens = useMemo(() => {
    return displayTokens.filter(t => t.enabled);
  }, [displayTokens]);

  // Fetch market cap data for enabled tokens only
  const fetchData = useCallback(async (days, onlyEnabled = true) => {
    setIsLoading(true);
    setError(null);

    try {
      const apiDays = daysToApiParam(days);
      // Only fetch enabled tokens that need data
      const tokensToFetch = tokens.filter(t => {
        const needsData = !t.data || t.data.length === 0 || lastFetchedRange !== days;
        return onlyEnabled ? (t.enabled && needsData) : needsData;
      });

      if (tokensToFetch.length === 0) {
        setIsLoading(false);
        return;
      }

      const results = await fetchAllTokensMarketCap(
        tokensToFetch,
        apiDays,
        (progress) => setLoadingProgress(progress)
      );

      // Merge results with existing tokens
      setTokens(prev => {
        const resultMap = new Map(results.map(r => [r.id, r]));
        return prev.map(token => {
          const result = resultMap.get(token.id);
          if (result && result.data && result.data.length > 0) {
            return { ...token, data: result.data, error: false, currentMarketCap: result.currentMarketCap };
          }
          return token;
        });
      });

      setLastFetchedRange(days);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [tokens, lastFetchedRange]);

  // Fetch data on initial load and when range changes significantly
  useEffect(() => {
    // Only fetch enabled tokens that need data
    const enabledTokensNeedData = tokens.some(t =>
      t.enabled && (!t.data || t.data.length === 0)
    );
    const rangeIncreased = lastFetchedRange !== null && selectedRange > lastFetchedRange;

    if (enabledTokensNeedData || rangeIncreased || lastFetchedRange === null) {
      fetchData(selectedRange);
    }
  }, [selectedRange, tokens.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save token preferences when they change
  useEffect(() => {
    saveTokens(tokens);
  }, [tokens]);

  // Fetch data for a single token on-demand
  const fetchSingleToken = useCallback(async (token) => {
    setIsLoading(true);
    setLoadingProgress({ current: 1, total: 1, token: token.symbol });

    try {
      const apiDays = daysToApiParam(selectedRange);
      const result = await fetchGeckoTerminalMarketCap(token, apiDays);

      if (result && result.data && result.data.length > 0) {
        setTokens(prev =>
          prev.map(t =>
            t.id === token.id
              ? { ...t, data: result.data, error: false, currentMarketCap: result.currentMarketCap }
              : t
          )
        );
      }
    } catch (err) {
      console.error(`Error fetching ${token.symbol}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRange]);

  const handleToggleToken = (tokenId) => {
    // Find the token in displayTokens (might be merged)
    const displayToken = displayTokens.find(t => t.id === tokenId);
    if (!displayToken) return;

    const isEnabling = !displayToken.enabled;

    // Get all variant IDs to toggle together
    const variantIds = displayToken.isMerged && displayToken.variants
      ? displayToken.variants.map(v => v.id)
      : [tokenId];

    setTokens(prev =>
      prev.map(t =>
        variantIds.includes(t.id)
          ? { ...t, enabled: isEnabling }
          : t
      )
    );

    // Fetch data for all variants if enabling
    if (isEnabling) {
      variantIds.forEach(id => {
        const token = tokens.find(t => t.id === id);
        if (token && (!token.data || token.data.length === 0)) {
          fetchSingleToken(token);
        }
      });
    }
  };

  const handleAddToken = (newToken) => {
    setTokens(prev => [...prev, newToken]);
  };

  const handleRemoveToken = (tokenId) => {
    setTokens(prev => prev.filter(t => t.id !== tokenId));
  };

  const handleRefresh = () => {
    clearCache();
    clearAgentsCache();
    setLastFetchedRange(null);
    fetchBankrAgents(true).then(agents => {
      setTokens(agents);
      setRegistryStatus({
        lastUpdate: new Date().toLocaleTimeString(),
        source: 'github',
        count: agents.length
      });
    });
    fetchData(selectedRange);
  };

  const handleRangeChange = (days) => {
    setSelectedRange(days);
    // If new range requires more data, fetch it
    if (days === 'max' || (lastFetchedRange !== 'max' && days > lastFetchedRange)) {
      fetchData(days);
    }
  };

  // Sort tokens by market cap for leaderboard view
  const sortedDisplayTokens = useMemo(() => {
    return [...displayTokens].sort((a, b) => {
      const mcapA = a.currentMarketCap || 0;
      const mcapB = b.currentMarketCap || 0;
      return mcapB - mcapA;
    });
  }, [displayTokens]);

  // Count tokens with data
  const tokensWithData = displayTokens.filter(t => t.data && t.data.length > 0).length;
  const enabledCount = displayTokens.filter(t => t.enabled).length;

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <img src={`${import.meta.env.BASE_URL}bankr-logo.png`} alt="Bankr" className="header-logo" />
          <div className="header-text">
            <h1>Based Bankr Agents</h1>
            <span className="header-subtitle">Leaderboard</span>
          </div>
        </div>
        <div className="header-meta">
          <a 
            href={getRegistryUrl()} 
            target="_blank" 
            rel="noopener noreferrer"
            className="registry-link"
          >
            📋 Registry
          </a>
          <span className="registry-status">
            {registryStatus.source === 'github' ? '🟢' : '🟡'} 
            {registryStatus.count} agents
          </span>
        </div>
      </header>

      <main className="main">
        {/* Rate limit waiting indicator */}
        {rateLimitState.isWaiting && (
          <div className="rate-limit-bar">
            <div className="rate-limit-icon">⏳</div>
            <div className="rate-limit-message">
              {rateLimitState.message}
            </div>
            <div className="rate-limit-countdown">
              {rateLimitState.secondsRemaining}s
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !rateLimitState.isWaiting && (
          <div className="loading-bar">
            <div className="loading-progress">
              Loading {loadingProgress.token}... ({loadingProgress.current}/{loadingProgress.total})
            </div>
            <div
              className="loading-fill"
              style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="error-message">
            {error}
            <button onClick={handleRefresh}>Retry</button>
          </div>
        )}

        {/* Chart with integrated controls */}
        <Chart
          tokens={displayTokens}
          selectedRange={selectedRange}
          onRangeChange={handleRangeChange}
        />

        {/* Status */}
        <div className="data-status">
          {tokensWithData}/{displayTokens.length} agents loaded |
          {enabledCount} displayed |
          <button onClick={handleRefresh} className="refresh-btn">🔄 Refresh</button>
        </div>

        {/* Token list (leaderboard style - sorted by mcap) */}
        <TokenList
          tokens={sortedDisplayTokens}
          onToggle={handleToggleToken}
          onRemove={handleRemoveToken}
        />
      </main>

      <footer className="footer">
        <p>
          Data from GeckoTerminal | Registry from{' '}
          <a href={getRegistryUrl()} target="_blank" rel="noopener noreferrer">
            BankrBot/tokenized-agents
          </a>
          {' '}| All tokens on Base
        </p>
      </footer>

      <AddToken
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddToken}
        existingTokenIds={tokens.map(t => t.id)}
      />
    </div>
  );
}
