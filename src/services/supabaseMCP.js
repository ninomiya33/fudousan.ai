const { createClient } = require('@supabase/supabase-js');

class SupabaseMCPService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.mcpSecret = process.env.MCP_SERVER_SECRET || 'sbp_cb98b932219a801ade863691adf5f8164254b940';
    
    this.supabase = null;
    this.supabaseAdmin = null;
    this.initialize();
  }

  async initialize() {
    try {
      if (!this.supabaseUrl || !this.supabaseAnonKey) {
        throw new Error('Supabase環境変数が設定されていません');
      }

      // 通常のクライアント（匿名キー）
      this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);

      // サービスロールキーを使用したクライアント（管理者権限）
      if (this.supabaseServiceKey) {
        this.supabaseAdmin = createClient(this.supabaseUrl, this.supabaseServiceKey);
      } else {
        this.supabaseAdmin = this.supabase;
      }

      console.log('✅ Supabase MCP接続が確立されました');
      console.log('🔑 MCP Secret:', this.mcpSecret);
      
    } catch (error) {
      console.error('❌ Supabase MCP接続エラー:', error.message);
      throw error;
    }
  }

  // データベース操作のMCPラッパー
  async query(table, operation, data = null, conditions = {}) {
    try {
      let query = this.supabaseAdmin.from(table);

      switch (operation) {
        case 'select':
          query = query.select(conditions.select || '*');
          if (conditions.where) {
            Object.keys(conditions.where).forEach(key => {
              query = query.eq(key, conditions.where[key]);
            });
          }
          break;

        case 'insert':
          query = query.insert(data);
          break;

        case 'update':
          query = query.update(data);
          if (conditions.where) {
            Object.keys(conditions.where).forEach(key => {
              query = query.eq(key, conditions.where[key]);
            });
          }
          break;

        case 'delete':
          if (conditions.where) {
            Object.keys(conditions.where).forEach(key => {
              query = query.eq(key, conditions.where[key]);
            });
          }
          break;

        default:
          throw new Error(`不明な操作: ${operation}`);
      }

      const result = await query;
      
      if (result.error) {
        throw new Error(`データベース操作エラー: ${result.error.message}`);
      }

      return {
        success: true,
        data: result.data,
        count: result.count,
        operation,
        table
      };

    } catch (error) {
      console.error(`❌ MCP ${operation} エラー:`, error.message);
      return {
        success: false,
        error: error.message,
        operation,
        table
      };
    }
  }

  // ストレージ操作のMCPラッパー
  async storage(bucket, operation, data = null, options = {}) {
    try {
      let result;

      switch (operation) {
        case 'upload':
          result = await this.supabaseAdmin.storage
            .from(bucket)
            .upload(options.path, data, options.uploadOptions);
          break;

        case 'download':
          result = await this.supabaseAdmin.storage
            .from(bucket)
            .download(options.path);
          break;

        case 'getPublicUrl':
          result = await this.supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(options.path);
          break;

        case 'remove':
          result = await this.supabaseAdmin.storage
            .from(bucket)
            .remove(options.paths || []);
          break;

        case 'list':
          result = await this.supabaseAdmin.storage
            .from(bucket)
            .list(options.path, options.listOptions);
          break;

        default:
          throw new Error(`不明なストレージ操作: ${operation}`);
      }

      if (result.error) {
        throw new Error(`ストレージ操作エラー: ${result.error.message}`);
      }

      return {
        success: true,
        data: result.data,
        operation,
        bucket
      };

    } catch (error) {
      console.error(`❌ MCP ストレージ ${operation} エラー:`, error.message);
      return {
        success: false,
        error: error.message,
        operation,
        bucket
      };
    }
  }

  // リアルタイム接続のMCPラッパー
  async realtime(channel, event, callback) {
    try {
      const subscription = this.supabase
        .channel(channel)
        .on(event, callback)
        .subscribe();

      return {
        success: true,
        subscription,
        channel,
        event
      };

    } catch (error) {
      console.error(`❌ MCP リアルタイム接続エラー:`, error.message);
      return {
        success: false,
        error: error.message,
        channel,
        event
      };
    }
  }

  // 接続状態の確認
  async healthCheck() {
    try {
      const { data, error } = await this.supabase
        .from('properties')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      return {
        success: true,
        status: 'connected',
        timestamp: new Date().toISOString(),
        mcpSecret: this.mcpSecret
      };

    } catch (error) {
      return {
        success: false,
        status: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = SupabaseMCPService;
