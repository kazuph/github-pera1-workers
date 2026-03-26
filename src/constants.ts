/** Maximum file size to display (files larger than this are truncated) */
export const MAX_DISPLAY_FILE_SIZE = 30 * 1024; // 30KB

/** Files larger than this are skipped entirely */
export const MAX_FILE_SIZE = 500 * 1024; // 500KB

/** Ratio of non-printable characters that triggers binary detection */
export const BINARY_THRESHOLD = 0.05;

/** Number of characters sampled for binary detection */
export const BINARY_SAMPLE_SIZE = 1000;

/** Default branches to try when the specified branch fails */
export const DEFAULT_BRANCHES = ["main", "master"] as const;

/** Example repository URL shown on the landing page */
export const EXAMPLE_REPO = "https://github.com/kazuph/github-pera1-workers";

/** App version */
export const APP_VERSION = "2.0.0";

/** Image file extensions to skip */
export const IMAGE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg",
]);

/** Binary file extensions to skip */
export const BINARY_EXTENSIONS = new Set([
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".exe", ".dll", ".so", ".dylib",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".mp3", ".mp4", ".avi", ".mov", ".wav",
  ".bin", ".dat", ".db", ".sqlite",
  ".woff", ".woff2", ".ttf", ".eot",
]);

/** Cache duration for successful responses (10 minutes) */
export const CACHE_MAX_AGE = 600;

/** Cache duration for error responses (1 minute) */
export const CACHE_ERROR_MAX_AGE = 60;
