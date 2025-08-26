#!/bin/bash

echo "🔧 環境変数設定スクリプト"
echo "================================"

# LINE Bot設定
echo "📱 LINE Bot設定..."
echo "LINE_CHANNEL_ACCESS_TOKENを入力してください（新しいトークン）:"
read -r LINE_TOKEN

# 環境変数を設定
export LINE_CHANNEL_ACCESS_TOKEN="+23dzP320Y+Aw7tSavVpbX/r6CKq7J7Mu7+GQNQgBJrM3KfBEnv76NE2dR6SBlh9J+QDYmmR1WOcJ1aczmAo+B9j1Q3TkvKUTcEpsiO2pwoM6yWh2n8mugMVXeLnqaXpArCsIRdIDmKt+pwSqzmyhwdB04t89/1O/w1cDnyilFU="
export LINE_CHANNEL_SECRET="9064c78b1bf3344225b30b883b383b98"
export SUPABASE_URL="https://wiwtfoykkxqplypiwata.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpd3Rmb3lra3hxcGx5cGl3YXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDQ0NDAsImV4cCI6MjA3MTcyMDQ0MH0.VaoJhUeJ3xdxAORcGomTqb2EjA_Zns3G9E8nZ6-l5Nw"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpd3Rmb3lra3hxcGx5cGl3YXRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE0NDQ0MCwiZXhwIjoyMDcxNzIwNDQwfQ.0O4Y475mHup97jVZAkqxnUw-tFaCnz9HekyMTUAP9T0"
export REINFOLIB_API_KEY="5bfc8bb49ed548b1b10009b6f56b7ae3"
export BASE_URL="https://a5c021bf6160.ngrok-free.app"
export MCP_SERVER_SECRET="sbp_cb98b932219a801ade863691adf5f8164254b940"

echo ""
echo "✅ 環境変数が設定されました！"
echo ""
echo "📊 設定内容:"
echo "• LINE_CHANNEL_ACCESS_TOKEN: ${LINE_CHANNEL_ACCESS_TOKEN:0:20}..."
echo "• LINE_CHANNEL_SECRET: ${LINE_CHANNEL_SECRET}"
echo "• SUPABASE_URL: ${SUPABASE_URL}"
echo "• BASE_URL: ${BASE_URL}"
echo "• MCP_SERVER_SECRET: ${MCP_SERVER_SECRET}"
echo ""
echo "🚀 サーバーを起動する準備ができました！"
echo "以下のコマンドでサーバーを起動してください："
echo "node src/index.js"
