import { Hono } from "hono";
import { StreamableHTTPTransport } from "@hono/mcp";
import { CACHE_ERROR_MAX_AGE, CACHE_MAX_AGE } from "./constants";
import { handleGitHubRequest } from "./github";
import { createMcpServer } from "./mcp";
import { resolveRequest } from "./resolver";
import { createErrorPage, createLandingPage } from "./ui";

const app = new Hono();

// MCP endpoint
app.all("/mcp", async (c) => {
  const transport = new StreamableHTTPTransport();
  const mcpServer = createMcpServer();
  await mcpServer.connect(transport);
  return transport.handleRequest(c);
});

// Main route: landing page or repository fetch
app.get("/*", async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname.slice(1);
  const protocol = c.req.url.startsWith("https") ? "https" : "http";
  const host = c.req.header("host") || "localhost";

  // Root path → landing page
  if (!path) {
    return c.html(createLandingPage(protocol, host));
  }

  try {
    const resolved = resolveRequest(path, url.searchParams);
    const result = await handleGitHubRequest(resolved);

    return c.text(result, 200, {
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE}`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error: ${msg}`);

    const status = msg.includes("Invalid") ? 400 : msg.includes("not found") ? 404 : 500;
    return c.html(
      createErrorPage(protocol, host, path, msg),
      status as 400 | 404 | 500,
      { "Cache-Control": `public, max-age=${CACHE_ERROR_MAX_AGE}` },
    );
  }
});

export default app;
