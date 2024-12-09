import { Hono } from "hono";
import JSZip from "jszip";

const app = new Hono();

app.get("/*", async (c) => {
  try {
    const url = new URL(c.req.url);
    const path = url.pathname.slice(1);

    console.log(`📥 Received request with path: ${path}`);

    if (!path) {
      console.log("❌ No path provided");
      return c.text("No repository URL provided", 400);
    }

    let urlStr = path;
    if (!urlStr.startsWith("http")) {
      urlStr = `https://${urlStr}`;
      console.log(`🔄 Added https prefix: ${urlStr}`);
    }

    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch (error) {
      console.error(
        `❌ URL parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return c.text("Invalid URL string.", 400);
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
      return c.text("Invalid GitHub repository URL", 400);
    }

    const owner = segments[0];
    const repo = segments[1];
    const branch = segments[2] ?? "main";

    console.log(
      `📥 Processing GitHub repo: ${owner}/${repo} (branch: ${branch})`,
    );

    const zipUrl = `https://codeload.github.com/${owner}/${repo}/zip/${branch}`;
    console.log(`📦 Fetching zip from: ${zipUrl}`);

    const zipResp = await fetch(zipUrl, {
      headers: {
        "User-Agent": "Pera1-Bot",
      },
    });

    if (!zipResp.ok) {
      const errorMsg = `Failed to fetch zip: ${zipResp.status} ${zipResp.statusText}`;
      console.error(`❌ ${errorMsg}`);
      return c.text(errorMsg, zipResp.status as 404 | 403 | 500);
    }

    const arrayBuffer = await zipResp.arrayBuffer();
    const jszip = await JSZip.loadAsync(arrayBuffer);
    const rootPrefix = `${repo}-${branch}/`;
    let resultText = "";
    let totalSize = 0;
    const fileTree = new Map<string, { size: number; content: string }>();

    // Check if tsconfig exists to determine if it's a TypeScript project
    const hasTsConfig = Object.keys(jszip.files).some(
      (name) => name.startsWith(rootPrefix) && name.endsWith("tsconfig.json"),
    );

    // File extension filters
    const imageExtensions = new Set([
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".bmp",
      ".ico",
      ".webp",
      ".svg",
    ]);

    const binaryExtensions = new Set([
      // Archives
      ".zip",
      ".tar",
      ".gz",
      ".rar",
      ".7z",
      // Compiled
      ".exe",
      ".dll",
      ".so",
      ".dylib",
      // Documents
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      // Media
      ".mp3",
      ".mp4",
      ".avi",
      ".mov",
      ".wav",
      // Other
      ".bin",
      ".dat",
      ".db",
      ".sqlite",
    ]);

    // Size limits (in bytes)
    const MAX_FILE_SIZE = 500 * 1024; // 500KB

    const isBinaryContent = (content: string): boolean => {
      // Check for null bytes or high concentration of non-printable characters
      const sampleSize = Math.min(content.length, 1000); // Check first 1000 chars
      let nonPrintable = 0;

      for (let i = 0; i < sampleSize; i++) {
        const charCode = content.charCodeAt(i);
        if (
          charCode === 0 ||
          (charCode < 32 && ![9, 10, 13].includes(charCode))
        ) {
          nonPrintable++;
        }
      }

      // If more than 5% are non-printable, consider it binary
      return nonPrintable / sampleSize > 0.05;
    };

    const shouldSkipFile = (
      filename: string,
      size: number,
      content?: string,
    ) => {
      const ext = filename.toLowerCase().split(".").pop();
      if (!ext) return false;

      // Skip lock files
      if (filename.match(/-lock\.|\.lock$/)) {
        console.log(`🚫 Skipping lock file: ${filename}`);
        return true;
      }

      // Skip by extension
      if (imageExtensions.has(`.${ext}`) || binaryExtensions.has(`.${ext}`)) {
        console.log(`🚫 Skipping binary extension: ${filename}`);
        return true;
      }

      // Skip JS files if tsconfig exists
      if (
        hasTsConfig &&
        (filename.endsWith(".js") || filename.endsWith(".mjs"))
      ) {
        console.log(`🚫 Skipping compiled JS: ${filename}`);
        return true;
      }

      // Skip large files
      if (size > MAX_FILE_SIZE) {
        console.log(
          `🚫 Skipping large file (${(size / 1024).toFixed(2)}KB): ${filename}`,
        );
        return true;
      }

      // Skip binary content
      if (content && isBinaryContent(content)) {
        console.log(`🚫 Skipping binary content: ${filename}`);
        return true;
      }

      return false;
    };

    for (const fileObj of Object.values(jszip.files)) {
      if (!fileObj.dir && fileObj.name.startsWith(rootPrefix)) {
        const fileRelative = fileObj.name.slice(rootPrefix.length);
        const content = await fileObj.async("string");
        const size = new TextEncoder().encode(content).length;

        // Skip filtered files
        if (shouldSkipFile(fileRelative, size, content)) {
          continue;
        }

        totalSize += size;
        fileTree.set(fileRelative, { size, content });
      }
    }

    // Add file tree
    resultText += "# 📁 File Tree\n\n";
    for (const [path, { size }] of fileTree) {
      const parts = path.split("/");
      const indent = "  ".repeat(parts.length - 1);
      const fileName = parts[parts.length - 1];
      resultText += `${indent}- ${fileName} (${(size / 1024).toFixed(2)} KB)\n`;
    }

    // Add separator
    resultText += `\n# 📝 Files (Total: ${(totalSize / 1024).toFixed(2)} KB)\n\n`;

    // Add file contents
    for (const [path, { content }] of fileTree) {
      resultText += `\`\`\`${path}\n${content}\n\`\`\`\n\n`;
    }

    return c.text(resultText, 200);
  } catch (e: unknown) {
    console.error(
      `❌ Unexpected error: ${e instanceof Error ? e.message : "Unknown error"}`,
    );
    return c.text("Unknown error", 500);
  }
});

export default app;
