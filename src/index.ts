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
    <div>
      <p>Error: ${errorMessage}</p>
      ${
				!targetUrl
					? `<p>Example: <a href="${fullUrl}">${fullUrl}</a></p>`
					: `<p>URL: <a href="${fullUrl}">${fullUrl}</a></p>`
			}
    </div>
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

// ディレクトリツリー文字列の生成
function createTreeDisplay(
	fileTree: Map<string, { size: number; content: string }>,
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
			const size = fileInfo ? (fileInfo.size / 1024).toFixed(2) : "0.00";
			result += `${indent}📄 ${name} (${size} KB)\n`;
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

		const fileTree = new Map<string, { size: number; content: string }>();
		let totalSize = 0;

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

				totalSize += size;
				fileTree.set(fileRelative, { size, content });
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

			resultText += `\n# 📝 Files (Total: ${(totalSize / 1024).toFixed(2)} KB)\n\n`;
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
