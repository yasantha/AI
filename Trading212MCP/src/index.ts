import http from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool
} from "@modelcontextprotocol/sdk/types.js";
import { getConfig } from "./config.js";
import { createTrading212Client } from "./trading212.js";

const config = getConfig();
const client = createTrading212Client(config);

const tools: Tool[] = [
  {
    name: "get_account_summary",
    description: "Fetch account summary",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_history_dividends",
    description: "Fetch dividend history",
    inputSchema: {
      type: "object",
      properties: {
        cursor: { type: "string" },
        ticker: { type: "string" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "get_history_exports",
    description: "Fetch export jobs",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_history_orders",
    description: "Fetch order history",
    inputSchema: {
      type: "object",
      properties: {
        cursor: { type: "string" },
        ticker: { type: "string" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "get_history_transactions",
    description: "Fetch transaction history",
    inputSchema: {
      type: "object",
      properties: {
        cursor: { type: "string" },
        time: { type: "string" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "get_metadata_exchanges",
    description: "Fetch exchanges metadata",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_metadata_instruments",
    description: "Fetch instruments metadata",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_orders",
    description: "Fetch pending orders",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_order_by_id",
    description: "Fetch a pending order by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" }
      }
    }
  },
  {
    name: "get_pies",
    description: "Fetch all pies (deprecated API)",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_pie_by_id",
    description: "Fetch a pie by ID (deprecated API)",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" }
      }
    }
  },
  {
    name: "get_positions",
    description: "Fetch open positions",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string" }
      }
    }
  }
];

function jsonContent(data: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
  };
}

function getStringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

function getNumberArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "number" ? value : undefined;
}

function createServer() {
  const server = new Server(
    {
      name: "trading212",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments ?? {};

    switch (name) {
      case "get_account_summary":
        return jsonContent(await client.get("/api/v0/equity/account/summary"));
      case "get_history_dividends":
        return jsonContent(
          await client.get("/api/v0/equity/history/dividends", {
            cursor: getStringArg(args, "cursor"),
            ticker: getStringArg(args, "ticker"),
            limit: getNumberArg(args, "limit")
          })
        );
      case "get_history_exports":
        return jsonContent(await client.get("/api/v0/equity/history/exports"));
      case "get_history_orders":
        return jsonContent(
          await client.get("/api/v0/equity/history/orders", {
            cursor: getStringArg(args, "cursor"),
            ticker: getStringArg(args, "ticker"),
            limit: getNumberArg(args, "limit")
          })
        );
      case "get_history_transactions":
        return jsonContent(
          await client.get("/api/v0/equity/history/transactions", {
            cursor: getStringArg(args, "cursor"),
            time: getStringArg(args, "time"),
            limit: getNumberArg(args, "limit")
          })
        );
      case "get_metadata_exchanges":
        return jsonContent(await client.get("/api/v0/equity/metadata/exchanges"));
      case "get_metadata_instruments":
        return jsonContent(
          await client.get("/api/v0/equity/metadata/instruments")
        );
      case "get_orders":
        return jsonContent(await client.get("/api/v0/equity/orders"));
      case "get_order_by_id":
        return jsonContent(
          await client.get(
            `/api/v0/equity/orders/${getNumberArg(args, "id") ?? 0}`
          )
        );
      case "get_pies":
        return jsonContent(await client.get("/api/v0/equity/pies"));
      case "get_pie_by_id":
        return jsonContent(
          await client.get(
            `/api/v0/equity/pies/${getNumberArg(args, "id") ?? 0}`
          )
        );
      case "get_positions":
        return jsonContent(
          await client.get("/api/v0/equity/positions", {
            ticker: getStringArg(args, "ticker")
          })
        );
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

async function run() {
  const transport = (process.env.MCP_TRANSPORT ?? "stdio").toLowerCase();

  if (transport === "http") {
    const port = Number(process.env.MCP_HTTP_PORT ?? "3333");
    const transports = new Map<string, SSEServerTransport>();

    const httpServer = http.createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(400).end("Missing URL");
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

      if (req.method === "GET" && url.pathname === "/sse") {
        const transport = new SSEServerTransport("/message", res);
        transports.set(transport.sessionId, transport);
        transport.onclose = () => transports.delete(transport.sessionId);

        const server = createServer();
        await server.connect(transport);
        return;
      }

      if (req.method === "POST" && url.pathname === "/message") {
        const sessionId = url.searchParams.get("sessionId");
        const transport = sessionId ? transports.get(sessionId) : undefined;
        if (!transport) {
          res.writeHead(404).end("Unknown session");
          return;
        }

        await transport.handlePostMessage(req, res);
        return;
      }

      res.writeHead(404).end("Not found");
    });

    httpServer.listen(port, () => {
      console.error(`MCP HTTP server listening on http://localhost:${port}`);
      console.error("SSE endpoint: /sse");
    });

    return;
  }

  const server = createServer();
  await server.connect(new StdioServerTransport());
}

run().catch((err) => {
  console.error("Failed to start MCP server", err);
  process.exit(1);
});
