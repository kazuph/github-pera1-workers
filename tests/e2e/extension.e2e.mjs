// Chrome拡張のE2Eテスト（実Chromium + 実GitHub + 実Pera1 worker、モックなし）
//
// 実行: node tests/e2e/extension.e2e.mjs
// 前提: playwright がローカル or $HOME/node_modules に入っていること
//
// 検証内容:
//   1. 拡張がservice workerとしてロードされる
//   2. github.com のリポジトリページで content script のボタンが出る（リンク先が生きているworkerを向く）
//   3. ツールバーアイコンクリック相当（service workerのonClickedハンドラ）で
//      Pera1のタブが開き、実際にコードが1ページ展開される
//   4. GitHub以外のタブではタブを開かない
//
// 注: chrome.action のツールバークリック自体はPlaywrightから発火できないため、
//     onClickedに渡るtabオブジェクトと同じ形（id/index/url）でハンドラを直接呼んでいる。

import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

function loadPlaywright() {
  for (const base of [process.cwd(), join(homedir(), "node_modules")]) {
    try {
      const req = createRequire(join(base, "/"));
      return req("playwright");
    } catch {
      /* try next */
    }
  }
  throw new Error("playwright not found (npm i -g playwright などで導入してください)");
}

const { chromium } = loadPlaywright();

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const extensionPath = join(repoRoot, "extension");
const artifactsDir = join(repoRoot, ".artifacts", "chrome-extension", "images");
mkdirSync(artifactsDir, { recursive: true });

const PERA1_BASE = "https://pera1.kazu-san.workers.dev";
const GITHUB_URL = "https://github.com/kazuph/github-pera1-workers";

async function launch(headless) {
  const userDataDir = mkdtempSync(join(tmpdir(), "pera1-ext-e2e-"));
  return chromium.launchPersistentContext(userDataDir, {
    headless,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
}

async function getServiceWorker(context) {
  const existing = context.serviceWorkers();
  if (existing.length > 0) return existing[0];
  return context.waitForEvent("serviceworker", { timeout: 10_000 });
}

let context;
let headlessMode = true;
try {
  context = await launch(true);
  try {
    await getServiceWorker(context);
  } catch {
    // 新ヘッドレスで拡張が読めない環境向けフォールバック
    await context.close();
    headlessMode = false;
    context = await launch(false);
  }
} catch (e) {
  console.error("Chromium起動に失敗:", e);
  process.exit(1);
}

try {
  const sw = await getServiceWorker(context);
  console.log(`✔ 拡張のservice workerがロードされた (headless: ${headlessMode})`);

  // --- 2. content script のボタン検証 ---
  const page = await context.newPage();
  await page.goto(GITHUB_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const btn = page.locator("#pera1-goto-btn");
  await btn.waitFor({ state: "visible", timeout: 15_000 });
  const href = await btn.getAttribute("href");
  assert.equal(href, `${PERA1_BASE}/github.com/kazuph/github-pera1-workers`);
  // 配置検証: リポジトリ名の横ではなく、Watch/Fork/Starのアクションエリア内にいること
  const inActions = await btn.evaluate((el) => !!el.closest("ul.pagehead-actions"));
  assert.ok(inActions, "ボタンがul.pagehead-actions内に配置されること");
  console.log(`✔ content scriptのボタン表示・配置(pagehead-actions)・リンク先OK: ${href}`);
  await page.screenshot({
    path: join(artifactsDir, "01-github-with-button.png"),
    fullPage: false,
  });
  // ヘッダー部分の拡大スクショ（ライト/ダーク両方）
  const header = page.locator("#repository-container-header");
  await header.screenshot({ path: join(artifactsDir, "01b-header-light.png") });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(500);
  await header.screenshot({ path: join(artifactsDir, "01c-header-dark.png") });
  await page.emulateMedia({ colorScheme: "light" });

  // --- 3. ツールバークリック相当でPera1タブが開く ---
  const created = await sw.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // 実クリック時はactiveTab付与によりtab.urlが入る。その状態を再現する。
    return globalThis.openInPera1({ ...tab, url });
  }, page.url());
  assert.ok(created, "openInPera1がタブを返すこと");

  // waitForEvent("page")はイベント取りこぼしでflakeするためポーリングで待つ
  const expectedPrefix = `${PERA1_BASE}/github.com/kazuph/github-pera1-workers`;
  const deadline = Date.now() + 30_000;
  let pera1Page;
  while (!pera1Page && Date.now() < deadline) {
    pera1Page = context.pages().find((p) => p.url().startsWith(expectedPrefix));
    if (!pera1Page) await new Promise((r) => setTimeout(r, 250));
  }
  assert.ok(pera1Page, `Pera1のURLのタブが開くこと: ${context.pages().map((p) => p.url())}`);
  await pera1Page.waitForLoadState("domcontentloaded");
  // Pera1はZIP取得・展開に数秒かかるので実コンテンツを待つ
  await pera1Page.waitForFunction(
    () => document.body && document.body.innerText.includes("File Tree"),
    { timeout: 60_000 }
  );
  const body = await pera1Page.evaluate(() => document.body.innerText);
  assert.ok(body.includes("File Tree"), "File Treeが含まれること");
  assert.ok(body.includes("src/index.ts"), "ファイル一覧が展開されていること");
  console.log(`✔ Pera1タブが開きコードが展開された: ${pera1Page.url()}`);
  await pera1Page.screenshot({
    path: join(artifactsDir, "02-pera1-expanded.png"),
    fullPage: false,
  });

  // --- 4. GitHub以外では開かない ---
  const before = context.pages().length;
  const result = await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return globalThis.openInPera1({ ...tab, url: "https://example.com/foo/bar" });
  });
  assert.equal(result, null, "GitHub以外ではnullを返すこと");
  assert.equal(context.pages().length, before, "タブが増えないこと");
  console.log("✔ GitHub以外のタブでは何も開かない");

  console.log("\nE2E ALL GREEN 🎉");
} finally {
  await context.close();
}
