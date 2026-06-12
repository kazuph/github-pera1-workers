// GitHubのURLをPera1（1ページ展開ビュー）のURLへ変換するロジック。
// background.js（service worker）とユニットテストの両方から import される。

export const PERA1_BASE = "https://pera1.kazu-san.workers.dev";

// github.com/<owner>/<repo>/<section> のうち、コード閲覧ではない予約セクション。
// これらのページで押された場合はリポジトリルートの展開にフォールバックする。
const NON_CODE_SECTIONS = new Set([
  "issues",
  "pulls",
  "pull",
  "actions",
  "projects",
  "wiki",
  "security",
  "pulse",
  "settings",
  "releases",
  "tags",
  "branches",
  "commits",
  "commit",
  "compare",
  "discussions",
  "milestones",
  "labels",
  "network",
  "graphs",
  "forks",
  "stargazers",
  "watchers",
  "deployments",
  "packages",
  "activity",
]);

// github.com/<first> がユーザー/Org名ではない予約パス。
// この場合はリポジトリを特定できないので変換不可。
const RESERVED_TOP_LEVEL = new Set([
  "orgs",
  "organizations",
  "settings",
  "notifications",
  "marketplace",
  "explore",
  "topics",
  "trending",
  "sponsors",
  "login",
  "logout",
  "signup",
  "features",
  "about",
  "pricing",
  "search",
  "codespaces",
  "collections",
  "events",
  "new",
  "apps",
  "dashboard",
]);

/**
 * GitHubのURLをPera1のURLに変換する。
 * 変換できないURL（GitHub以外・リポジトリを特定できないページ）は null を返す。
 */
export function toPera1Url(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const [owner, repo, section] = segments;
  if (RESERVED_TOP_LEVEL.has(owner)) return null;

  let path;
  if (segments.length === 2) {
    // リポジトリルート
    path = `${owner}/${repo}`;
  } else if (section === "tree" || section === "blob") {
    // ブランチ/ディレクトリ/ファイル指定はPera1がそのまま解釈できる
    path = segments.join("/");
  } else if (section === "raw" && segments.length >= 4) {
    // raw表示はblob相当として扱う
    path = [owner, repo, "blob", ...segments.slice(3)].join("/");
  } else if (NON_CODE_SECTIONS.has(section)) {
    // Issues/PRs等のページからはリポジトリルートの展開にフォールバック
    path = `${owner}/${repo}`;
  } else {
    // 未知のパスはそのまま渡す（Pera1側の "デフォルトブランチのdir指定" 形式）
    path = segments.join("/");
  }

  // GitHub側のクエリ（?tab=...等）やハッシュ（#L10等）はPera1には不要なので捨てる
  return `${PERA1_BASE}/github.com/${path}`;
}
