import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain JS module shared with the Chrome extension (no type defs)
import { PERA1_BASE, toPera1Url } from "../../extension/pera1-url.js";

const B = `${PERA1_BASE}/github.com`;

describe("toPera1Url (Chrome extension)", () => {
  it("converts a repository root URL", () => {
    expect(toPera1Url("https://github.com/kazuph/github-pera1-workers")).toBe(
      `${B}/kazuph/github-pera1-workers`
    );
  });

  it("accepts the www host", () => {
    expect(toPera1Url("https://www.github.com/owner/repo")).toBe(`${B}/owner/repo`);
  });

  it("passes /tree/ (branch + directory) URLs through", () => {
    expect(toPera1Url("https://github.com/owner/repo/tree/develop/src/components")).toBe(
      `${B}/owner/repo/tree/develop/src/components`
    );
  });

  it("passes /blob/ (single file) URLs through", () => {
    expect(toPera1Url("https://github.com/owner/repo/blob/main/src/index.ts")).toBe(
      `${B}/owner/repo/blob/main/src/index.ts`
    );
  });

  it("drops query strings and line-number hashes", () => {
    expect(
      toPera1Url("https://github.com/owner/repo/blob/main/src/index.ts?plain=1#L10-L20")
    ).toBe(`${B}/owner/repo/blob/main/src/index.ts`);
    expect(toPera1Url("https://github.com/owner/repo?tab=readme-ov-file")).toBe(
      `${B}/owner/repo`
    );
  });

  it("treats /raw/ as /blob/", () => {
    expect(toPera1Url("https://github.com/owner/repo/raw/main/README.md")).toBe(
      `${B}/owner/repo/blob/main/README.md`
    );
  });

  it("falls back to the repository root on non-code pages (issues, PRs, ...)", () => {
    for (const section of [
      "issues",
      "pulls",
      "pull/123",
      "actions",
      "releases",
      "commits/main",
      "wiki",
    ]) {
      expect(toPera1Url(`https://github.com/owner/repo/${section}`), section).toBe(
        `${B}/owner/repo`
      );
    }
  });

  it("returns null for non-GitHub URLs", () => {
    expect(toPera1Url("https://example.com/owner/repo")).toBeNull();
    expect(toPera1Url("https://gist.github.com/owner/abc123")).toBeNull();
    expect(toPera1Url("chrome://extensions/")).toBeNull();
    expect(toPera1Url("not a url")).toBeNull();
    expect(toPera1Url("")).toBeNull();
  });

  it("returns null for GitHub pages without an identifiable repository", () => {
    expect(toPera1Url("https://github.com/")).toBeNull();
    expect(toPera1Url("https://github.com/kazuph")).toBeNull();
    expect(toPera1Url("https://github.com/settings/profile")).toBeNull();
    expect(toPera1Url("https://github.com/notifications/beta")).toBeNull();
    expect(toPera1Url("https://github.com/orgs/anthropics/repositories")).toBeNull();
    expect(toPera1Url("https://github.com/search?q=hono")).toBeNull();
  });
});
