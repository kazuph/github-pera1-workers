import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../../src/index";
import {
  buildTestZip,
  SAMPLE_FILES,
} from "../helpers/build-zip";

// ---------------------------------------------------------------------------
// Network-boundary interception: replace globalThis.fetch to prevent real
// GitHub API calls. This is NOT an internal mock — it intercepts at the
// system boundary (outbound HTTP) and returns realistic ZIP responses.
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;
let fetchInterceptor: (url: string | URL | Request, init?: RequestInit) => Promise<Response> | null;

function installFetchInterceptor(
  handler: (url: string, init?: RequestInit) => Promise<Response> | null,
) {
  fetchInterceptor = handler;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const result = handler(urlStr, init);
    if (result) return result;
    return originalFetch(input, init as any);
  }) as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

// Default: return a valid ZIP for any codeload.github.com request
async function defaultZipHandler(url: string): Promise<Response> | null {
  if (!url.includes("codeload.github.com")) return null;

  // Parse: https://codeload.github.com/{owner}/{repo}/zip/{branch}
  const match = url.match(/codeload\.github\.com\/([^/]+)\/([^/]+)\/zip\/(.+)/);
  if (!match) return null;

  const [, , repo, branch] = match;
  const buf = await buildTestZip(repo, branch, SAMPLE_FILES);
  return new Response(buf, {
    status: 200,
    headers: { "Content-Type": "application/zip" },
  });
}

// Helper to make requests to the app
function request(path: string, method = "GET"): Promise<Response> {
  return app.fetch(new Request(`http://localhost${path}`, { method }));
}

// ====================================================================
// Test Suite
// ====================================================================

describe("HTTP Integration Tests", () => {
  beforeAll(() => {
    installFetchInterceptor(defaultZipHandler);
  });

  afterAll(() => {
    restoreFetch();
  });

  // ------------------------------------------------------------------
  // Test 1: Basic — GET /github.com/owner/repo
  // ------------------------------------------------------------------
  it("Test 1: Basic URL returns 200 with file tree and content", async () => {
    const res = await request("/github.com/owner/repo");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");

    const body = await res.text();
    // Should contain file tree
    expect(body).toContain("File Tree");
    // Should contain file contents from SAMPLE_FILES
    expect(body).toContain("README.md");
    expect(body).toContain("src/index.ts");
  });

  // ------------------------------------------------------------------
  // Test 2: Branch — GET /github.com/owner/repo/tree/dev
  // ------------------------------------------------------------------
  it("Test 2: Branch URL fetches correct branch", async () => {
    let fetchedBranch = "";
    installFetchInterceptor(async (url) => {
      if (!url.includes("codeload.github.com")) return null;
      const match = url.match(/\/zip\/(.+)/);
      if (match) fetchedBranch = match[1];
      return defaultZipHandler(url);
    });

    const res = await request("/github.com/owner/repo/tree/dev");
    expect(res.status).toBe(200);
    expect(fetchedBranch).toBe("dev");

    // Restore default handler
    installFetchInterceptor(defaultZipHandler);
  });

  // ------------------------------------------------------------------
  // Test 3: Filter (dir+ext) — GET /github.com/owner/repo?dir=src&ext=ts
  // ------------------------------------------------------------------
  it("Test 3: Filter by dir and ext returns filtered results", async () => {
    const res = await request("/github.com/owner/repo?dir=src&ext=ts");
    expect(res.status).toBe(200);

    const body = await res.text();
    // Should contain TS files from src/
    expect(body).toContain("src/index.ts");
    // Should NOT contain non-ts files or files outside src/
    expect(body).not.toContain("package.json");
  });

  // ------------------------------------------------------------------
  // Test 4: File — GET /github.com/owner/repo?file=README.md
  // ------------------------------------------------------------------
  it("Test 4: Single file request returns file content", async () => {
    const res = await request("/github.com/owner/repo?file=README.md");
    expect(res.status).toBe(200);

    const body = await res.text();
    expect(body).toContain("# Test Repo");
    // Should NOT contain tree structure
    expect(body).not.toContain("File Tree");
  });

  // ------------------------------------------------------------------
  // Test 5: Tree mode — GET /github.com/owner/repo?mode=tree
  // ------------------------------------------------------------------
  it("Test 5: Tree mode returns directory structure only", async () => {
    const res = await request("/github.com/owner/repo?mode=tree");
    expect(res.status).toBe(200);

    const body = await res.text();
    expect(body).toContain("Directory Structure");
    // README content should still be included in tree mode
    expect(body).toContain("README");
  });

  // ------------------------------------------------------------------
  // Test 6: MCP — POST /mcp
  // ------------------------------------------------------------------
  it("Test 6: MCP endpoint responds to POST", async () => {
    const res = await request("/mcp", "POST");
    // MCP endpoint should respond (not 404). It may return 400/200 depending
    // on whether a valid MCP payload was sent.
    expect(res.status).not.toBe(404);
  });

  // ------------------------------------------------------------------
  // Test 7: SSH URL — GET /git@github.com:owner/repo.git
  // ------------------------------------------------------------------
  it("Test 7: SSH URL is parsed correctly", async () => {
    const res = await request("/git@github.com:owner/repo.git");
    expect(res.status).toBe(200);

    const body = await res.text();
    expect(body).toContain("File Tree");
  });

  // ------------------------------------------------------------------
  // Test 8: Landing page — GET /
  // ------------------------------------------------------------------
  it("Test 8: Root path returns landing page HTML", async () => {
    const res = await request("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");

    const body = await res.text();
    expect(body).toContain("<!DOCTYPE html>");
  });

  // ------------------------------------------------------------------
  // Test 9: Branch fallback
  // ------------------------------------------------------------------
  it("Test 9: Falls back to main/master when requested branch fails", async () => {
    const attemptedBranches: string[] = [];
    installFetchInterceptor(async (url) => {
      if (!url.includes("codeload.github.com")) return null;
      const match = url.match(/\/zip\/(.+)/);
      if (match) attemptedBranches.push(match[1]);

      // Fail the first branch (nonexistent), succeed on "main"
      if (url.includes("/zip/nonexistent")) {
        return new Response("Not Found", { status: 404 });
      }
      return defaultZipHandler(url);
    });

    const res = await request("/github.com/owner/repo?branch=nonexistent");
    expect(res.status).toBe(200);
    expect(attemptedBranches).toContain("nonexistent");
    expect(attemptedBranches).toContain("main");

    installFetchInterceptor(defaultZipHandler);
  });

  // ------------------------------------------------------------------
  // Test 10: Invalid URL — GET /not-a-valid-url
  // ------------------------------------------------------------------
  it("Test 10: Invalid URL returns 400 error", async () => {
    const res = await request("/not-a-valid-url");
    expect(res.status).toBe(400);

    const body = await res.text();
    expect(body).toContain("Invalid");
  });

  // ------------------------------------------------------------------
  // Test 11: Owner only — GET /github.com/owner
  // ------------------------------------------------------------------
  it("Test 11: Owner-only URL returns 400", async () => {
    const res = await request("/github.com/owner");
    expect(res.status).toBe(400);

    const body = await res.text();
    expect(body).toContain("Invalid GitHub repository URL");
  });

  // ------------------------------------------------------------------
  // Test 12: File not found — GET /github.com/owner/repo?file=nonexistent.txt
  // ------------------------------------------------------------------
  it("Test 12: Requesting nonexistent file returns 404", async () => {
    const res = await request("/github.com/owner/repo?file=nonexistent.txt");
    expect(res.status).toBe(404);
  });

  // ------------------------------------------------------------------
  // Test 13: ZIP fetch failure (all branches) → 500
  // ------------------------------------------------------------------
  it("Test 13: ZIP fetch failure on all branches returns 500", async () => {
    installFetchInterceptor(async (url) => {
      if (!url.includes("codeload.github.com")) return null;
      return new Response("Not Found", { status: 404 });
    });

    const res = await request("/github.com/owner/repo");
    expect(res.status).toBe(500);

    installFetchInterceptor(defaultZipHandler);
  });

  // ------------------------------------------------------------------
  // Test 14: Empty repository (ZIP with 0 files)
  // ------------------------------------------------------------------
  it("Test 14: Empty repository returns 200 with empty tree", async () => {
    installFetchInterceptor(async (url) => {
      if (!url.includes("codeload.github.com")) return null;
      const match = url.match(/codeload\.github\.com\/[^/]+\/([^/]+)\/zip\/(.+)/);
      if (!match) return null;
      // Build ZIP with no files
      const buf = await buildTestZip(match[1], match[2], {});
      return new Response(buf, {
        status: 200,
        headers: { "Content-Type": "application/zip" },
      });
    });

    const res = await request("/github.com/owner/repo");
    expect(res.status).toBe(200);

    const body = await res.text();
    expect(body).toContain("File Tree");

    installFetchInterceptor(defaultZipHandler);
  });
});
