# 🎮 Pera1 - Cloudflare Workers Application

## 📝 Overview
This project is a web application built using Cloudflare Workers and the Hono framework. It allows users to fetch and view code from GitHub repositories directly in their browser, consolidated into a single page. It supports filtering by directory and extension, viewing specific branches or single files, and even provides a directory tree view.

## ✨ Features
- 🔗 Accepts various GitHub repository URL formats (including `/tree/` and `/blob/` paths).
- 🌳 Automatically extracts branch, directory, and file information from the URL path.
- 📂 Filters files by directory paths and extensions using query parameters (`dir`, `ext`).
- 🎯 Displays a specific single file using the `file` query parameter or `/blob/` URL path.
- 🌲 Offers a "Tree Mode" (`mode=tree`) to show only the directory structure and README files.
- 💾 Handles large files by truncating content over 30KB and indicating the truncation.
- 🚫 Skips binary files, lock files, and certain generated files (like `.js` in TS projects) for a cleaner view.
- ✨ Includes a custom favicon (`favicon.svg`).
- 🚀 Fast processing using Cloudflare Workers.
- 🌐 Accessible from anywhere.
- 💨 Lightweight and efficient.

## 🛠 Usage

### URL Formats
The application interprets GitHub URLs provided in the path after your worker domain. Query parameters can be used for further customization and override information extracted from the path.

**Base URL:** `https://your-worker-domain/`

**Supported Path Formats:**

1.  **Repository Root (Default Branch):**
    ```
    https://your-worker-domain/github.com/owner/repo
    ```
    *(Attempts `main` branch, then `master`)*

2.  **Specific Branch (Tree View):**
    ```
    https://your-worker-domain/github.com/owner/repo/tree/branch-name
    ```

3.  **Directory within a Branch (Tree View):**
    ```
    https://your-worker-domain/github.com/owner/repo/tree/branch-name/path/to/dir
    ```
    *(Implicitly sets `dir=path/to/dir`)*

4.  **Single File (Blob View):**
    ```
    https://your-worker-domain/github.com/owner/repo/blob/branch-name/path/to/file.ext
    ```
    *(Implicitly sets `file=path/to/file.ext`)*

5.  **Directory in Default Branch:**
    ```
    https://your-worker-domain/github.com/owner/repo/path/to/dir
    ```
    *(Attempts `main`/`master`, implicitly sets `dir=path/to/dir`)*

### Query Parameters
Append these to the URL to customize the output. Query parameters override values derived from the URL path (e.g., `?branch=...` overrides the branch from `/tree/...`).

-   `dir`: Filter files by directory paths (comma-separated).
    ```
    ?dir=src/components,tests/unit
    ```
-   `ext`: Filter files by extensions (comma-separated, without dots).
    ```
    ?ext=ts,tsx,js
    ```
-   `mode`: Display mode.
    ```
    ?mode=tree  # Shows directory structure and READMEs only
    ```
-   `branch`: Specify the repository branch. Overrides branch from URL path.
    ```
    ?branch=develop
    ```
-   `file`: Specify a single file to display. Overrides file from URL path.
    ```
    ?file=src/index.js
    ```

### Examples

```
# Show all files in the 'main' branch of kazuph/github-pera1-workers
https://your-worker-domain/github.com/kazuph/github-pera1-workers

# Show files in the 'src' directory of the 'develop' branch
https://your-worker-domain/github.com/owner/repo/tree/develop/src
# OR
https://your-worker-domain/github.com/owner/repo?branch=develop&dir=src

# Show only TypeScript files in the 'src' directory
https://your-worker-domain/github.com/owner/repo?dir=src&ext=ts,tsx

# Show the directory structure and READMEs only
https://your-worker-domain/github.com/owner/repo?mode=tree

# Show a single file from the 'feat/new-ui' branch
https://your-worker-domain/github.com/owner/repo/blob/feat/new-ui/components/Button.jsx
# OR
https://your-worker-domain/github.com/owner/repo?branch=feat/new-ui&file=components/Button.jsx
```

## 🛠️ Tech Stack
- 🌐 Cloudflare Workers
- ⚡ Hono (Fast Web Framework)
- 📦 JSZip (ZIP file manipulation)
- 🔧 TypeScript

## 🚀 Getting Started

### Prerequisites
- Node.js (check `.nvmrc` if using nvm)
- pnpm (or npm/yarn)
- Wrangler CLI (`pnpm install -g wrangler` or `npm install -g wrangler`)

### Installation
```bash
pnpm install
# or npm install / yarn install
```

### Start Development Server
```bash
pnpm dev
# or npm run dev / yarn dev
```
This will start a local server using `wrangler dev`.

### Deployment
```bash
pnpm deploy
# or npm run deploy / yarn deploy
```
This command (defined in `package.json`) runs `wrangler deploy`.

## 🔧 Development Environment
- Node.js
- pnpm (recommended)
- wrangler CLI

## 📦 Main Dependencies
(See `package.json` for exact versions)
- hono
- jszip
- wrangler (dev dependency)
- typescript (dev dependency)
- @cloudflare/workers-types (dev dependency)
