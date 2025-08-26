const SupabaseMCPService = require('./src/services/supabaseMCP');

async function testMCPConnection() {
  console.log('🧪 Supabase MCP接続テストを開始...');
  
  try {
    // 環境変数を設定
    process.env.SUPABASE_URL = 'https://wiwtfoykkxqplypiwata.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpd3Rmb3lra3hxcGx5cGl3YXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDQ0NDAsImV4cCI6MjA3MTcyMDQ0MH0.VaoJhUeJ3xdxAORcGomTqb2EjA_Zns3G9E8nZ6-l5Nw';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpd3Rmb3lra3hxcGx5cGl3YXRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE0NDQ0MCwiZXhwIjoyMDcxNzIwNDQwfQ.0O4Y475mHup97jVZAkqxnUw-tFaCnz9HekyMTUAP9T0';
    process.env.MCP_SERVER_SECRET = 'sbp_cb98b932219a801ade863691adf5f8164254b940';

    // MCPサービスを初期化
    const mcpService = new SupabaseMCPService();
    
    // 接続テスト
    console.log('🔍 接続状態を確認中...');
    const healthCheck = await mcpService.healthCheck();
    console.log('📊 ヘルスチェック結果:', healthCheck);

    if (healthCheck.success) {
      console.log('✅ MCP接続が成功しました！');
      
      // データベース操作テスト
      console.log('🧪 データベース操作テスト...');
      
      // プロパティテーブルの件数を取得
      const countResult = await mcpService.query('properties', 'select', null, {
        select: 'count',
        where: {}
      });
      console.log('📊 プロパティ件数:', countResult);

      // オーナーテーブルの件数を取得
      const ownersResult = await mcpService.query('owners', 'select', null, {
        select: 'count',
        where: {}
      });
      console.log('👥 オーナー件数:', ownersResult);

    } else {
      console.error('❌ MCP接続に失敗しました:', healthCheck.error);
    }

  } catch (error) {
    console.error('❌ MCPテストエラー:', error.message);
  }
}

// テスト実行
testMCPConnection();
