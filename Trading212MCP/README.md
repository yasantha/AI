# Trading212 MCP Server (Read-only)

This MCP server exposes Trading212 read-only endpoints as tools that any MCP-capable AI client can call.

## Requirements
- Node.js 18+
- Trading212 API credentials

## Install
```bash
npm install
```

## Auth
Set one of the following:

- `T212_AUTHORIZATION`: full Authorization header value (e.g. `Basic <base64>`)
- OR both `T212_API_KEY` and `T212_API_SECRET`

Optional:
- `T212_BASE_URL` (default `https://live.trading212.com`)

## Run (stdio)
```bash
npm run build
T212_API_KEY=... T212_API_SECRET=... node dist/index.js
```

## Run (HTTP transport)
```bash
npm run build
T212_API_KEY=... T212_API_SECRET=... MCP_TRANSPORT=http MCP_HTTP_PORT=3333 node dist/index.js
```

The HTTP transport uses SSE. Connect to `http://localhost:3333/sse` and send JSON-RPC POSTs to `http://localhost:3333/message?sessionId=...`.

## Tools
- `get_account_summary`
- `get_history_dividends`
- `get_history_exports`
- `get_history_orders`
- `get_history_transactions`
- `get_metadata_exchanges`
- `get_metadata_instruments`
- `get_orders`
- `get_order_by_id`
- `get_pies`
- `get_pie_by_id`
- `get_positions`
