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
  return chrome.tabs.create({
    url: pera1Url,
    index: tab.index + 1,
    openerTabId: tab.id,
  });
}

chrome.action.onClicked.addListener((tab) => {
  openInPera1(tab);
});

// E2Eテスト（Playwright）からservice worker経由で呼び出すために公開
globalThis.openInPera1 = openInPera1;
