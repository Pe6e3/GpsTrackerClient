#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Сборка Vue-клиента"
cd "$ROOT"
npm ci 2>/dev/null || npm install
npm run build

echo "==> Готово: dist/ обновлён"
echo "    https://pe6e3.top/map/"
