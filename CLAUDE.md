# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MWI Profit Panel is a Tampermonkey userscript for the browser game MilkyWayIdle. It adds a profit calculation panel to the game's right sidebar, showing real-time profit analysis based on market data for different in-game actions (gathering, crafting, etc.).

## Build Commands

All commands work cross-platform (Windows/Linux/macOS) using `cross-env`:

```bash
# Development - watch mode with hot reload server
npm run dev

# Production build
npm run build

# Watch mode only (no server)
npm run watch

# Serve dist folder (for testing the userscript)
npm run serve

# Preview (with caching enabled)
npm run preview
```

The dev server runs on `http://localhost:8088`. Install the dev userscript from `dist/MWI-Profit-Panel-Dev.user.js` for testing.

## Architecture

### WebSocket Hook (`src/index.js`)
The script hooks into `MessageEvent.prototype.data` to intercept WebSocket messages from the game server (`api.milkywayidle.com/ws`). Key message types handled:
- `init_character_data` - Character skills, buffs, house rooms, equipment
- `init_client_data` - Game items, actions, drop tables
- `market_item_order_books_updated` - Real-time market price updates
- `loot_log_updated` - Combat/gathering loot tracking
- Various `*_buffs_updated` events

### Global State (`src/globals.js`)
Uses a Proxy-based state manager (`GlobalState`) that:
- Stores game data, market data, and user settings
- Provides subscription pattern for data changes
- Persists settings via `GM_setValue`/`GM_getValue`

### Market Data Layer (`src/marketService.js`)
Multi-source market data aggregation:
- `UnifyMarketData` - Main market data manager
- `MWIApiMarketJson` - Fetches from official API or Mooket API with caching
- `MooketMarketRealtime` - Listens to real-time price updates from mooket plugin
- `MedianMarketCache` - Historical price snapshots for comparison

Data sources: `Official` (game API), `MooketApi` (mooket endpoint), `Mooket` (realtime WS), `User` (in-game market browsing).

### Buff System (`src/buffs.js`)
`BuffsProvider` manages four buff sources:
- Community buffs (server-wide)
- Tea buffs (consumable items)
- House buffs (player housing)
- Equipment buffs (worn items)

Buff types: efficiency, gathering, rare_find, essence_find, artisan, action_speed, processing.

### Profit Calculation (`src/profitCalculation.js`)
Calculates per-hour profit for actions considering:
- Input material costs (with tea artisan buff reducing materials)
- Output item values (including rare/essence drops)
- Action speed (base time + equipment speed buff)
- Level efficiency bonus (level - required_level)
- Drink costs per hour
- 2% market tax deduction

Trading modes: ask (high), bid (low) for both materials and products.

### UI Components
- `panelManager.js` - Injects profit panel into game's tab system, handles tab switching
- `domGenerator.js` - Generates HTML for profit items grid
- `tooltipManager.js` - Detailed hover tooltips with price breakdowns
- `settingsPanel.js` - Bootstrap modal for user settings

### Utilities (`src/utils.js`)
Key functions:
- `getItemValuation()` - Gets bid/ask prices, handles openable items (bags/containers)
- `getDropTableInfomation()` - Calculates expected value from drop tables
- `getMwiObj()` - Accesses the game's global `mwi` object
- `ZHitemNames/ZHActionNames` - Chinese translations from `zhTranslation.js`

## Data Flow

1. Userscript loads, hooks WebSocket
2. Game sends `init_client_data` and `init_character_data` 
3. `preFetchData()` initializes market data from APIs
4. Market data updates trigger `refreshProfitPanel()`
5. User clicks action item → `getMwiObj().game.handleGoToAction()` navigates

## File Structure

```
src/
  index.js            # Entry point, WS hook, message routing
  globals.js          # Proxy state manager
  marketService.js    # Market data fetching & caching
  buffs.js            # Buff calculation
  profitCalculation.js # Core profit math
  panelManager.js     # UI injection & tab management
  domGenerator.js     # HTML generation
  tooltipManager.js   # Hover tooltips
  settingsPanel.js    # Settings modal
  utils.js            # Helper functions
  zhTranslation.js    # Chinese i18n
  LostTrackerExpectEstimate.js # Loot log analysis
data/                 # Static game data snapshots
```

## Important Notes

- The script depends on Bootstrap 5 (injected via `@require`)
- Uses `GM_xmlhttpRequest` for cross-origin API calls
- Market data is cached in `localStorage` with configurable TTL
- The game uses HRIDs (hierarchical resource IDs) like `/items/coin`, `/action_types/milking`
- Supports both English and Chinese game clients (detects via `i18nextLng`)
- Optional integration with mooket plugin for real-time prices and action navigation