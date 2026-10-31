#!/usr/bin/env bash
# ============================================================
# Winky AI — Автономный запуск оверлей-терминала поверх окон на macOS
# ============================================================

set -e
cd "$(dirname "$0")"

# Активация виртуального окружения Python
if [ -d ".venv" ]; then
  source .venv/bin/activate
elif [ -d "venv" ]; then
  source venv/bin/activate
fi

echo "============================================================"
echo "⚡ Запуск WINKY AI — Quantum Terminal (macOS Overlay on_top)"
echo "============================================================"

exec python3 -m winky.app --terminal
