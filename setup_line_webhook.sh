#!/bin/bash

# LINE Developers Console ウェブフック設定自動化スクリプト
echo "🚀 LINE Bot ウェブフック設定を自動化します..."

# 新しいngrok URL
NGROK_URL="https://a3caa54c7f6f.ngrok-free.app"
WEBHOOK_URL="${NGROK_URL}/webhook"

echo "📍 新しいngrok URL: ${NGROK_URL}"
echo "🔗 ウェブフックURL: ${WEBHOOK_URL}"
echo ""
echo "📱 LINE Developers Consoleで以下の設定を行ってください："
echo ""
echo "1. LINE Developers Consoleにアクセス"
echo "   https://developers.line.biz/console/"
echo ""
echo "2. チャネル設定 → Messaging API設定"
echo ""
echo "3. Webhook URLを以下に設定："
echo "   ${WEBHOOK_URL}"
echo ""
echo "4. Webhookの利用を「有効」にする"
echo ""
echo "5. 検証ボタンをクリックして成功することを確認"
echo ""
echo "✅ 設定完了後、LINE Botで「査定開始」と送信してテストしてください！"
echo ""
echo "🔍 現在のngrok URL: ${NGROK_URL}"
