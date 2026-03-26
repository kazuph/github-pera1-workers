import {
  BINARY_EXTENSIONS,
  BINARY_SAMPLE_SIZE,
  BINARY_THRESHOLD,
  IMAGE_EXTENSIONS,
  MAX_FILE_SIZE,
} from "./constants";

/** Detect binary content by sampling for non-printable characters */
export function isBinaryContent(content: string): boolean {
  const sampleSize = Math.min(content.length, BINARY_SAMPLE_SIZE);
  let nonPrintable = 0;
  for (let i = 0; i < sampleSize; i++) {
    const charCode = content.charCodeAt(i);
    if (charCode === 0 || (charCode < 32 && ![9, 10, 13].includes(charCode))) {
      nonPrintable++;
    }
  }
  return nonPrintable / sampleSize > BINARY_THRESHOLD;
}

/** Determine whether a file should be skipped from output */
export function shouldSkipFile(
  filename: string,
  size: number,
  content: string | undefined,
  hasTsConfig: boolean,
): boolean {
  const ext = "." + (filename.toLowerCase().split(".").pop() || "");

  // Lock files
  if (/-lock\.|\.lock$/.test(filename)) return true;

  // Binary/image extensions
  if (IMAGE_EXTENSIONS.has(ext) || BINARY_EXTENSIONS.has(ext)) return true;

  // TS projects: skip compiled JS/MJS
  if (hasTsConfig && (filename.endsWith(".js") || filename.endsWith(".mjs"))) return true;

  // Size limit
  if (size > MAX_FILE_SIZE) return true;

  // Binary content
  if (content && isBinaryContent(content)) return true;

  return false;
}

/** Determine whether a file matches directory and extension filters */
export function shouldIncludeFile(
  filename: string,
  targetDirs: string[],
  targetExts: string[],
): boolean {
  if (targetDirs.length > 0) {
    const matchesDir = targetDirs.some((dir) => {
      const normalizedDir = dir.endsWith("/") ? dir : `${dir}/`;
      return filename.startsWith(normalizedDir);
    });
    if (!matchesDir) return false;
  }

  if (targetExts.length > 0) {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    if (!targetExts.includes(ext)) return false;
  }

  return true;
}
