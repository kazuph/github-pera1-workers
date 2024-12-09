# 🎮 Pera1 - Cloudflare Workers Application

## 📝 Overview
This project is a web application built using Cloudflare Workers and the Hono framework. It allows users to download multiple files from a GitHub repository as a single consolidated file. Simply provide a GitHub URL, and the application will fetch and combine all the files for easy download.

## ✨ Features
- 🔗 Accepts GitHub repository URLs
- 📦 Combines multiple files into a single downloadable file
- 🚀 Fast processing using Cloudflare Workers
- 🌐 Accessible from anywhere
- 💨 Lightweight and efficient

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
