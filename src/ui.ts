import { APP_VERSION, EXAMPLE_REPO } from "./constants";

/** Generate the landing page HTML */
export function createLandingPage(
  protocol: string,
  host: string,
  errorMessage?: string,
  targetUrl?: string,
): string {
  const fullUrl = targetUrl
    ? `${protocol}://${host}/${targetUrl}`
    : `${protocol}://${host}/${EXAMPLE_REPO.replace("https://", "")}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <title>github pera1 — Code to Text for LLMs</title>
  <style>
    :root {
      --bg: #ffffff;
      --bg-secondary: #f6f8fa;
      --bg-card: #ffffff;
      --text: #1f2328;
      --text-secondary: #656d76;
      --border: #d0d7de;
      --accent: #0969da;
      --accent-hover: #0550ae;
      --accent-bg: #ddf4ff;
      --success: #1a7f37;
      --success-bg: #dafbe1;
      --error: #cf222e;
      --error-bg: #ffebe9;
      --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
      --shadow-lg: 0 4px 12px rgba(0,0,0,0.1);
      --radius: 12px;
      --radius-sm: 8px;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d1117;
        --bg-secondary: #161b22;
        --bg-card: #161b22;
        --text: #e6edf3;
        --text-secondary: #8b949e;
        --border: #30363d;
        --accent: #58a6ff;
        --accent-hover: #79c0ff;
        --accent-bg: #0d1117;
        --success: #3fb950;
        --success-bg: #0d1117;
        --error: #f85149;
        --error-bg: #1c0a0a;
        --shadow: 0 1px 3px rgba(0,0,0,0.3);
        --shadow-lg: 0 4px 12px rgba(0,0,0,0.4);
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background: var(--bg);
      min-height: 100vh;
    }

    .container {
      max-width: 780px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    /* Hero */
    .hero {
      text-align: center;
      padding: 3rem 0 2rem;
      animation: fadeIn 0.5s ease-out;
    }

    .hero-logo {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }

    .hero h1 {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }

    .hero h1 span {
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero p {
      color: var(--text-secondary);
      font-size: 1.1rem;
      max-width: 500px;
      margin: 0 auto;
    }

    /* Error */
    .error-banner {
      background: var(--error-bg);
      color: var(--error);
      border: 1px solid var(--error);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
      animation: fadeIn 0.3s ease-out;
    }

    /* Form */
    .form-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      box-shadow: var(--shadow);
      margin-bottom: 2rem;
      animation: slideUp 0.4s ease-out;
    }

    .form-card h2 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
      color: var(--text);
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 0.95rem;
      background: var(--bg);
      color: var(--text);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-bg);
    }

    .form-hint {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
      .hero h1 { font-size: 1.5rem; }
      .hero { padding: 2rem 0 1.5rem; }
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.7rem 1.5rem;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }

    .btn-primary:hover { background: var(--accent-hover); }
    .btn-primary:active { transform: scale(0.98); }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-primary .spinner {
      display: none;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .btn-primary.loading .spinner { display: inline-block; }
    .btn-primary.loading .btn-text { display: none; }

    /* URL Result */
    .url-result {
      display: none;
      background: var(--success-bg);
      border: 1px solid var(--success);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      margin-top: 1rem;
      font-size: 0.85rem;
    }

    .url-result.visible { display: flex; align-items: center; gap: 0.5rem; }

    .url-result code {
      flex: 1;
      word-break: break-all;
      font-family: 'SF Mono', SFMono-Regular, Consolas, monospace;
      font-size: 0.8rem;
      color: var(--success);
    }

    .btn-copy {
      padding: 0.35rem 0.65rem;
      background: var(--success);
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.2s;
    }

    .btn-copy:hover { opacity: 0.85; }

    /* Features */
    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
      animation: slideUp 0.5s ease-out 0.1s both;
    }

    @media (max-width: 600px) {
      .features { grid-template-columns: 1fr; }
    }

    .feature {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 1.25rem;
      text-align: center;
      transition: box-shadow 0.2s, transform 0.2s;
    }

    .feature:hover {
      box-shadow: var(--shadow-lg);
      transform: translateY(-2px);
    }

    .feature-icon { font-size: 1.8rem; margin-bottom: 0.5rem; }
    .feature h3 { font-size: 0.9rem; font-weight: 700; margin-bottom: 0.35rem; }
    .feature p { font-size: 0.8rem; color: var(--text-secondary); }

    /* Usage */
    .usage {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      margin-bottom: 2rem;
      animation: slideUp 0.5s ease-out 0.2s both;
    }

    .usage h2 {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }

    .usage code {
      display: inline-block;
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-family: 'SF Mono', SFMono-Regular, Consolas, monospace;
      font-size: 0.8rem;
    }

    .usage ul {
      list-style: none;
      padding: 0;
    }

    .usage li {
      padding: 0.4rem 0;
      font-size: 0.9rem;
      border-bottom: 1px solid var(--border);
    }

    .usage li:last-child { border-bottom: none; }

    /* Footer */
    footer {
      text-align: center;
      padding: 1.5rem 0;
      color: var(--text-secondary);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
      animation: fadeIn 0.5s ease-out 0.3s both;
    }

    footer a {
      color: var(--accent);
      text-decoration: none;
    }

    footer a:hover { text-decoration: underline; }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div class="hero-logo">&#128196;</div>
      <h1>github <span>pera1</span></h1>
      <p>Fetch GitHub repos as plain text for LLMs. Paste a URL, get code instantly.</p>
    </div>

    ${errorMessage ? `<div class="error-banner">Error: ${errorMessage}</div>` : ""}

    <div class="form-card">
      <h2>&#128269; Fetch Repository</h2>
      <form id="pera1-form">
        <div class="form-group">
          <label for="repo-url">GitHub Repository URL</label>
          <input type="text" id="repo-url" placeholder="https://github.com/owner/repo" value="${targetUrl || ""}" autocomplete="url" required>
          <div class="form-hint">Full GitHub URL or owner/repo format</div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="dir">Directories</label>
            <input type="text" id="dir" name="dir" placeholder="src,lib">
            <div class="form-hint">Comma-separated filter</div>
          </div>
          <div class="form-group">
            <label for="ext">Extensions</label>
            <input type="text" id="ext" name="ext" placeholder="ts,tsx,js">
            <div class="form-hint">Without dots</div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="mode">Mode</label>
            <select id="mode" name="mode">
              <option value="">Full (code + tree)</option>
              <option value="tree">Tree (structure only)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="branch">Branch</label>
            <input type="text" id="branch" name="branch" placeholder="main">
          </div>
        </div>

        <div class="form-group">
          <label for="file">Single File</label>
          <input type="text" id="file" name="file" placeholder="src/index.ts">
          <div class="form-hint">Fetch only this specific file</div>
        </div>

        <button type="submit" class="btn-primary" id="submit-btn">
          <span class="spinner"></span>
          <span class="btn-text">Generate View</span>
        </button>

        <div class="url-result" id="url-result">
          <code id="result-url"></code>
          <button type="button" class="btn-copy" id="copy-btn">Copy</button>
        </div>
      </form>
    </div>

    <div class="features">
      <div class="feature">
        <div class="feature-icon">&#129302;</div>
        <h3>MCP Support</h3>
        <p>Model Context Protocol server at /mcp endpoint</p>
      </div>
      <div class="feature">
        <div class="feature-icon">&#128450;</div>
        <h3>Smart Filter</h3>
        <p>Filter by directory, extension, or single file</p>
      </div>
      <div class="feature">
        <div class="feature-icon">&#127795;</div>
        <h3>Tree Mode</h3>
        <p>Get repo structure without file contents</p>
      </div>
    </div>

    <div class="usage">
      <h2>Quick Start</h2>
      <ul>
        <li>Basic: <code>${protocol}://${host}/github.com/owner/repo</code></li>
        <li>Branch: <code>${protocol}://${host}/github.com/owner/repo/tree/dev</code></li>
        <li>Filter: <code>${protocol}://${host}/github.com/owner/repo?dir=src&amp;ext=ts</code></li>
        <li>File: <code>${protocol}://${host}/github.com/owner/repo?file=README.md</code></li>
        <li>Tree: <code>${protocol}://${host}/github.com/owner/repo?mode=tree</code></li>
        <li>MCP: <code>${protocol}://${host}/mcp</code></li>
      </ul>
    </div>

    <footer>
      <p>github pera1 v${APP_VERSION} &mdash; <a href="${EXAMPLE_REPO}" target="_blank" rel="noopener">GitHub</a></p>
    </footer>
  </div>

  <script>
    const form = document.getElementById('pera1-form');
    const submitBtn = document.getElementById('submit-btn');
    const urlResult = document.getElementById('url-result');
    const resultUrl = document.getElementById('result-url');
    const copyBtn = document.getElementById('copy-btn');

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const repoUrl = document.getElementById('repo-url').value.trim();
      if (!repoUrl) return;

      let baseUrl = repoUrl;
      if (baseUrl.startsWith('https://')) baseUrl = baseUrl.substring(8);
      if (baseUrl.startsWith('http://')) baseUrl = baseUrl.substring(7);

      const params = new URLSearchParams();
      ['dir','ext','mode','branch','file'].forEach(function(field) {
        const val = document.getElementById(field).value.trim();
        if (val) params.set(field, val);
      });

      let finalUrl = '${protocol}://${host}/' + baseUrl;
      const qs = params.toString();
      if (qs) finalUrl += '?' + qs;

      resultUrl.textContent = finalUrl;
      urlResult.classList.add('visible');

      submitBtn.classList.add('loading');
      setTimeout(function() { window.location.href = finalUrl; }, 300);
    });

    copyBtn.addEventListener('click', function() {
      navigator.clipboard.writeText(resultUrl.textContent).then(function() {
        copyBtn.textContent = 'Copied!';
        setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1500);
      });
    });
  </script>
</body>
</html>`;
}

/** Generate an error response HTML page */
export function createErrorPage(
  protocol: string,
  host: string,
  targetUrl: string,
  errorMessage: string,
): string {
  return createLandingPage(protocol, host, errorMessage, targetUrl);
}
