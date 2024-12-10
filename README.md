# 🎮 Pera1 - Cloudflare Workers Application

## 📝 Overview
This project is a web application built using Cloudflare Workers and the Hono framework. It allows users to download multiple files from a GitHub repository as a single consolidated file. Simply provide a GitHub URL, and the application will fetch and combine all the files for easy download.

## ✨ Features
- 🔗 Accepts GitHub repository URLs
- 📦 Combines multiple files into a single downloadable file
- 🚀 Fast processing using Cloudflare Workers
- 🌐 Accessible from anywhere
- 💨 Lightweight and efficient

## 🛠 Usage

### Basic URL Format
```
https://your-worker-domain/github.com/owner/repo
```

### Query Parameters
- `dir`: Filter files by directory paths (comma-separated)
  ```
  ?dir=src/components,tests/unit
  ```
- `ext`: Filter files by extensions (comma-separated)
  ```
  ?ext=ts,tsx,js
  ```
- `mode`: Display mode
  ```
  ?mode=tree  # Shows directory structure only
  ```

### Examples
```
# Show all files in the src directory
https://your-worker-domain/github.com/owner/repo?dir=src

# Show only TypeScript files
https://your-worker-domain/github.com/owner/repo?ext=ts,tsx

# Show directory structure
https://your-worker-domain/github.com/owner/repo?mode=tree

# Combined usage
https://your-worker-domain/github.com/owner/repo?dir=src&ext=ts&mode=tree
```

## 🛠️ Tech Stack
- 🌐 Cloudflare Workers
- ⚡ Hono (Fast Web Framework)
- 📦 JSZip (ZIP file manipulation)
- 🔧 TypeScript

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Deployment
```bash
npm run deploy:workers
```

## 🔧 Development Environment
- Node.js
- npm/pnpm
- wrangler CLI

## 📦 Main Dependencies
- hono: ^4.6.13
- jszip: ^3.10.1
- wrangler: ^3.88.0
