#!/bin/sh
# ============================================================
# start.sh — Entrypoint script for Docker deployment
# Credit: abdullah al mamun (@A2MBD3)
# ============================================================

# FIX: Removed "set -e" — with set -e, any non-zero exit (even from a
# harmless mkdir -p on a pre-existing dir on some systems) would abort
# the startup script and the bot would never launch. Using explicit
# error handling instead.

echo "╔═══════════════════════════════════════════════╗"
echo "║  🚀 JavaScript Obfuscator Telegram Bot       ║"
echo "║  👑 Owner: abdullah al mamun (@A2MBD3)       ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

echo "📂 Ensuring required directories exist..."
mkdir -p /app/originals || echo "   ⚠️  Could not create /app/originals (may already exist)"
echo "   ✅ /app/originals"

echo ""
echo "⚙️  Checking environment..."
if [ -z "$BOT_TOKEN" ] || [ "$BOT_TOKEN" = "your_telegram_bot_token_here" ]; then
  echo "   ❌ ERROR: BOT_TOKEN is not set or is the placeholder value."
  echo "   ❌ Set the BOT_TOKEN environment variable and restart."
  exit 1
fi
echo "   ✅ BOT_TOKEN is set"
echo "   ✅ NODE_ENV=${NODE_ENV:-production}"
echo "   ✅ PORT=${PORT:-10000}"
echo "   ✅ OWNER_ID=${OWNER_ID:-8074495633}"

echo ""
echo "🤖 Starting bot..."
exec node src/index.js
