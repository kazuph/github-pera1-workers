/** File entry stored in the in-memory tree after extraction */
export interface FileEntry {
  size: number;
  content: string;
  isTruncated?: boolean;
}

/** Parameters accepted by processGitHubRepository */
export interface GitHubRepositoryParams {
  url: string;
  dir?: string;
  ext?: string;
  branch?: string;
  file?: string;
  mode?: "tree" | "full";
}

/** Parsed information extracted from a GitHub URL */
export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch?: string;
  dir?: string;
  filePath?: string;
}

/** Result of resolving a request's URL path + query parameters */
export interface ResolvedRequest {
  owner: string;
  repo: string;
  branch: string;
  targetDirs: string[];
  targetExts: string[];
  targetFile?: string;
  isTreeMode: boolean;
  originalUrl: string;
}
