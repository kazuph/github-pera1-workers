import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { APP_VERSION } from "./constants";
import { processGitHubRepository } from "./github";

// SDKはProtocolインスタンスごとに1つのtransportしか許可しないため、
// リクエスト毎に新しいサーバーを生成する（warm isolateで2回目以降の
// リクエストが "Already connected to a transport" で500になる既存バグの修正）
export function createMcpServer(): McpServer {
  const mcpServer = new McpServer({
    name: "github-pera1-mcp-server",
    version: APP_VERSION,
  });

  mcpServer.registerTool(
    "fetch_github_code",
    {
      title: "GitHub Code Fetcher",
      description: "Fetch code from GitHub repositories with flexible filtering options",
      inputSchema: {
        url: z.string().describe("GitHub repository URL (e.g., https://github.com/owner/repo)"),
        dir: z.string().optional().describe("Filter by directory path (comma-separated)"),
        ext: z.string().optional().describe("Filter by file extensions (comma-separated)"),
        branch: z.string().optional().describe("Git branch name"),
        file: z.string().optional().describe("Specific file path to fetch"),
        mode: z.enum(["tree", "full"]).optional().describe("Display mode: tree (structure only) or full"),
      },
    },
    async (args) => {
      if (!args?.url || typeof args.url !== "string" || args.url.trim() === "") {
        throw new Error("URL parameter is required. Provide a GitHub repository URL.");
      }

      const result = await processGitHubRepository({
        url: args.url,
        dir: args.dir,
        ext: args.ext,
        branch: args.branch,
        file: args.file,
        mode: args.mode,
      });

      return { content: [{ type: "text" as const, text: result }] };
    },
  );

  return mcpServer;
}
