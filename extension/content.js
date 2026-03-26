(function () {
  "use strict";

  const PERA1_HOST = "pera1.pages.dev";
  const BUTTON_ID = "pera1-goto-btn";

  function getRepoPath() {
    const path = location.pathname;
    const segments = path.split("/").filter(Boolean);
    // Must have at least owner/repo
    if (segments.length < 2) return null;
    // Exclude settings, actions, issues, pulls, etc. at the repo level
    // We want: /owner/repo, /owner/repo/tree/..., /owner/repo/blob/...
    return segments.slice(0, 2).join("/");
  }

  function createButton(repoPath) {
    const btn = document.createElement("a");
    btn.id = BUTTON_ID;
    btn.href = `https://${PERA1_HOST}/github.com/${repoPath}`;
    btn.target = "_blank";
    btn.rel = "noopener noreferrer";
    btn.textContent = "Go to Pera1";
    btn.style.cssText = [
      "display: inline-flex",
      "align-items: center",
      "gap: 4px",
      "margin-left: 8px",
      "padding: 3px 10px",
      "font-size: 12px",
      "font-weight: 600",
      "color: #fff",
      "background: #0969da",
      "border-radius: 6px",
      "text-decoration: none",
      "vertical-align: middle",
      "line-height: 1.5",
      "cursor: pointer",
      "transition: background 0.15s",
    ].join(";");

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#0550ae";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#0969da";
    });

    return btn;
  }

  function injectButton() {
    // Avoid duplicate
    if (document.getElementById(BUTTON_ID)) return;

    const repoPath = getRepoPath();
    if (!repoPath) return;

    // Try multiple selectors for GitHub's repo heading area
    const selectors = [
      "#repository-container-header strong[itemprop='name'] a",
      "#repository-container-header .AppHeader-context-item-label",
      "[data-pjax='#repo-content-pjax-container'] strong a",
      ".AppHeader-context-full li:last-child a",
    ];

    let anchor = null;
    for (const sel of selectors) {
      anchor = document.querySelector(sel);
      if (anchor) break;
    }

    if (!anchor) return;

    const btn = createButton(repoPath);
    // Insert after the repo name element
    const parent = anchor.closest("li") || anchor.parentElement;
    if (parent) {
      parent.style.display =
        parent.style.display === "flex" ? "flex" : parent.style.display;
      parent.appendChild(btn);
    }
  }

  // Initial injection
  injectButton();

  // Re-inject on GitHub's SPA navigation (turbo/pjax)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Small delay for DOM to update
      setTimeout(injectButton, 300);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
