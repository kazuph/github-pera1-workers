import JSZip from "jszip";

/**
 * Build a test ZIP that mimics GitHub's codeload format.
 * GitHub ZIPs have a root folder: `{repo}-{branch}/`
 */
export async function buildTestZip(
  repoName: string,
  branch: string,
  files: Record<string, string>,
): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const prefix = `${repoName}-${branch}`;

  for (const [path, content] of Object.entries(files)) {
    zip.file(`${prefix}/${path}`, content);
  }

  return zip.generateAsync({ type: "arraybuffer" });
}

/** Standard test files for a typical repo */
export const SAMPLE_FILES: Record<string, string> = {
  "README.md": "# Test Repo\n\nThis is a test repository.",
  "src/index.ts": 'export const hello = "world";\n',
  "src/utils.ts": "export function add(a: number, b: number) { return a + b; }\n",
  "tsconfig.json": '{"compilerOptions":{"target":"ESNext","module":"ESNext","strict":true}}',
  "package.json": '{"name":"test-repo","version":"1.0.0"}',
};

/** Create a mock Response wrapping a ZIP ArrayBuffer */
export async function buildZipResponse(
  repoName: string,
  branch: string,
  files: Record<string, string> = SAMPLE_FILES,
): Promise<Response> {
  const buf = await buildTestZip(repoName, branch, files);
  return new Response(buf, {
    status: 200,
    headers: { "Content-Type": "application/zip" },
  });
}

/** Create a 404 Response */
export function notFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
