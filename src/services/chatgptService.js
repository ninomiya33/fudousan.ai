const axios = require('axios');

class ChatGPTService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1';
    
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured');
    }
  }

  // 査定結果の詳細説明生成
  async generateAppraisalExplanation(appraisalData, propertyData) {
    try {
      if (!this.apiKey) {
        return this.getMockExplanation(appraisalData, propertyData);
      }

      const prompt = this.createAppraisalPrompt(appraisalData, propertyData);
      
      const response = await axios.post(`${this.apiUrl}/chat/completions`, {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたは不動産査定の専門家です。査定結果を分かりやすく説明し、物件の価値や特徴を詳しく分析してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        explanation: response.data.choices[0].message.content,
        model: response.data.model,
        usage: response.data.usage
      };

    } catch (error) {
      console.error('ChatGPT API error:', error);
      return this.getMockExplanation(appraisalData, propertyData);
    }
  }

  // 査定結果の改善提案生成
  async generateImprovementSuggestions(propertyData, currentAppraisal) {
    try {
      if (!this.apiKey) {
        return this.getMockImprovementSuggestions(propertyData, currentAppraisal);
      }

      const prompt = this.createImprovementPrompt(propertyData, currentAppraisal);
      
      const response = await axios.post(`${this.apiUrl}/chat/completions`, {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたは不動産の価値を向上させる専門家です。物件の価値を高めるための具体的な改善提案をしてください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.8
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        suggestions: response.data.choices[0].message.content,
        model: response.data.model,
        usage: response.data.usage
      };

    } catch (error) {
      console.error('ChatGPT improvement suggestions error:', error);
      return this.getMockImprovementSuggestions(propertyData, currentAppraisal);
    }
  }

  // 市場分析レポート生成
  async generateMarketAnalysis(address, propertyType) {
    try {
      if (!this.apiKey) {
        return this.getMockMarketAnalysis(address, propertyType);
      }

      const prompt = `以下の物件について、市場分析レポートを作成してください：

物件所在地: ${address}
物件種別: ${propertyType}

以下の観点から分析してください：
1. 立地の特徴と利便性
2. 市場動向と価格トレンド
3. 投資価値の評価
4. 将来性とリスク要因
5. 購入・売却のタイミング

専門的で分かりやすい分析をお願いします。`;

      const response = await axios.post(`${this.apiUrl}/chat/completions`, {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたは不動産市場分析の専門家です。地域の市場動向と物件の投資価値を詳しく分析してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.6
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        analysis: response.data.choices[0].message.content,
        model: response.data.model,
        usage: response.data.usage
      };

    } catch (error) {
      console.error('ChatGPT market analysis error:', error);
      return this.getMockMarketAnalysis(address, propertyType);
    }
  }

  // カスタマーサポート応答生成
  async generateCustomerSupportResponse(userQuestion, context) {
    try {
      if (!this.apiKey) {
        return this.getMockCustomerSupportResponse(userQuestion, context);
      }

      const prompt = `以下の不動産査定に関する質問に、専門的で親切に回答してください：

質問: ${userQuestion}
コンテキスト: ${context}

不動産査定の専門家として、分かりやすく丁寧に説明してください。`;

      const response = await axios.post(`${this.apiUrl}/chat/completions`, {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたは不動産査定の専門家で、カスタマーサポートの担当者です。親切で分かりやすい回答を心がけてください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        response: response.data.choices[0].message.content,
        model: response.data.model,
        usage: response.data.usage
      };

    } catch (error) {
      console.error('ChatGPT customer support error:', error);
      return this.getMockCustomerSupportResponse(userQuestion, context);
    }
  }

  // 査定プロンプトの作成
  createAppraisalPrompt(appraisalData, propertyData) {
    return `以下の査定結果について、詳細な説明を生成してください：

物件情報:
- 住所: ${propertyData.address}
- 面積: ${propertyData.area}㎡
- 築年: ${propertyData.age}年
- 用途: ${propertyData.purpose}

査定結果:
- 価格レンジ: ${appraisalData.price_range}
- 信頼度: ${appraisalData.confidence}
- 近傍件数: ${appraisalData.nearby_count}件
- 分析半径: ${appraisalData.radius_km}km
- 分析期間: ${appraisalData.period_months}ヶ月

以下の観点から詳しく説明してください：
1. 査定価格の根拠
2. 物件の特徴と価値
3. 立地の優位性
4. 市場での位置づけ
5. 今後の価値変動の見通し

専門的で分かりやすい説明をお願いします。`;
  }

  // 改善提案プロンプトの作成
  createImprovementPrompt(propertyData, currentAppraisal) {
    return `以下の物件の価値を向上させるための改善提案を生成してください：

物件情報:
- 住所: ${propertyData.address}
- 面積: ${propertyData.area}㎡
- 築年: ${propertyData.age}年
- 用途: ${propertyData.purpose}
- 現在の査定価格: ${currentAppraisal.price_range}

以下の観点から具体的な改善提案をしてください：
1. リフォーム・リノベーション提案
2. 設備・機能の改善案
3. 外観・内装の改善案
4. 投資対効果の高い改善案
5. 実施の優先順位

実現可能で効果的な提案をお願いします。`;
  }

  // モック査定説明（API keyがない場合）
  getMockExplanation(appraisalData, propertyData) {
    return {
      success: true,
      explanation: `物件「${propertyData.address}」の査定結果について説明いたします。

現在の査定価格は${appraisalData.price_range}となっており、信頼度は${appraisalData.confidence}です。

この価格は、近傍${appraisalData.nearby_count}件の取引実績と、${appraisalData.radius_km}km圏内の市場動向を分析して算出されています。

物件の特徴として、${propertyData.area}㎡の広さと${propertyData.age}年の築年は、この地域の平均的な物件と比較して適正な価格帯に位置しています。

今後の市場動向を考慮すると、安定した価値を維持できる物件と評価できます。

※これはモックデータです。実際の査定には専門家の判断が必要です。`,
      model: 'mock-gpt-4',
      usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 }
    };
  }

  // モック改善提案
  getMockImprovementSuggestions(propertyData, currentAppraisal) {
    return {
      success: true,
      suggestions: `物件「${propertyData.address}」の価値向上のための改善提案です：

1. **内装リフォーム** (投資対効果: 高)
   - キッチンの更新: 約50-100万円
   - 浴室のリニューアル: 約30-80万円

2. **設備の更新** (投資対効果: 中)
   - エアコンの設置: 約20-40万円
   - 照明のLED化: 約10-20万円

3. **外観の改善** (投資対効果: 中)
   - 外壁の塗装: 約30-60万円
   - 玄関の改装: 約20-40万円

これらの改善により、査定価格を10-20%向上させることが期待できます。

※これはモックデータです。実際の改善提案には専門家の判断が必要です。`,
      model: 'mock-gpt-4',
      usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 }
    };
  }

  // モック市場分析
  getMockMarketAnalysis(address, propertyType) {
    return {
      success: true,
      analysis: `物件「${address}」の市場分析レポートです：

**立地の特徴と利便性**
この地域は交通アクセスが良好で、商業施設も充実しています。

**市場動向と価格トレンド**
現在の市場は安定しており、価格は緩やかに上昇傾向にあります。

**投資価値の評価**
長期投資として適した物件で、安定した収益が期待できます。

**将来性とリスク要因**
地域の開発計画により、将来的な価値向上が期待されます。

**購入・売却のタイミング**
現在は購入に適した時期と判断されます。

※これはモックデータです。実際の市場分析には専門家の判断が必要です。`,
      model: 'mock-gpt-4',
      usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 }
    };
  }

  // モックカスタマーサポート
  getMockCustomerSupportResponse(userQuestion, context) {
    return {
      success: true,
      response: `ご質問「${userQuestion}」についてお答えいたします。

不動産査定に関するご質問ですね。専門的な内容ですので、詳しくご説明いたします。

${context ? `コンテキスト: ${context}` : ''}

より具体的なアドバイスが必要でしたら、お気軽にお声かけください。

※これはモックデータです。実際のサポートには専門家の判断が必要です。`,
      model: 'mock-gpt-4',
      usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 }
    };
  }

  // API使用量の確認
  async getUsageStats() {
    try {
      if (!this.apiKey) {
        return { success: false, error: 'API key not configured' };
      }

      const response = await axios.get(`${this.apiUrl}/usage`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        success: true,
        usage: response.data
      };

    } catch (error) {
      console.error('Get usage stats error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ChatGPTService();
