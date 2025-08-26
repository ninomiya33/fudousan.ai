const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const RealEstateMCPService = require('./services/realEstateMCP.js');

class RealEstateMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'real-estate-appraisal-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.realEstateService = new RealEstateMCPService();
    this.setupHandlers();
  }

  setupHandlers() {
    // ツール一覧の取得
    this.server.setRequestHandler('tools/list', async () => {
      const tools = this.realEstateService.getTools();
      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // ツールの実行
    this.server.setRequestHandler('tools/call', async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        console.log(`🔧 MCPツール実行: ${name}`, args);
        
        const result = await this.realEstateService.executeTool(name, args);
        
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: this.formatResult(result, name)
              }
            ]
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `❌ エラー: ${result.error}`
              }
            ]
          };
        }
      } catch (error) {
        console.error('❌ MCPツール実行エラー:', error);
        return {
          content: [
            {
              type: 'text',
              text: `❌ システムエラー: ${error.message}`
            }
          ]
        };
      }
    });

    // ヘルスチェック
    this.server.setRequestHandler('ping', async () => {
      return { value: 'pong' };
    });
  }

  // 結果のフォーマット
  formatResult(result, toolName) {
    switch (toolName) {
      case 'execute_real_estate_appraisal':
        const appraisal = result.appraisal;
        return `🏠 不動産査定完了！

📍 物件情報:
• 住所: ${appraisal.address}
• 面積: ${appraisal.area}
• 築年数: ${appraisal.age}
• 用途: ${appraisal.purpose}

💰 査定結果:
• 推定価格: ${appraisal.estimatedPrice}
• 価格帯: ${appraisal.priceRange}
• 査定日: ${new Date(appraisal.appraisalDate).toLocaleDateString('ja-JP')}
• 査定ID: ${appraisal.id}

✅ 査定結果はデータベースに保存されました。`;

      case 'get_appraisal_history':
        const history = result.history;
        if (history.length === 0) {
          return '📋 査定履歴が見つかりませんでした。';
        }
        
        let historyText = `📋 査定履歴 (${history.length}件):\n\n`;
        history.forEach((item, index) => {
          historyText += `${index + 1}. ${item.address} - ${item.estimated_price?.toLocaleString()}万円 (${new Date(item.appraisal_date).toLocaleDateString('ja-JP')})\n`;
        });
        return historyText;

      case 'get_market_data':
        const market = result.marketData;
        return `📊 市場データ: ${market.area}

• 平均価格: ${(market.averagePrice / 10000).toFixed(1)}万円/㎡
• 価格トレンド: ${this.getTrendText(market.priceTrend)}
• 市場活性度: ${this.getActivityText(market.marketActivity)}
• 最終更新: ${new Date(market.lastUpdated).toLocaleDateString('ja-JP')}`;

      default:
        return JSON.stringify(result, null, 2);
    }
  }

  getTrendText(trend) {
    const trends = {
      'up': '📈 上昇傾向',
      'down': '📉 下降傾向',
      'stable': '➡️ 安定'
    };
    return trends[trend] || trend;
  }

  getActivityText(activity) {
    const activities = {
      'high': '🔥 高',
      'medium': '⚡ 中',
      'low': '💤 低'
    };
    return activities[activity] || activity;
  }

  // サーバーの起動
  async start() {
    try {
      console.log('🚀 不動産査定MCPサーバーを起動中...');
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.log('✅ 不動産査定MCPサーバーが起動しました');
      console.log('🔧 利用可能なツール:');
      
      const tools = this.realEstateService.getTools();
      tools.forEach(tool => {
        console.log(`  • ${tool.name}: ${tool.description}`);
      });
      
    } catch (error) {
      console.error('❌ MCPサーバー起動エラー:', error);
      process.exit(1);
    }
  }
}

// サーバーの起動
if (require.main === module) {
  const server = new RealEstateMCPServer();
  server.start();
}

module.exports = RealEstateMCPServer;
