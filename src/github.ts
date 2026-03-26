import JSZip from "jszip";
import { DEFAULT_BRANCHES, MAX_DISPLAY_FILE_SIZE } from "./constants";
import { shouldIncludeFile, shouldSkipFile } from "./filters";
import { createTreeDisplay } from "./tree";
import type {
  FileEntry,
  GitHubRepositoryParams,
  ResolvedRequest,
} from "./types";

/** Fetch a GitHub repository ZIP archive */
export async function fetchZip(
  owner: string,
  repo: string,
  branch: string,
): Promise<Response> {
  const zipUrl = `https://codeload.github.com/${owner}/${repo}/zip/${branch}`;
  console.log(`Fetching zip from: ${zipUrl}`);
  return await fetch(zipUrl, {
    headers: { "User-Agent": "Pera1-Bot/2.0" },
  });
}

/** Fetch ZIP with automatic branch fallback */
export async function fetchZipWithFallback(
  owner: string,
  repo: string,
  branch: string,
): Promise<{ response: Response; branch: string }> {
  const zipResp = await fetchZip(owner, repo, branch);

  if (zipResp.ok) {
    return { response: zipResp, branch };
  }

  for (const defaultBranch of DEFAULT_BRANCHES) {
    if (branch === defaultBranch) continue;
    console.log(
      `Branch "${branch}" failed (${zipResp.status}). Trying "${defaultBranch}"...`,
    );

    const tempResp = await fetchZip(owner, repo, defaultBranch);
    if (tempResp.ok) {
      console.log(`Switched to branch "${defaultBranch}"`);
      return { response: tempResp, branch: defaultBranch };
    }
  }

  throw new Error(
    `Failed to fetch repository. Tried branches: ${[branch, ...DEFAULT_BRANCHES].filter((v, i, a) => a.indexOf(v) === i).join(", ")}. Status: ${zipResp.status} ${zipResp.statusText}`,
  );
}

/** Extract files from ZIP and build formatted output */
async function extractAndFormat(
  owner: string,
  repo: string,
  branch: string,
  targetDirs: string[],
  targetExts: string[],
  targetFile: string | undefined,
  isTreeMode: boolean,
): Promise<string> {
  const { response: zipResp, branch: resolvedBranch } =
    await fetchZipWithFallback(owner, repo, branch);
  const finalBranch = resolvedBranch;

  const arrayBuffer = await zipResp.arrayBuffer();
  const jszip = await JSZip.loadAsync(arrayBuffer);
  const rootPrefix = `${repo}-${finalBranch}/`;

  const hasTsConfig = Object.keys(jszip.files).some(
    (name) => name.startsWith(rootPrefix) && name.endsWith("tsconfig.json"),
  );

  const fileTree = new Map<string, FileEntry>();
  let originalTotalSize = 0;
  let displayTotalSize = 0;

  for (const fileObj of Object.values(jszip.files)) {
    if (fileObj.dir || !fileObj.name.startsWith(rootPrefix)) continue;

    const fileRelative = fileObj.name.slice(rootPrefix.length);

    if (targetFile) {
      if (fileRelative !== targetFile) continue;
    } else {
      if (!shouldIncludeFile(fileRelative, targetDirs, targetExts)) continue;
    }

    const isReadmeFile = /readme\.md$/i.test(fileRelative);

    if (isTreeMode && !isReadmeFile) {
      fileTree.set(fileRelative, { size: 0, content: "" });
    } else {
      const content = await fileObj.async("string");
      const size = new TextEncoder().encode(content).length;

      if (shouldSkipFile(fileRelative, size, content, hasTsConfig)) continue;

      let isTruncated = false;
      let processedContent = content;
      let displaySize = size;

      if (size > MAX_DISPLAY_FILE_SIZE) {
        processedContent = content.substring(0, MAX_DISPLAY_FILE_SIZE);
        const remainingSize = (size - MAX_DISPLAY_FILE_SIZE) / 1024;
        processedContent += `\n\n[Truncated at 30KB. ${remainingSize.toFixed(1)}KB remaining.]`;
        isTruncated = true;
        displaySize = MAX_DISPLAY_FILE_SIZE;
      }

      originalTotalSize += size;
      displayTotalSize += displaySize;
      fileTree.set(fileRelative, {
        size,
        content: processedContent,
        isTruncated,
      });
    }
  }

  if (targetFile) {
    const fileEntry = fileTree.get(targetFile);
    if (!fileEntry) throw new Error(`File not found: ${targetFile}`);
    return fileEntry.content;
  }

  if (isTreeMode) {
    let resultText = "# Directory Structure\n\n";
    resultText += createTreeDisplay(fileTree, false);

    const readmeFiles = Array.from(fileTree.entries()).filter(
      ([path, { content }]) => /readme\.md$/i.test(path) && content,
    );

    if (readmeFiles.length > 0) {
      resultText += "\n# README Files\n\n";
      for (const [path, { content }] of readmeFiles) {
        resultText += `## ${path}\n\n${content}\n\n`;
      }
    }
    return resultText;
  }

  let resultText = "# File Tree\n\n";
  resultText += createTreeDisplay(fileTree, true);
  resultText += `\n# Files (Total: ${(originalTotalSize / 1024).toFixed(2)} KB → ${(displayTotalSize / 1024).toFixed(2)} KB)\n\n`;

  for (const [path, { content }] of fileTree) {
    resultText += `\`\`\`${path}\n${content}\n\`\`\`\n\n`;
  }

  return resultText;
}

/** Handle a resolved HTTP request (used by index.ts route handler) */
export async function handleGitHubRequest(
  resolved: ResolvedRequest,
): Promise<string> {
  return extractAndFormat(
    resolved.owner,
    resolved.repo,
    resolved.branch,
    resolved.targetDirs,
    resolved.targetExts,
    resolved.targetFile,
    resolved.isTreeMode,
  );
}

/** Process a GitHub repository from MCP-style params (used by mcp.ts) */
export async function processGitHubRepository(
  params: GitHubRepositoryParams,
): Promise<string> {
  const { url, dir, ext, branch, file, mode } = params;

  const queryDirs = dir
    ?.split(",")
    .map((d) => d.trim())
    .filter((d) => d);
  const queryExts = ext
    ?.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e);

  const finalTargetDirs =
    queryDirs && queryDirs.length > 0
      ? queryDirs.map((d) => (d.endsWith("/") ? d : d + "/"))
      : [];

  // Parse owner/repo from URL
  const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("Invalid GitHub repository URL format");
  }

  return extractAndFormat(
    segments[0],
    segments[1],
    branch || "main",
    finalTargetDirs,
    queryExts || [],
    file,
    mode === "tree",
  );
}
