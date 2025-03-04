import { Hono } from "hono";
import type { Context } from "hono";
import JSZip from "jszip";

const app = new Hono();

// GitHub リポジトリの例
const EXAMPLE_REPO = "https://github.com/kazuph/github-pera1-workers";

// エラー応答生成関数
function createErrorResponse(
	c: Context,
	targetUrl: string,
	errorMessage: string,
	status: 400 | 403 | 404 | 500,
) {
	const host = c.req.header("host") || "";
	const protocol = c.req.url.startsWith("https") ? "https" : "http";
	const fullUrl = targetUrl
		? `${protocol}://${host}/${targetUrl}`
		: `${protocol}://${host}/${EXAMPLE_REPO}`;

	return c.html(
		`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>github pera1</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        h1 {
          color: #0366d6;
          margin-bottom: 1.5rem;
        }
        .error {
          color: #cb2431;
          background-color: #ffeef0;
          border: 1px solid #ffdce0;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        .example {
          margin-bottom: 1.5rem;
        }
        form {
          background-color: #f6f8fa;
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        input, select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #e1e4e8;
          border-radius: 4px;
          font-family: inherit;
          font-size: 1rem;
        }
        .form-hint {
          font-size: 0.85rem;
          color: #586069;
          margin-top: 0.25rem;
        }
        button {
          background-color: #2ea44f;
          color: #fff;
          border: 1px solid rgba(27, 31, 35, 0.15);
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        button:hover {
          background-color: #2c974b;
        }
        code {
          background-color: #f6f8fa;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
          font-size: 0.85rem;
        }
      </style>
    </head>
    <body>
      <h1>github pera1</h1>
      
      ${errorMessage ? `<div class="error">Error: ${errorMessage}</div>` : ''}
      
      <div class="example">
        ${
					!targetUrl
						? `<p>Example: <a href="${fullUrl}">${fullUrl}</a></p>`
						: `<p>URL: <a href="${fullUrl}">${fullUrl}</a></p>`
				}
      </div>
      
      <form action="" method="get" id="pera1-form">
        <h2>Set Parameters</h2>
        
        <div class="form-group">
          <label for="repo-url">GitHub Repository URL</label>
          <input type="text" id="repo-url" placeholder="https://github.com/username/repository" value="${targetUrl || ''}">
          <div class="form-hint">Enter full GitHub URL including https://</div>
        </div>
        
        <div class="form-group">
          <label for="dir">Directories (Optional)</label>
          <input type="text" id="dir" placeholder="src,components,lib" name="dir">
          <div class="form-hint">Filter files by directory paths (comma-separated)</div>
        </div>
        
        <div class="form-group">
          <label for="ext">Extensions (Optional)</label>
          <input type="text" id="ext" placeholder="ts,js,tsx" name="ext">
          <div class="form-hint">Filter files by extensions (comma-separated, without dots)</div>
        </div>
        
        <div class="form-group">
          <label for="mode">Display Mode</label>
          <select id="mode" name="mode">
            <option value="">Full Mode (default)</option>
            <option value="tree">Tree Mode (structure + README only)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="branch">Branch (Optional)</label>
          <input type="text" id="branch" placeholder="main" name="branch">
          <div class="form-hint">Defaults to main or master if not specified</div>
        </div>
        
        <div class="form-group">
          <label for="file">Single File (Optional)</label>
          <input type="text" id="file" placeholder="src/App.js" name="file">
          <div class="form-hint">Retrieve only a specific file</div>
        </div>
        
        <button type="submit">Generate View</button>
      </form>
      
      <div>
        <h2>How to Use</h2>
        <p>This tool fetches code from GitHub repositories and combines files into a single view.</p>
        <p>Examples:</p>
        <ul>
          <li>Basic: <code>${protocol}://${host}/github.com/username/repo</code></li>
          <li>With branch: <code>${protocol}://${host}/github.com/username/repo/tree/branch-name</code></li>
          <li>With params: <code>${protocol}://${host}/github.com/username/repo?dir=src&ext=ts,tsx</code></li>
        </ul>
      </div>
      
      <script>
        document.getElementById('pera1-form').addEventListener('submit', function(e) {
          e.preventDefault();
          
          const repoUrl = document.getElementById('repo-url').value.trim();
          if (!repoUrl) {
            alert('Please enter a GitHub repository URL');
            return;
          }
          
          // Build the base URL (removing https:// if present)
          let baseUrl = repoUrl;
          if (baseUrl.startsWith('https://')) {
            baseUrl = baseUrl.substring(8);
          }
          
          // Build query parameters
          const params = new URLSearchParams();
          
          const dir = document.getElementById('dir').value.trim();
          if (dir) params.set('dir', dir);
          
          const ext = document.getElementById('ext').value.trim();
          if (ext) params.set('ext', ext);
          
          const mode = document.getElementById('mode').value;
          if (mode) params.set('mode', mode);
          
          const branch = document.getElementById('branch').value.trim();
          if (branch) params.set('branch', branch);
          
          const file = document.getElementById('file').value.trim();
          if (file) params.set('file', file);
          
          // Build the final URL
          let finalUrl = '${protocol}://${host}/' + baseUrl;
          const queryString = params.toString();
          if (queryString) {
            finalUrl += '?' + queryString;
          }
          
          window.location.href = finalUrl;
        });
      </script>
    </body>
    </html>
  `,
		status,
	);
}

// GitHubリポジトリのZIPファイルを取得
async function fetchZip(owner: string, repo: string, branch: string) {
	const zipUrl = `https://codeload.github.com/${owner}/${repo}/zip/${branch}`;
	console.log(`📦 Fetching zip from: ${zipUrl}`);
	return await fetch(zipUrl, {
		headers: {
			"User-Agent": "Pera1-Bot",
		},
	});
}

// 定数
const MAX_DISPLAY_FILE_SIZE = 30 * 1024; // 30KB

// ディレクトリツリー文字列の生成
function createTreeDisplay(
	fileTree: Map<string, { size: number; content: string; isTruncated?: boolean }>,
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
	let result = "";

	for (const dir of sortedDirs) {
		const depth = dir.split("/").length - 1;
		const indent = "  ".repeat(depth);
		const name = dir.split("/").pop() || "";
		const isFile = !Array.from(dirs).some((d) => d.startsWith(dir + "/"));

		if (showSize && isFile) {
			const fileInfo = fileTree.get(dir);
			if (fileInfo) {
				const sizeKB = (fileInfo.size / 1024).toFixed(2);
				if (fileInfo.isTruncated) {
					result += `${indent}📄 ${name} (${sizeKB} KB→30KB truncated)\n`;
				} else {
					result += `${indent}📄 ${name} (${sizeKB} KB)\n`;
				}
			} else {
				result += `${indent}📄 ${name} (0.00 KB)\n`;
			}
		} else {
			result += `${indent}${isFile ? "📄" : "📂"} ${name}\n`;
		}
	}

	return result;
}

// バイナリコンテンツ判定
function isBinaryContent(content: string): boolean {
	const sampleSize = Math.min(content.length, 1000);
	let nonPrintable = 0;
	for (let i = 0; i < sampleSize; i++) {
		const charCode = content.charCodeAt(i);
		if (charCode === 0 || (charCode < 32 && ![9, 10, 13].includes(charCode))) {
			nonPrintable++;
		}
	}
	return nonPrintable / sampleSize > 0.05;
}

// 出力スキップ判定用（バイナリや大サイズファイル、ロックファイルなど）
function shouldSkipFile(
	filename: string,
	size: number,
	content: string | undefined,
	hasTsConfig: boolean,
): boolean {
	const MAX_FILE_SIZE = 500 * 1024; // 500KB
	const imageExtensions = new Set([
		".png",
		".jpg",
		".jpeg",
		".gif",
		".bmp",
		".ico",
		".webp",
		".svg",
	]);
	const binaryExtensions = new Set([
		".zip",
		".tar",
		".gz",
		".rar",
		".7z",
		".exe",
		".dll",
		".so",
		".dylib",
		".pdf",
		".doc",
		".docx",
		".xls",
		".xlsx",
		".ppt",
		".pptx",
		".mp3",
		".mp4",
		".avi",
		".mov",
		".wav",
		".bin",
		".dat",
		".db",
		".sqlite",
	]);

	const ext = filename.toLowerCase().split(".").pop() || "";

	// ロックファイル除外
	if (filename.match(/-lock\.|\.lock$/)) return true;

	// バイナリ拡張子除外
	if (imageExtensions.has(`.${ext}`) || binaryExtensions.has(`.${ext}`))
		return true;

	// TSプロジェクトの場合、.jsや.mjsは除外
	if (hasTsConfig && (filename.endsWith(".js") || filename.endsWith(".mjs")))
		return true;

	// サイズ制限
	if (size > MAX_FILE_SIZE) return true;

	// 中身がバイナリ
	if (content && isBinaryContent(content)) return true;

	return false;
}

// ディレクトリ・拡張子フィルタによる出力可否
function shouldIncludeFile(
	filename: string,
	targetDirs: string[],
	targetExts: string[],
): boolean {
	// ディレクトリフィルタ
	if (targetDirs.length > 0) {
		const matchesDir = targetDirs.some((dir) => {
			const normalizedDir = dir.endsWith("/") ? dir : `${dir}/`;
			return filename.startsWith(normalizedDir);
		});
		if (!matchesDir) return false;
	}

	// 拡張子フィルタ
	if (targetExts.length > 0) {
		const ext = filename.split(".").pop()?.toLowerCase() || "";
		if (!targetExts.includes(ext)) return false;
	}

	return true;
}

app.get("/*", async (c) => {
	try {
		const url = new URL(c.req.url);
		const path = url.pathname.slice(1);
		const params = url.searchParams;

		// パラメータ抽出
		const targetDirs = (
			params
				.get("dir")
				?.split(",")
				.map((d) => d.trim()) || []
		).filter((d) => d);
		const targetExts = (
			params
				.get("ext")
				?.split(",")
				.map((e) => e.trim().toLowerCase()) || []
		).filter((e) => e);
		const isTreeMode = params.get("mode") === "tree";
		const paramBranch = params.get("branch")?.trim();
		const targetFile = params.get("file")?.trim();

		if (!path) {
			return createErrorResponse(c, "", "No repository URL provided", 400);
		}

		let urlStr = path.startsWith("http") ? path : `https://${path}`;

		let parsed: URL;
		try {
			parsed = new URL(urlStr);
		} catch (error) {
			const msg = `Invalid URL: ${error instanceof Error ? error.message : "Unknown error"}`;
			return createErrorResponse(c, urlStr, msg, 400);
		}

		const segments = parsed.pathname.split("/").filter(Boolean);
		if (segments.length < 2) {
			return createErrorResponse(
				c,
				urlStr,
				"Invalid GitHub repository URL format",
				400,
			);
		}

		const owner = segments[0];
		const repo = segments[1];

		// ブランチ名の取得ロジックを改善
		let branch = paramBranch;
		if (!branch && segments.length > 3 && segments[2] === "tree") {
			// segments[3]以降を結合してブランチ名に
			branch = segments.slice(3).join("/");
		} else {
			branch = "main";
		}

		// ZIP取得
		let zipResp = await fetchZip(owner, repo, branch);
		if (!zipResp.ok && branch === "main") {
			branch = "master";
			zipResp = await fetchZip(owner, repo, branch);
		}

		if (!zipResp.ok) {
			const errorMsg = `Failed to fetch zip: ${zipResp.status} ${zipResp.statusText}`;
			return createErrorResponse(
				c,
				urlStr,
				errorMsg,
				zipResp.status as 404 | 403 | 500,
			);
		}

		const arrayBuffer = await zipResp.arrayBuffer();
		const jszip = await JSZip.loadAsync(arrayBuffer);
		const rootPrefix = `${repo}-${branch}/`;

		// tsconfig.json があればTSプロジェクト判定
		const hasTsConfig = Object.keys(jszip.files).some(
			(name) => name.startsWith(rootPrefix) && name.endsWith("tsconfig.json"),
		);

		const fileTree = new Map<string, { size: number; content: string; isTruncated?: boolean }>();
		let originalTotalSize = 0; // 元のサイズ合計
		let displayTotalSize = 0; // 表示用サイズ合計

		for (const fileObj of Object.values(jszip.files)) {
			if (fileObj.dir) continue;
			if (!fileObj.name.startsWith(rootPrefix)) continue;

			const fileRelative = fileObj.name.slice(rootPrefix.length);

			// 単一ファイル指定がある場合、そのファイルのみを処理
			if (targetFile && fileRelative !== targetFile) {
				continue;
			}

			// ツリーモードでもフィルタを適用し、指定dirやextに該当しないファイルは除外する
			if (!shouldIncludeFile(fileRelative, targetDirs, targetExts)) {
				continue;
			}

			const isReadmeFile = /readme\.md$/i.test(fileRelative);

			if (isTreeMode && !isReadmeFile) {
				// ツリーモードではREADME以外はコンテンツを読み込まず、ツリーの構築のみ行う
				fileTree.set(fileRelative, { size: 0, content: "" });
			} else {
				// 通常モードまたはREADMEファイルはファイルコンテンツを読み込む
				const content = await fileObj.async("string");
				const size = new TextEncoder().encode(content).length;

				// スキップ条件チェック
				if (shouldSkipFile(fileRelative, size, content, hasTsConfig)) {
					continue;
				}
				
				// ファイルサイズが30KB以上なら切り捨て
				let isTruncated = false;
				let processedContent = content;
				let displaySize = size;
				
				if (size > MAX_DISPLAY_FILE_SIZE) {
					// 30KBまでの内容に切り捨て
					processedContent = content.substring(0, MAX_DISPLAY_FILE_SIZE);
					// 残りのサイズを計算
					const remainingSize = (size - MAX_DISPLAY_FILE_SIZE) / 1024;
					// 切り捨てメッセージを追加
					processedContent += `\n\nThis file is too large, truncated at 30KB. There is ${remainingSize.toFixed(2)}KB remaining.`;
					isTruncated = true;
					// 表示用のサイズを30KBに制限
					displaySize = MAX_DISPLAY_FILE_SIZE;
				}
				
				// 元のサイズを合計に追加
				originalTotalSize += size;
				// 表示用サイズを合計に追加
				displayTotalSize += displaySize;
				
				fileTree.set(fileRelative, { 
					size, 
					content: processedContent,
					isTruncated
				});
			}
		}

		// 単一ファイル指定がある場合
		if (targetFile) {
			const fileEntry = Array.from(fileTree.entries()).find(([path]) => path === targetFile);
			if (!fileEntry) {
				return createErrorResponse(c, urlStr, `File not found: ${targetFile}`, 404);
			}
			
			return c.text(fileEntry[1].content, 200);
		}

		// レスポンス生成
		if (isTreeMode) {
			// ツリーのみ表示（READMEファイルの内容も含める）
			let resultText = "# Directory Structure\n\n";
			resultText += createTreeDisplay(fileTree, false);
			
			// READMEファイルがあれば追加
			const readmeFiles = Array.from(fileTree.entries())
				.filter(([path, { content }]) => /readme\.md$/i.test(path) && content);
			
			if (readmeFiles.length > 0) {
				resultText += "\n# README Files\n\n";
				for (const [path, { content }] of readmeFiles) {
					resultText += `## ${path}\n\n${content}\n\n`;
				}
			}
			
			return c.text(resultText, 200);
		} else {
			// 通常モード：ツリー＋ファイル内容
			let resultText = "# 📁 File Tree\n\n";
			resultText += createTreeDisplay(fileTree, true);

			resultText += `\n# 📝 Files (Total: ${(originalTotalSize / 1024).toFixed(2)} KB→${(displayTotalSize / 1024).toFixed(2)} KB)\n\n`;
			for (const [path, { content }] of fileTree) {
				resultText += `\`\`\`${path}\n${content}\n\`\`\`\n\n`;
			}

			return c.text(resultText, 200);
		}
	} catch (e: unknown) {
		const msg = `Unexpected error: ${e instanceof Error ? e.message : "Unknown error"}`;
		console.error(`❌ ${msg}`);
		return createErrorResponse(c, "", msg, 500);
	}
});

export default app;
