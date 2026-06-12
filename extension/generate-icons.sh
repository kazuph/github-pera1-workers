#!/bin/bash
# Generate extension icons from public/favicon.svg
# Requires rsvg-convert (brew install librsvg)
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v rsvg-convert &> /dev/null; then
  echo "rsvg-convert not found. Install with: brew install librsvg" >&2
  exit 1
fi

for size in 16 32 48 128; do
  rsvg-convert -w "$size" -h "$size" public/favicon.svg -o "extension/icon${size}.png"
  echo "Generated extension/icon${size}.png"
done
