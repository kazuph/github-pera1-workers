import { Hono } from "hono";
import type { Context } from "hono";
import JSZip from "jszip";

const app = new Hono();

const EXAMPLE_REPO = "https://github.com/kazuph/github-pera1-workers";

// エラーレスポンスを生成する共通関数
const createErrorResponse = (
	c: Context,
	targetUrl: string,
	errorMessage: string,
	status: 400 | 403 | 404 | 500,
) => {
	const host = c.req.header("host") || "";
	const protocol = c.req.url.startsWith("https") ? "https" : "http";
	const fullUrl = targetUrl
		? `${protocol}://${host}/${targetUrl}`
		: `${protocol}://${host}/${EXAMPLE_REPO}`;
	return c.html(
		`
		<div>
			<p>Error: ${errorMessage}</p>
			${!targetUrl ? `<p>Example: <a href="${fullUrl}">${fullUrl}</a></p>` : `<p>URL: <a href="${fullUrl}">${fullUrl}</a></p>`}
		</div>
	`,
		status,
	);
};

const fetchZip = async (owner: string, repo: string, branch: string) => {
	const zipUrl = `https://codeload.github.com/${owner}/${repo}/zip/${branch}`;
	console.log(`📦 Fetching zip from: ${zipUrl}`);

	return await fetch(zipUrl, {
		headers: {
			"User-Agent": "Pera1-Bot",
		},
	});
};

// ツリー表示のための共通関数
const createTreeDisplay = (
	fileTree: Map<string, { size: number; content: string }>,
	showSize = false,
) => {
	const dirs = new Set<string>();

	// すべてのパスを収集
	for (const [path] of fileTree) {
		const parts = path.split("/");
		for (let i = 1; i <= parts.length; i++) {
			dirs.add(parts.slice(0, i).join("/"));
		}
	}

	// ソートしてツリー表示を生成
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
			result += `${indent}${isFile ? "📄" : "📂"} ${name} (${size} KB)\n`;
		} else {
			result += `${indent}${isFile ? "📄" : "📂"} ${name}\n`;
		}
	}

	return result;
};

app.get("/*", async (c) => {
	try {
		const url = new URL(c.req.url);
		const path = url.pathname.slice(1);
		const params = url.searchParams;

		// 新しいパラメータの取得
		const targetDir = params.get("dir")?.trim() || "";
		const targetExts =
			params
				.get("ext")
				?.split(",")
				.map((e) => e.trim().toLowerCase()) || [];
		const isTreeMode = params.get("mode") === "tree";

		console.log(`📥 Received request with path: ${path}`);

		if (!path) {
			console.log("❌ No path provided");
			return createErrorResponse(c, "", "No repository URL provided", 400);
		}

		let urlStr = path;
		if (!urlStr.startsWith("http")) {
			urlStr = `https://${urlStr}`;
			console.log(`🔄 Added https prefix: ${urlStr}`);
		}

		let parsed: URL;
		try {
			parsed = new URL(urlStr);
		} catch (error) {
			console.error(
				`❌ URL parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			return createErrorResponse(
				c,
				urlStr,
				`Invalid URL: ${error instanceof Error ? error.message : "Unknown error"}`,
				400,
			);
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
		let branch = segments[2] ?? "main";

		console.log(
			`📥 Processing GitHub repo: ${owner}/${repo} (branch: ${branch})`,
		);

		// Try main branch first, then master if main fails
		let zipResp = await fetchZip(owner, repo, branch);
		if (!zipResp.ok && branch === "main") {
			console.log("⚠️ main branch failed, trying master branch");
			branch = "master";
			zipResp = await fetchZip(owner, repo, branch);
		}

		if (!zipResp.ok) {
			const errorMsg = `Failed to fetch zip: ${zipResp.status} ${zipResp.statusText}`;
			console.error(`❌ ${errorMsg}`);
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
		let resultText = "";
		let totalSize = 0;
		const fileTree = new Map<string, { size: number; content: string }>();

		// Check if tsconfig exists to determine if it's a TypeScript project
		const hasTsConfig = Object.keys(jszip.files).some(
			(name) => name.startsWith(rootPrefix) && name.endsWith("tsconfig.json"),
		);

		// File extension filters
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
			// Archives
			".zip",
			".tar",
			".gz",
			".rar",
			".7z",
			// Compiled
			".exe",
			".dll",
			".so",
			".dylib",
			// Documents
			".pdf",
			".doc",
			".docx",
			".xls",
			".xlsx",
			".ppt",
			".pptx",
			// Media
			".mp3",
			".mp4",
			".avi",
			".mov",
			".wav",
			// Other
			".bin",
			".dat",
			".db",
			".sqlite",
		]);

		// Size limits (in bytes)
		const MAX_FILE_SIZE = 500 * 1024; // 500KB

		const isBinaryContent = (content: string): boolean => {
			// Check for null bytes or high concentration of non-printable characters
			const sampleSize = Math.min(content.length, 1000); // Check first 1000 chars
			let nonPrintable = 0;

			for (let i = 0; i < sampleSize; i++) {
				const charCode = content.charCodeAt(i);
				if (
					charCode === 0 ||
					(charCode < 32 && ![9, 10, 13].includes(charCode))
				) {
					nonPrintable++;
				}
			}

			// If more than 5% are non-printable, consider it binary
			return nonPrintable / sampleSize > 0.05;
		};

		const shouldSkipFile = (
			filename: string,
			size: number,
			content?: string,
		) => {
			const ext = filename.toLowerCase().split(".").pop();
			if (!ext) return false;

			// Skip lock files
			if (filename.match(/-lock\.|\.lock$/)) {
				console.log(`🚫 Skipping lock file: ${filename}`);
				return true;
			}

			// Skip by extension
			if (imageExtensions.has(`.${ext}`) || binaryExtensions.has(`.${ext}`)) {
				console.log(`🚫 Skipping binary extension: ${filename}`);
				return true;
			}

			// Skip JS files if tsconfig exists
			if (
				hasTsConfig &&
				(filename.endsWith(".js") || filename.endsWith(".mjs"))
			) {
				console.log(`🚫 Skipping compiled JS: ${filename}`);
				return true;
			}

			// Skip large files
			if (size > MAX_FILE_SIZE) {
				console.log(
					`🚫 Skipping large file (${(size / 1024).toFixed(2)}KB): ${filename}`,
				);
				return true;
			}

			// Skip binary content
			if (content && isBinaryContent(content)) {
				console.log(`🚫 Skipping binary content: ${filename}`);
				return true;
			}

			return false;
		};

		const shouldIncludeFile = (filename: string) => {
			// ディレクトリフィルタ
			if (targetDir && !filename.startsWith(targetDir)) {
				return false;
			}

			// 拡張子フィルタ
			if (targetExts.length > 0) {
				const ext = filename.split(".").pop()?.toLowerCase() || "";
				if (!targetExts.includes(ext)) {
					return false;
				}
			}

			return true;
		};

		for (const fileObj of Object.values(jszip.files)) {
			if (!fileObj.dir && fileObj.name.startsWith(rootPrefix)) {
				const fileRelative = fileObj.name.slice(rootPrefix.length);

				// ツリーモードの場合はフィルタリングなしで全ファイルをツリー表示用に収集
				if (isTreeMode) {
					fileTree.set(fileRelative, { size: 0, content: "" });
					continue;
				}

				// 新しいフィルタを適用
				if (!shouldIncludeFile(fileRelative)) {
					continue;
				}

				const content = await fileObj.async("string");
				const size = new TextEncoder().encode(content).length;

				// 既存のフィルタも適用
				if (shouldSkipFile(fileRelative, size, content)) {
					continue;
				}

				totalSize += size;
				fileTree.set(fileRelative, { size, content });
			}
		}

		// ディレクトリツリーの表示
		resultText = "";
		if (isTreeMode) {
			resultText += "# 📁 Directory Structure\n\n";
			resultText += createTreeDisplay(fileTree, false);
			return c.text(resultText, 200);
		}

		// 通常モードの場合
		resultText += "# 📁 File Tree\n\n";
		resultText += createTreeDisplay(fileTree, true);

		resultText += `\n# 📝 Files (Total: ${(totalSize / 1024).toFixed(2)} KB)\n\n`;

		// Add file contents
		for (const [path, { content }] of fileTree) {
			resultText += `\`\`\`${path}\n${content}\n\`\`\`\n\n`;
		}

		return c.text(resultText, 200);
	} catch (e: unknown) {
		console.error(
			`❌ Unexpected error: ${e instanceof Error ? e.message : "Unknown error"}`,
		);
		return createErrorResponse(
			c,
			"",
			`Unexpected error: ${e instanceof Error ? e.message : "Unknown error"}`,
			500,
		);
	}
});

export default app;
