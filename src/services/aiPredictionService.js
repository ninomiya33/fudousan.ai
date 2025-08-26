const axios = require('axios');

class AIPredictionService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';
    
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured, using mock predictions');
    }
  }

  // 価格予測の実行
  async predictPrice({ address, area, age, purpose, nearby_data, correction_result }) {
    try {
      console.log('🤖 AI予測開始:', { address, area, age, purpose, nearby_data, correction_result });
      
      // API keyの確認
      if (!this.apiKey) {
        console.log('AI予測 - API keyが設定されていません。モック予測を使用します。');
        const correctedData = nearby_data || [];
        return this.getMockPrediction(correctedData, purpose);
      }
      
      // 入力データの検証
      if (!address || !area || !age || !purpose) {
        throw new Error('必須パラメータが不足しています');
      }
      
      // correctedDataの準備と検証
      let correctedData = nearby_data || [];
      
      if (!Array.isArray(correctedData)) {
        console.warn('AI予測 - nearby_dataが配列ではありません。空の配列を使用します:', correctedData);
        correctedData = [];
      }
      
      console.log('🔍 AI予測 - 使用するデータ:', { 
        correctedDataLength: correctedData.length, 
        correctedDataType: typeof correctedData,
        isArray: Array.isArray(correctedData)
      });
      
      // データの特徴量を抽出
      console.log('🔍 AI予測 - 特徴量抽出開始');
      const features = this.extractFeatures(correctedData, purpose);
      console.log('🔍 AI予測 - 特徴量抽出完了:', features);
      
      // AIモデルに送信するデータを準備
      const predictionData = {
        features: features,
        market_context: this.getMarketContext(correctedData),
        purpose: purpose
      };
      console.log('🔍 AI予測 - 予測データ準備完了:', predictionData);

      // OpenAI APIで予測
      console.log('🔍 AI予測 - OpenAI API呼び出し開始');
      const response = await axios.post(`${this.apiUrl}/chat/completions`, {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたは不動産査定の専門家です。与えられたデータに基づいて、適切な価格予測を行ってください。'
          },
          {
            role: 'user',
            content: `以下の不動産データに基づいて価格予測を行ってください：\n${JSON.stringify(predictionData, null, 2)}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 AI予測 - OpenAI API応答受信:', response.data);

      // レスポンスを解析
      const aiResponse = response.data.choices[0].message.content;
      console.log('🔍 AI予測 - AI応答:', aiResponse);
      
      const result = this.parseAIResponse(aiResponse, correctedData);
      console.log('🔍 AI予測 - 解析結果:', result);
      
      return {
        success: true,
        ...result
      };

    } catch (error) {
      console.error('AI prediction error:', error);
      console.error('AI prediction error stack:', error.stack);
      const fallbackData = nearby_data || [];
      return this.getMockPrediction(fallbackData, purpose);
    }
  }

  // 特徴量の抽出
  extractFeatures(correctedData, purpose) {
    console.log('🔍 AI予測 - 入力データ:', { correctedData, purpose, type: typeof correctedData, isArray: Array.isArray(correctedData) });
    
    if (!correctedData) {
      console.warn('AI予測 - correctedDataが未定義です');
      return {};
    }
    
    if (!Array.isArray(correctedData)) {
      console.warn('AI予測 - correctedDataが配列ではありません:', correctedData);
      // 配列でない場合は空の配列として扱う
      correctedData = [];
    }
    
    if (correctedData.length === 0) {
      console.warn('AI予測 - correctedDataが空の配列です');
      return {};
    }

    const prices = correctedData.map(item => item.corrected_price || item.price);
    const areas = correctedData.map(item => item.area);
    const ages = correctedData.map(item => item.age);
    const distances = correctedData.map(item => item.distance_km || item.distance || 0);

    // 統計量の計算
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const priceStd = Math.sqrt(prices.reduce((sq, n) => sq + Math.pow(n - avgPrice, 2), 0) / prices.length);
    const avgArea = areas.reduce((a, b) => a + b, 0) / areas.length;
    const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;

    // 市場の特徴
    const marketFeatures = {
      price_trend: this.calculatePriceTrend(correctedData),
      volume_trend: this.calculateVolumeTrend(correctedData),
      location_premium: this.calculateLocationPremium(distances),
      age_depreciation: this.calculateAgeDepreciation(ages),
      area_efficiency: this.calculateAreaEfficiency(areas, prices)
    };

    return {
      statistical: {
        avg_price: avgPrice,
        price_std: priceStd,
        avg_area: avgArea,
        avg_age: avgAge,
        avg_distance: avgDistance,
        sample_count: correctedData.length
      },
      market: marketFeatures,
      purpose_specific: this.getPurposeSpecificFeatures(purpose, correctedData)
    };
  }

  // 価格トレンドの計算
  calculatePriceTrend(data) {
    try {
      console.log('📊 価格トレンド計算開始:', { data, type: typeof data, isArray: Array.isArray(data) });
      
      if (!data || !Array.isArray(data)) {
        console.warn('価格トレンド計算 - データが無効です:', data);
        return 'stable';
      }
      
      if (data.length < 2) {
        console.log('価格トレンド計算 - データが不足しています（2件未満）');
        return 'stable';
      }
      
      // 取引日でソート（取引日がない場合は距離でソート）
      let sortedData;
      if (data[0].transaction_date) {
        sortedData = data.sort((a, b) => 
          new Date(a.transaction_date) - new Date(b.transaction_date)
        );
      } else {
        sortedData = data.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }
      
      const recentPrices = sortedData.slice(-Math.min(5, sortedData.length)).map(item => item.corrected_price || item.price);
      const olderPrices = sortedData.slice(0, Math.min(5, sortedData.length)).map(item => item.corrected_price || item.price);
      
      const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
      const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
      
      const changeRate = (recentAvg - olderAvg) / olderAvg;
      console.log('📈 価格変動率:', { recentAvg, olderAvg, changeRate });
      
      if (changeRate > 0.05) return 'rising';
      if (changeRate < -0.05) return 'declining';
      return 'stable';
      
    } catch (error) {
      console.error('価格トレンド計算エラー:', error);
      return 'stable';
    }
  }

  // 取引量トレンドの計算
  calculateVolumeTrend(data) {
    if (data.length < 10) return 'medium';
    
    const monthlyCounts = {};
    data.forEach(item => {
      const month = item.transaction_date.substring(0, 7); // YYYY-MM
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    });
    
    const counts = Object.values(monthlyCounts);
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    
    if (avgCount > 5) return 'high';
    if (avgCount < 2) return 'low';
    return 'medium';
  }

  // 立地プレミアムの計算
  calculateLocationPremium(distances) {
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    
    if (avgDistance < 0.3) return 'high';
    if (avgDistance < 0.6) return 'medium';
    return 'low';
  }

  // 築年減価の計算
  calculateAgeDepreciation(ages) {
    const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;
    
    if (avgAge < 5) return 'low';
    if (avgAge < 15) return 'medium';
    return 'high';
  }

  // 面積効率の計算
  calculateAreaEfficiency(areas, prices) {
    const efficiencies = areas.map((area, index) => prices[index] / area);
    const avgEfficiency = efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
    
    if (avgEfficiency > 800000) return 'high';
    if (avgEfficiency > 500000) return 'medium';
    return 'low';
  }

  // 用途別特徴量
  getPurposeSpecificFeatures(purpose, data) {
    const features = {};
    
    switch (purpose) {
      case '住宅':
        features.residential_factors = this.getResidentialFactors(data);
        break;
      case '店舗':
        features.commercial_factors = this.getCommercialFactors(data);
        break;
      case '事務所':
        features.office_factors = this.getOfficeFactors(data);
        break;
      default:
        features.general_factors = this.getGeneralFactors(data);
    }
    
    return features;
  }

  // 住宅用特徴量
  getResidentialFactors(data) {
    if (!Array.isArray(data)) {
      console.warn('getResidentialFactors: dataが配列ではありません:', data);
      data = [];
    }
    return {
      family_friendly: this.calculateFamilyFriendliness(data),
      accessibility: this.calculateAccessibility(data),
      quietness: this.calculateQuietness(data)
    };
  }

  // ファミリー向け指数
  calculateFamilyFriendliness(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return 'medium';
    // 面積が広い物件が多いかどうか
    const largeProperties = data.filter(prop => prop.area > 70);
    return largeProperties.length > data.length / 2 ? 'high' : 'medium';
  }

  // アクセス性
  calculateAccessibility(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return 'medium';
    // 距離が近い物件が多いかどうか
    const nearProperties = data.filter(prop => prop.distance < 0.5);
    return nearProperties.length > data.length / 2 ? 'high' : 'medium';
  }

  // 静かさ
  calculateQuietness(data) {
    // 一般的な住宅地として中程度と仮定
    return 'medium';
  }

  // 歩行者通行量
  calculateFootTraffic(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return 'medium';
    const nearProperties = data.filter(prop => prop.distance < 0.3);
    return nearProperties.length > data.length / 2 ? 'high' : 'medium';
  }

  // 駐車場の利用可能性
  calculateParkingAvailability(data) {
    return 'medium';
  }

  // 商業地域の特性
  calculateCommercialZone(data) {
    return 'medium';
  }

  // ビジネスアクセス性
  calculateBusinessAccessibility(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return 'medium';
    const nearProperties = data.filter(prop => prop.distance < 0.5);
    return nearProperties.length > data.length / 2 ? 'high' : 'medium';
  }

  // 駐車場容量
  calculateParkingCapacity(data) {
    return 'medium';
  }

  // オフィス集中度
  calculateOfficeConcentration(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return 'low';
    const officeProperties = data.filter(prop => 
      prop.property_type === 'office' || prop.purpose === '事務所'
    );
    return officeProperties.length > data.length / 3 ? 'high' : 'medium';
  }

  // 一般的な要因
  getGeneralFactors(data) {
    if (!Array.isArray(data)) {
      console.warn('getGeneralFactors: dataが配列ではありません:', data);
      data = [];
    }
    return {
      location_quality: this.calculateLocationQuality(data),
      market_activity: this.calculateMarketActivity(data),
      growth_potential: this.calculateGrowthPotential(data)
    };
  }

  // 立地品質
  calculateLocationQuality(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return 'medium';
    const avgPrice = data.reduce((sum, prop) => sum + (prop.price || 0), 0) / data.length;
    return avgPrice > 40000000 ? 'high' : 'medium';
  }

  // 市場活動
  calculateMarketActivity(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return 'low';
    return data.length > 5 ? 'high' : 'medium';
  }

  // 成長ポテンシャル
  calculateGrowthPotential(data) {
    return 'medium';
  }

  // 店舗用特徴量
  getCommercialFactors(data) {
    if (!Array.isArray(data)) {
      console.warn('getCommercialFactors: dataが配列ではありません:', data);
      data = [];
    }
    return {
      foot_traffic: this.calculateFootTraffic(data),
      parking_availability: this.calculateParkingAvailability(data),
      commercial_zone: this.calculateCommercialZone(data)
    };
  }

  // 事務所用特徴量
  getOfficeFactors(data) {
    if (!Array.isArray(data)) {
      console.warn('getOfficeFactors: dataが配列ではありません:', data);
      data = [];
    }
    return {
      business_accessibility: this.calculateBusinessAccessibility(data),
      parking_capacity: this.calculateParkingCapacity(data),
      office_concentration: this.calculateOfficeConcentration(data)
    };
  }

  // 市場コンテキストの取得
  getMarketContext(data) {
    return {
      current_market_phase: this.determineMarketPhase(data),
      seasonal_factors: this.getSeasonalFactors(data),
      economic_indicators: this.getEconomicIndicators()
    };
  }

  // 市場フェーズの判定
  determineMarketPhase(data) {
    const priceTrend = this.calculatePriceTrend(data);
    const volumeTrend = this.calculateVolumeTrend(data);
    
    if (priceTrend === 'rising' && volumeTrend === 'high') return 'expansion';
    if (priceTrend === 'stable' && volumeTrend === 'medium') return 'mature';
    if (priceTrend === 'declining' && volumeTrend === 'low') return 'contraction';
    return 'transition';
  }

  // 季節要因の取得
  getSeasonalFactors(data) {
    const currentMonth = new Date().getMonth();
    
    // 不動産市場の季節性（春・秋が活発）
    if (currentMonth >= 2 && currentMonth <= 5) return 'spring_peak';
    if (currentMonth >= 8 && currentMonth <= 11) return 'autumn_peak';
    return 'off_peak';
  }

  // 経済指標の取得
  getEconomicIndicators() {
    // 実際の実装では外部APIから取得
    return {
      interest_rate: 0.5, // 0.5%
      gdp_growth: 0.02,  // 2%
      inflation_rate: 0.01, // 1%
      unemployment_rate: 0.025 // 2.5%
    };
  }

  // AIレスポンスの解析
  parseAIResponse(aiResponse, correctedData) {
    try {
      // AIの応答から数値を抽出する試み
      const priceMatch = aiResponse.match(/(\d+(?:,\d+)*)万円/);
      const confidenceMatch = aiResponse.match(/信頼度[：:]\s*(\d+(?:\.\d+)?)/);
      
      const basePrice = priceMatch ? 
        parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : 
        this.calculateBasePrice(correctedData);
      
      const confidence = confidenceMatch ? 
        parseFloat(confidenceMatch[1]) : 
        0.8;

      return {
        success: true,
        min_price: Math.round(basePrice * 0.9),
        max_price: Math.round(basePrice * 1.1),
        confidence: confidence,
        features: this.extractFeaturesFromAI(aiResponse),
        reasoning: aiResponse
      };
    } catch (error) {
      console.error('AI response parsing error:', error);
      return this.getMockPrediction([], '住宅');
    }
  }

  // AI応答から特徴を抽出
  extractFeaturesFromAI(aiResponse) {
    const features = [];
    
    // 一般的な特徴を検索
    const commonFeatures = [
      '駅徒歩', '南向き', '角地', '駐車場', 'バルコニー',
      'エレベーター', '管理費', 'ペット', '即入居', 'リフォーム'
    ];
    
    commonFeatures.forEach(feature => {
      if (aiResponse.includes(feature)) {
        features.push(feature);
      }
    });
    
    return features.slice(0, 5);
  }

  // ベース価格の計算
  calculateBasePrice(correctedData) {
    if (!correctedData || !Array.isArray(correctedData) || correctedData.length === 0) {
      return 30000000; // 3,000万円（デフォルト）
    }
    
    try {
      const prices = correctedData.map(item => item.corrected_price || item.price || 0);
      const validPrices = prices.filter(price => price > 0);
      
      if (validPrices.length === 0) {
        return 30000000; // 3,000万円（デフォルト）
      }
      
      return validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    } catch (error) {
      console.error('ベース価格計算エラー:', error);
      return 30000000; // 3,000万円（デフォルト）
    }
  }

  // モック予測（API keyがない場合）
  getMockPrediction(correctedData, purpose) {
    try {
      console.log('🎭 モック予測開始:', { correctedData, purpose });
      
      const basePrice = this.calculateBasePrice(correctedData);
      console.log('💰 ベース価格:', basePrice);
      
      const marketTrend = this.calculatePriceTrend(correctedData);
      console.log('📈 市場トレンド:', marketTrend);
      
      let adjustment = 1.0;
      if (marketTrend === 'rising') adjustment = 1.05;
      if (marketTrend === 'declining') adjustment = 0.95;
      
      const adjustedPrice = basePrice * adjustment;
      console.log('🔧 調整後価格:', adjustedPrice);
      
      return {
        success: true,
        min_price: Math.round(adjustedPrice * 0.9),
        max_price: Math.round(adjustedPrice * 1.1),
        confidence: 0.8 + (Math.random() * 0.15), // 0.8-0.95
        features: this.getMockFeatures(purpose),
        reasoning: 'モックデータに基づく予測です。実際の査定には専門家の判断が必要です。'
      };
    } catch (error) {
      console.error('モック予測エラー:', error);
      // エラーの場合は基本的な予測を返す
      return {
        success: true,
        min_price: 25000000, // 2,500万円
        max_price: 35000000, // 3,500万円
        confidence: 0.7,
        features: ['基本的な査定'],
        reasoning: 'エラーが発生したため、基本的な予測を返しています。'
      };
    }
  }

  // モック特徴
  getMockFeatures(purpose) {
    const allFeatures = [
      '駅徒歩5分以内', '南向き', '角地', '駐車場あり', 'バルコニー',
      'エレベーター', '管理費安い', 'ペット可', '即入居可', 'リフォーム済み'
    ];
    
    const featureCount = 3 + Math.floor(Math.random() * 3); // 3-5個
    const shuffled = allFeatures.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, featureCount);
  }

  // 信憑性の高い詳細査定結果の生成
  formatDetailedAppraisalResult(appraisalData, nearbyData, aiPrediction) {
    const result = {
      summary: this.generateSummary(appraisalData),
      detailed_analysis: this.generateDetailedAnalysis(nearbyData, aiPrediction),
      confidence_report: this.generateConfidenceReport(nearbyData, aiPrediction),
      market_insights: this.generateMarketInsights(nearbyData),
      recommendations: this.generateRecommendations(appraisalData, nearbyData)
    };

    return result;
  }

  // 詳細分析の生成
  generateDetailedAnalysis(nearbyData, aiPrediction) {
    const analysis = {
      data_quality: {
        total_properties: nearbyData.length,
        valid_properties: nearbyData.filter(p => p.price > 0 && p.area > 0).length,
        data_completeness: this.calculateDataCompleteness(nearbyData),
        geographic_coverage: this.assessGeographicCoverage(nearbyData)
      },
      statistical_insights: {
        price_distribution: this.analyzePriceDistribution(nearbyData),
        area_analysis: this.analyzeAreaAnalysis(nearbyData),
        age_impact: this.analyzeAgeImpact(nearbyData),
        market_volatility: this.calculateMarketVolatility(nearbyData)
      },
      comparative_analysis: {
        price_per_sqm_trend: this.analyzePricePerSqmTrend(nearbyData),
        market_positioning: this.analyzeMarketPositioning(nearbyData),
        competitive_analysis: this.performCompetitiveAnalysis(nearbyData)
      }
    };

    return analysis;
  }

  // 信頼性レポートの生成
  generateConfidenceReport(nearbyData, aiPrediction) {
    const confidenceFactors = [
      {
        factor: 'データ量',
        score: this.calculateDataVolumeScore(nearbyData.length),
        description: this.getDataVolumeDescription(nearbyData.length),
        impact: '高'
      },
      {
        factor: 'データ品質',
        score: this.calculateDataQualityScore(nearbyData),
        description: this.getDataQualityDescription(nearbyData),
        impact: '高'
      },
      {
        factor: '市場安定性',
        score: this.calculateMarketStabilityScore(nearbyData),
        description: this.getMarketStabilityDescription(nearbyData),
        impact: '中'
      },
      {
        factor: 'AI予測精度',
        score: this.calculateAIPredictionScore(aiPrediction),
        description: this.getAIPredictionDescription(aiPrediction),
        impact: '中'
      }
    ];

    const overallConfidence = this.calculateOverallConfidence(confidenceFactors);

    return {
      overall_confidence: overallConfidence,
      confidence_level: this.getConfidenceLevel(overallConfidence),
      confidence_factors: confidenceFactors,
      reliability_indicators: this.generateReliabilityIndicators(nearbyData)
    };
  }

  // 市場インサイトの生成
  generateMarketInsights(nearbyData) {
    const insights = {
      current_market_trend: this.analyzeCurrentMarketTrend(nearbyData),
      price_momentum: this.analyzePriceMomentum(nearbyData),
      supply_demand_balance: this.analyzeSupplyDemandBalance(nearbyData),
      seasonal_patterns: this.analyzeSeasonalPatterns(nearbyData),
      market_opportunities: this.identifyMarketOpportunities(nearbyData)
    };

    return insights;
  }

  // 推奨事項の生成
  generateRecommendations(appraisalData, nearbyData) {
    const recommendations = {
      pricing_strategy: this.generatePricingStrategy(appraisalData, nearbyData),
      market_timing: this.analyzeMarketTiming(nearbyData),
      property_improvements: this.suggestPropertyImprovements(appraisalData),
      negotiation_guidance: this.provideNegotiationGuidance(appraisalData, nearbyData)
    };

    return recommendations;
  }

  // データ品質スコアの計算
  calculateDataQualityScore(nearbyData) {
    const validData = nearbyData.filter(p => 
      p.price > 0 && p.area > 0 && p.age >= 0
    );
    
    const completeness = validData.length / nearbyData.length;
    const priceConsistency = this.calculatePriceConsistency(validData);
    const geographicDiversity = this.calculateGeographicDiversity(validData);
    
    return Math.round((completeness * 0.4 + priceConsistency * 0.4 + geographicDiversity * 0.2) * 1000) / 10;
  }

  // 市場安定性スコアの計算
  calculateMarketStabilityScore(nearbyData) {
    const prices = nearbyData.map(p => p.price / p.area);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // 変動係数が小さいほど安定
    if (coefficientOfVariation <= 0.15) return 90;
    if (coefficientOfVariation <= 0.25) return 75;
    if (coefficientOfVariation <= 0.35) return 60;
    return 45;
  }

  // 総合信頼度の計算
  calculateOverallConfidence(confidenceFactors) {
    const weightedSum = confidenceFactors.reduce((sum, factor) => {
      const weight = factor.impact === '高' ? 0.4 : factor.impact === '中' ? 0.3 : 0.2;
      return sum + (factor.score * weight);
    }, 0);
    
    return Math.round(weightedSum * 10) / 10;
  }

  // 信頼度レベルの判定
  getConfidenceLevel(confidence) {
    if (confidence >= 85) return '極めて高';
    if (confidence >= 75) return '高';
    if (confidence >= 65) return '中';
    if (confidence >= 55) return 'やや低';
    return '低';
  }
}

module.exports = new AIPredictionService();
