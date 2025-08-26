const { createClient } = require('@supabase/supabase-js');

class RealEstateMCPService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.mcpSecret = process.env.MCP_SERVER_SECRET;
    
    this.supabase = null;
    this.supabaseAdmin = null;
    this.initialize();
  }

  async initialize() {
    try {
      if (!this.supabaseUrl || !this.supabaseAnonKey) {
        throw new Error('Supabase環境変数が設定されていません');
      }

      this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
      this.supabaseAdmin = createClient(this.supabaseUrl, this.supabaseServiceKey);

      console.log('✅ 不動産査定MCPサーバーが初期化されました');
      
    } catch (error) {
      console.error('❌ 不動産査定MCP初期化エラー:', error.message);
      throw error;
    }
  }

  // 不動産査定の実行
  async executeAppraisal(appraisalData) {
    try {
      const {
        address,
        area,
        age,
        purpose,
        name,
        phone,
        email
      } = appraisalData;

      // 査定ロジック（簡易版）
      const basePrice = this.calculateBasePrice(area, age, purpose);
      const marketAdjustment = this.getMarketAdjustment(address);
      const finalPrice = basePrice * marketAdjustment;

      // 査定結果をデータベースに保存
      const result = await this.supabaseAdmin
        .from('appraisals')
        .insert({
          address,
          area,
          age,
          purpose,
          name,
          phone,
          email,
          estimated_price: Math.round(finalPrice),
          appraisal_date: new Date().toISOString(),
          status: 'completed'
        })
        .select();

      if (result.error) {
        throw new Error(`査定結果保存エラー: ${result.error.message}`);
      }

      return {
        success: true,
        appraisal: {
          address,
          area: `${area}㎡`,
          age: `築${age}年`,
          purpose,
          estimatedPrice: `${Math.round(finalPrice).toLocaleString()}万円`,
          priceRange: `${Math.round(finalPrice * 0.8).toLocaleString()}万円 ~ ${Math.round(finalPrice * 1.2).toLocaleString()}万円`,
          appraisalDate: new Date().toISOString(),
          id: result.data[0].id
        }
      };

    } catch (error) {
      console.error('❌ 査定実行エラー:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 基本価格の計算
  calculateBasePrice(area, age, purpose) {
    const basePricePerSqm = 300000; // 30万円/㎡
    const ageFactor = Math.max(0.5, 1 - (age * 0.02)); // 築年数による減価
    const purposeFactor = purpose === '売却' ? 1.0 : 0.9; // 用途による調整

    return area * basePricePerSqm * ageFactor * purposeFactor;
  }

  // 地域による市場調整
  getMarketAdjustment(address) {
    if (address.includes('新宿区')) return 1.3;
    if (address.includes('渋谷区')) return 1.4;
    if (address.includes('港区')) return 1.5;
    if (address.includes('千代田区')) return 1.6;
    return 1.0;
  }

  // 査定履歴の取得
  async getAppraisalHistory(email) {
    try {
      const result = await this.supabase
        .from('appraisals')
        .select('*')
        .eq('email', email)
        .order('appraisal_date', { ascending: false });

      if (result.error) {
        throw new Error(`履歴取得エラー: ${result.error.message}`);
      }

      return {
        success: true,
        history: result.data,
        count: result.data.length
      };

    } catch (error) {
      console.error('❌ 履歴取得エラー:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 市場データの取得
  async getMarketData(area) {
    try {
      // 簡易的な市場データ（実際は外部APIから取得）
      const marketData = {
        area,
        averagePrice: 350000, // 35万円/㎡
        priceTrend: 'up', // up, down, stable
        marketActivity: 'high', // high, medium, low
        lastUpdated: new Date().toISOString()
      };

      return {
        success: true,
        marketData
      };

    } catch (error) {
      console.error('❌ 市場データ取得エラー:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // MCPツールの定義
  getTools() {
    return [
      {
        name: 'execute_real_estate_appraisal',
        description: '不動産の査定を実行します',
        inputSchema: {
          type: 'object',
          properties: {
            address: { type: 'string', description: '物件の住所' },
            area: { type: 'number', description: '面積（㎡）' },
            age: { type: 'number', description: '築年数' },
            purpose: { type: 'string', enum: ['売却', '賃貸'], description: '用途' },
            name: { type: 'string', description: 'お客様の名前' },
            phone: { type: 'string', description: '電話番号' },
            email: { type: 'string', description: 'メールアドレス' }
          },
          required: ['address', 'area', 'age', 'purpose', 'name', 'phone', 'email']
        }
      },
      {
        name: 'get_appraisal_history',
        description: '査定履歴を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'メールアドレス' }
          },
          required: ['email']
        }
      },
      {
        name: 'get_market_data',
        description: '指定エリアの市場データを取得します',
        inputSchema: {
          type: 'object',
          properties: {
            area: { type: 'string', description: 'エリア名' }
          },
          required: ['area']
        }
      }
    ];
  }

  // MCPツールの実行
  async executeTool(toolName, parameters) {
    switch (toolName) {
      case 'execute_real_estate_appraisal':
        return await this.executeAppraisal(parameters);
      
      case 'get_appraisal_history':
        return await this.getAppraisalHistory(parameters.email);
      
      case 'get_market_data':
        return await this.getMarketData(parameters.area);
      
      default:
        return {
          success: false,
          error: `不明なツール: ${toolName}`
        };
    }
  }
}

module.exports = RealEstateMCPService;
