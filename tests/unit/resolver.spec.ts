import { describe, it, expect } from "vitest";
import { resolveRequest } from "../../src/resolver";

function params(obj: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams(obj);
}

describe("resolveRequest", () => {
  // Test 15: Basic URL parsing
  describe("Basic URL parsing", () => {
    it("parses github.com/owner/repo", () => {
      const result = resolveRequest("github.com/owner/repo", params());
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
      expect(result.branch).toBe("main");
      expect(result.targetDirs).toEqual([]);
      expect(result.targetExts).toEqual([]);
      expect(result.targetFile).toBeUndefined();
      expect(result.isTreeMode).toBe(false);
      expect(result.originalUrl).toBe("https://github.com/owner/repo");
    });

    it("handles https:// prefix", () => {
      const result = resolveRequest("https://github.com/owner/repo", params());
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
    });
  });

  // Test 16: tree/blob URL parsing
  describe("tree/blob URL parsing", () => {
    it("parses /tree/branch URL", () => {
      const result = resolveRequest(
        "github.com/owner/repo/tree/develop",
        params(),
      );
      expect(result.branch).toBe("develop");
      expect(result.targetDirs).toEqual([]);
    });

    it("parses /tree/branch/path URL", () => {
      const result = resolveRequest(
        "github.com/owner/repo/tree/main/src/lib",
        params(),
      );
      expect(result.branch).toBe("main");
      expect(result.targetDirs).toEqual(["src/lib/"]);
    });

    it("parses /blob/branch/file URL", () => {
      const result = resolveRequest(
        "github.com/owner/repo/blob/main/src/index.ts",
        params(),
      );
      expect(result.branch).toBe("main");
      expect(result.targetFile).toBe("src/index.ts");
    });
  });

  // Test 17: query params (dir, ext, file, mode, branch)
  describe("query parameters", () => {
    it("handles dir param", () => {
      const result = resolveRequest(
        "github.com/owner/repo",
        params({ dir: "src" }),
      );
      expect(result.targetDirs).toEqual(["src/"]);
    });

    it("handles multiple dirs", () => {
      const result = resolveRequest(
        "github.com/owner/repo",
        params({ dir: "src,lib" }),
      );
      expect(result.targetDirs).toEqual(["src/", "lib/"]);
    });

    it("handles ext param", () => {
      const result = resolveRequest(
        "github.com/owner/repo",
        params({ ext: "ts,tsx" }),
      );
      expect(result.targetExts).toEqual(["ts", "tsx"]);
    });

    it("handles file param", () => {
      const result = resolveRequest(
        "github.com/owner/repo",
        params({ file: "README.md" }),
      );
      expect(result.targetFile).toBe("README.md");
    });

    it("handles mode=tree", () => {
      const result = resolveRequest(
        "github.com/owner/repo",
        params({ mode: "tree" }),
      );
      expect(result.isTreeMode).toBe(true);
    });

    it("handles branch param (overrides URL path branch)", () => {
      const result = resolveRequest(
        "github.com/owner/repo/tree/develop",
        params({ branch: "feature" }),
      );
      expect(result.branch).toBe("feature");
    });
  });

  // Test 18: SSH URL normalization
  describe("SSH URL normalization", () => {
    it("normalizes git@github.com:owner/repo.git", () => {
      const result = resolveRequest(
        "git@github.com:owner/repo.git",
        params(),
      );
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
      expect(result.originalUrl).toBe("https://github.com/owner/repo");
    });

    it("normalizes ssh://git@github.com/owner/repo.git", () => {
      const result = resolveRequest(
        "ssh://git@github.com/owner/repo.git",
        params(),
      );
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
    });

    it("normalizes git://github.com/owner/repo.git", () => {
      const result = resolveRequest(
        "git://github.com/owner/repo.git",
        params(),
      );
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
    });
  });

  // Test 19: .git suffix removal
  describe(".git suffix removal", () => {
    it("strips .git from https URL", () => {
      const result = resolveRequest(
        "https://github.com/owner/repo.git",
        params(),
      );
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
      expect(result.originalUrl).toBe("https://github.com/owner/repo");
    });

    it("strips .git from bare domain URL", () => {
      const result = resolveRequest("github.com/owner/repo.git", params());
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
    });
  });

  // Test 20: Invalid URL → error
  describe("invalid URLs", () => {
    it("throws on empty path", () => {
      expect(() => resolveRequest("", params())).toThrow(
        "No repository URL provided",
      );
    });

    it("throws on owner-only URL (no repo)", () => {
      expect(() => resolveRequest("github.com/owner", params())).toThrow(
        "Invalid GitHub repository URL format",
      );
    });

    it("throws on non-URL gibberish", () => {
      expect(() =>
        resolveRequest("not a url at all", params()),
      ).toThrow();
    });
  });
});
