import type { FileEntry } from "./types";

/** Build an indented tree display string from a file map */
export function createTreeDisplay(
  fileTree: Map<string, FileEntry>,
  showSize = false,
): string {
  const dirs = new Set<string>();

  for (const [path] of fileTree) {
    const parts = path.split("/");
    for (let i = 1; i <= parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }

  const sortedDirs = Array.from(dirs).sort();
  const dirsArray = sortedDirs; // already an array, avoid re-conversion
  let result = "";

  for (const dir of sortedDirs) {
    const depth = dir.split("/").length - 1;
    const indent = "  ".repeat(depth);
    const name = dir.split("/").pop() || "";
    const isFile = !dirsArray.some((d) => d.startsWith(dir + "/"));

    if (showSize && isFile) {
      const fileInfo = fileTree.get(dir);
      if (fileInfo) {
        const sizeKB = (fileInfo.size / 1024).toFixed(2);
        result += fileInfo.isTruncated
          ? `${indent}📄 ${name} (${sizeKB} KB→30KB truncated)\n`
          : `${indent}📄 ${name} (${sizeKB} KB)\n`;
      } else {
        result += `${indent}📄 ${name} (0.00 KB)\n`;
      }
    } else {
      result += `${indent}${isFile ? "📄" : "📂"} ${name}\n`;
    }
  }

  return result;
}
