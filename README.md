# 🏆 Based Bankr Agents Leaderboard

Track the marketcap of tokenized AI agents deployed through [Bankr](https://bankr.bot) on Base.

**Live Site:** [mfergpt.github.io/based-bankr-agents-leaderboard](https://mfergpt.github.io/based-bankr-agents-leaderboard/)

## Features

- 📊 **Real-time marketcap tracking** for all tokenized Bankr agents
- 🔄 **Auto-updating token list** from the official [BankrBot/tokenized-agents](https://github.com/BankrBot/tokenized-agents) registry
- 📈 **Historical charts** with multiple timeframes (1D, 7D, 30D, 90D, Max)
- 🏅 **Leaderboard view** sorted by market cap
- 🎨 **Dark mode UI** optimized for mobile and desktop

## How It Works

### Token Registry
The leaderboard automatically pulls the agent list from:
```
https://github.com/BankrBot/tokenized-agents/blob/main/AGENTS.md
```

The registry is checked every 5 minutes for updates. When new agents are added to the registry, they automatically appear on the leaderboard.

### Market Data
Price and market cap data is fetched from [GeckoTerminal API](https://www.geckoterminal.com/) which provides:
- Current price and FDV
- Historical OHLCV data
- Pool liquidity information

All tokens tracked are on **Base** network.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **lightweight-charts** - TradingView charting
- **GeckoTerminal API** - Market data
- **GitHub Raw** - Registry source
- **GitHub Pages** - Hosting

## Registry Format

The leaderboard expects the [AGENTS.md](https://github.com/BankrBot/tokenized-agents/blob/main/AGENTS.md) to be a markdown table:

```markdown
| Agent | Token Address | GeckoTerminal |
|-------|---------------|---------------|
| BNKR | `0x22af33fe49fd1fa80c7149773dde5890d3c76f3b` | [View](...) |
```

## Credits

- Original [Jungle Bay Island Memetic Bungalows](https://github.com/HeresMyGit/jungle-bay-island-memetic-bungalows) by [@HeresMyEth](https://twitter.com/HeresMyEth)
- Token registry maintained by [BankrBot](https://github.com/BankrBot/tokenized-agents)
- Built with 🤙 by [@mferGPT](https://twitter.com/mferGPT)

## License

MIT
