import type { ResolvedRequest } from "./types";

/**
 * Normalize various repository input formats into an HTTPS URL path.
 *
 * Supported formats:
 * - git@github.com:owner/repo.git  (SCP-style SSH)
 * - ssh://git@github.com/owner/repo.git
 * - git://github.com/owner/repo.git
 * - https://github.com/owner/repo.git
 * - github.com/owner/repo
 */
function normalizeRepositoryInput(raw: string): string {
  // SCP-style: git@github.com:owner/repo.git
  const scpMatch = raw.match(
    /^(?:ssh:\/\/)?git@([^:/]+)[:/](.+?)(?:\.git)?$/,
  );
  if (scpMatch) {
    return `https://${scpMatch[1]}/${scpMatch[2]}`;
  }

  // git:// protocol
  const gitProtoMatch = raw.match(/^git:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (gitProtoMatch) {
    return `https://${gitProtoMatch[1]}/${gitProtoMatch[2]}`;
  }

  // Strip trailing .git from any remaining format
  const stripped = raw.replace(/\.git$/, "");
  return stripped.startsWith("http") ? stripped : `https://${stripped}`;
}

/**
 * Resolve a request's URL path and query parameters into structured parameters
 * for GitHub repository processing.
 */
export function resolveRequest(
  path: string,
  searchParams: URLSearchParams,
): ResolvedRequest {
  if (!path) {
    throw new Error("No repository URL provided");
  }

  const urlStr = normalizeRepositoryInput(path);

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch (error) {
    throw new Error(
      `Invalid URL: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("Invalid GitHub repository URL format");
  }

  const owner = segments[0];
  const repo = segments[1];

  // Extract branch, dir, file from URL path segments
  let urlBranch: string | undefined;
  let urlDir: string | undefined;
  let urlFilePath: string | undefined;

  if (segments.length > 3 && segments[2] === "tree") {
    const branchAndDirParts = segments.slice(3);
    urlBranch = branchAndDirParts[0];
    if (branchAndDirParts.length > 1) {
      urlDir = branchAndDirParts.slice(1).join("/");
    }
  } else if (segments.length > 3 && segments[2] === "blob") {
    const branchAndFileParts = segments.slice(3);
    urlBranch = branchAndFileParts[0];
    if (branchAndFileParts.length > 1) {
      urlFilePath = branchAndFileParts.slice(1).join("/");
    }
  } else if (
    segments.length > 2 &&
    segments[2] !== "tree" &&
    segments[2] !== "blob"
  ) {
    urlDir = segments.slice(2).join("/");
  }

  // Query parameters
  const queryDirs = searchParams
    .get("dir")
    ?.split(",")
    .map((d) => d.trim())
    .filter((d) => d);
  const queryExts = searchParams
    .get("ext")
    ?.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e);
  const paramBranch = searchParams.get("branch")?.trim();
  const queryFile = searchParams.get("file")?.trim();
  const isTreeMode = searchParams.get("mode") === "tree";

  // Branch priority: query param > URL path > default "main"
  const branch = paramBranch || urlBranch || "main";

  // Directory resolution: combine urlDir + query dirs
  let targetDirs: string[] = [];
  if (queryDirs && queryDirs.length > 0) {
    if (urlDir) {
      const basePath = urlDir.endsWith("/") ? urlDir : urlDir + "/";
      targetDirs = queryDirs.map((d) => {
        const relativePath = d.startsWith("/") ? d.slice(1) : d;
        const combined = basePath + relativePath;
        return combined.endsWith("/") ? combined : combined + "/";
      });
    } else {
      targetDirs = queryDirs.map((d) => (d.endsWith("/") ? d : d + "/"));
    }
  } else if (urlDir) {
    targetDirs = [urlDir.endsWith("/") ? urlDir : urlDir + "/"];
  }

  // Extensions from query only
  const targetExts = queryExts || [];

  // File resolution: query file > URL blob path, combined with urlDir
  let targetFile: string | undefined;
  if (queryFile) {
    if (urlDir) {
      const basePath = urlDir.endsWith("/") ? urlDir : urlDir + "/";
      const relativePath = queryFile.startsWith("/")
        ? queryFile.slice(1)
        : queryFile;
      targetFile = basePath + relativePath;
    } else {
      targetFile = queryFile;
    }
  } else if (urlFilePath) {
    targetFile = urlFilePath;
  }

  return {
    owner,
    repo,
    branch,
    targetDirs,
    targetExts,
    targetFile,
    isTreeMode,
    originalUrl: urlStr,
  };
}
