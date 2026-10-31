#!/usr/bin/env bash
# Деплой Wink Trade на VPS: rsync кода + docker compose up.
# Использование: ./deploy.sh [first]   (first — первичная установка, создаст .env)
set -euo pipefail

SERVER="root@2.31.127.199"
REMOTE_DIR="/opt/winktrade"
DOMAIN="winktrade-app.online"
MODE="${1:-update}"

echo ">>> Синхронизация кода на ${SERVER}:${REMOTE_DIR}"
ssh "${SERVER}" "mkdir -p ${REMOTE_DIR}/data"
rsync -az --delete \
    --exclude '.venv' --exclude '.git' --exclude 'winky' --exclude '__pycache__' \
    --exclude '.env' --exclude 'data' --exclude '*.db' --exclude '.DS_Store' \
    --exclude '_test*.py' --exclude '_dev*.py' --exclude 'artifacts' \
    --exclude 'Winky.app' --exclude '*.icns' --exclude '*.command' \
    ./ "${SERVER}:${REMOTE_DIR}/"

if [ "${MODE}" = "first" ]; then
    echo ">>> Первичная установка: генерирую .env (если ещё нет)"
    ssh "${SERVER}" "test -f ${REMOTE_DIR}/.env && echo '.env уже существует — не трогаю' || {
        SECRET=\$(openssl rand -hex 24)
        cat > ${REMOTE_DIR}/.env <<EOF
BOT_TOKEN=PASTE_BOT_TOKEN_HERE
ADMIN_TG_IDS=
WEBAPP_URL=https://${DOMAIN}/webapp/
SUPPORT_USERNAME=winktrade_support
RU_PARTNER_BASE_URL="https://po-ru4.click/register?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START"
EN_PARTNER_BASE_URL="https://u3.shortink.io/register?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START"
PROMO_CODE=50START
CAMPAIGN_ID=wink
PLATFORM_URL="https://po-ru4.click/register?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START"
POSTBACK_SECRET=\${SECRET}
DATABASE_URL=sqlite+aiosqlite:////data/wink_trade.db
TOTAL_COUNTER_THRESHOLD=100
TEASER_HOUR=19
TEASER_MAX_COUNT=7
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
WINKY_LLM_MIN_INTERVAL=8
WINKY_GREET_MIN_INTERVAL=90
EOF
        echo '.env создан (заполните BOT_TOKEN и PARTNER_BASE_URL!)'
    }"
fi

echo ">>> Сборка и запуск"
ssh "${SERVER}" "cd ${REMOTE_DIR} && docker compose up -d --build && docker compose ps"

echo ">>> Готово: https://${DOMAIN}"
