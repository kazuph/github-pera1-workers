import { toPera1Url } from "./pera1-url.js";

// 変換できないタブで押されたときに、バッジで「!」を短時間表示して知らせる
async function flashErrorBadge(tabId) {
  await chrome.action.setBadgeBackgroundColor({ color: "#d73a49", tabId });
  await chrome.action.setBadgeText({ text: "!", tabId });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "", tabId }).catch(() => {});
  }, 2000);
}

async function openInPera1(tab) {
  const pera1Url = toPera1Url(tab?.url ?? "");
  if (!pera1Url) {
    if (tab?.id != null) await flashErrorBadge(tab.id);
    return null;
  }
  // tabが部分的なオブジェクトでも壊れないようにindex/openerTabIdはガードする
  // （tab.id === chrome.tabs.TAB_ID_NONE(-1) のタブはopenerに指定できない）
  return chrome.tabs.create({
    url: pera1Url,
    index: typeof tab.index === "number" && tab.index >= 0 ? tab.index + 1 : undefined,
    openerTabId: typeof tab.id === "number" && tab.id >= 0 ? tab.id : undefined,
  });
}

chrome.action.onClicked.addListener((tab) => {
  openInPera1(tab).catch((err) => {
    console.error("[Pera1] failed to open tab:", err);
  });
});

// E2Eテスト（Playwright）からservice worker経由で呼び出すために公開
globalThis.openInPera1 = openInPera1;
