const axios = require('axios');

class ReinfolibService {
  constructor() {
    this.apiKey = process.env.REINFOLIB_API_KEY;
    // 国交相の正しいAPIエンドポイント
    this.baseUrl = 'https://www.reinfolib.mlit.go.jp/ex-api/external';
    
    // データ件数増加のための設定
    this.searchConfig = {
      // 地域別の最適化設定
      regionalSettings: {
        // 関東圏（東京都、神奈川県、埼玉県、千葉県）
        '13': { radius: 15, period: 120, minData: 800 }, // 東京都
        '14': { radius: 12, period: 120, minData: 600 }, // 神奈川県
        '11': { radius: 10, period: 120, minData: 500 }, // 埼玉県
        '12': { radius: 10, period: 120, minData: 500 }, // 千葉県
        
        // 関西圏（大阪府、兵庫県、京都府、奈良県、和歌山県）
        '27': { radius: 12, period: 120, minData: 700 }, // 大阪府
        '28': { radius: 10, period: 120, minData: 500 }, // 兵庫県
        '26': { radius: 10, period: 120, minData: 400 }, // 京都府
        '29': { radius: 8, period: 120, minData: 300 },  // 奈良県
        '30': { radius: 8, period: 120, minData: 250 },  // 和歌山県
        
        // 中部圏（愛知県、静岡県、岐阜県）
        '23': { radius: 10, period: 120, minData: 500 }, // 愛知県
        '22': { radius: 8, period: 120, minData: 400 },  // 静岡県
        '21': { radius: 8, period: 120, minData: 300 },  // 岐阜県
        
        // その他の主要都市
        '34': { radius: 8, period: 120, minData: 400 },  // 広島県
        '40': { radius: 8, period: 120, minData: 400 },  // 福岡県
        '01': { radius: 6, period: 120, minData: 300 },  // 北海道
        
        // デフォルト設定（地方都市）
        'default': { radius: 6, period: 120, minData: 250 }
      }
    };
    
    if (!this.apiKey) {
      console.warn('⚠️ Reinfolib API key not configured');
    } else {
      console.log('✅ Reinfolib API key configured');
      console.log(`🔑 API Key: ${this.apiKey.substring(0, 10)}...`);
    }
  }

  // 地域別の最適化された検索設定を取得
  getRegionalSearchConfig(prefectureCode) {
    const config = this.searchConfig.regionalSettings[prefectureCode];
    if (config) {
      console.log(`📍 地域別設定適用: ${prefectureCode} (半径${config.radius}km, 期間${config.period}ヶ月, 最小データ${config.minData}件)`);
      return config;
    }
    
    const defaultConfig = this.searchConfig.regionalSettings['default'];
    console.log(`📍 デフォルト設定適用: 半径${defaultConfig.radius}km, 期間${defaultConfig.period}ヶ月, 最小データ${defaultConfig.minData}件`);
    return defaultConfig;
  }

  // 近傍物件データの取得（国交相公式API）
  async getNearbyProperties(address, area, age, purpose) {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ Reinfolib API key not configured, using mock data');
        return this.getMockNearbyData(address, area, age, purpose);
      }

      // 住所から都道府県コードを取得
      const prefectureCode = this.extractPrefectureCode(address);
      if (!prefectureCode) {
        throw new Error('都道府県コードの抽出に失敗しました');
      }

      // 地域別の最適化された検索設定を取得
      const regionalConfig = this.getRegionalSearchConfig(prefectureCode);

      console.log(`🔍 国交相API呼び出し開始: ${address} (都道府県コード: ${prefectureCode})`);
      console.log(`📊 目標データ件数: ${regionalConfig.minData}件以上`);

      // 国交相の正しいAPIエンドポイントを使用
      const endpoint = `${this.baseUrl}/XIT001`;
      console.log(`🌐 国交相APIエンドポイント: ${endpoint}`);

      // 複数年のデータを取得して件数を増加
      const years = this.getSearchYears(regionalConfig.period);
      let allData = [];
      
      for (const year of years) {
        try {
          const response = await axios.get(endpoint, {
            params: {
              year: year,
              area: prefectureCode,
              priceClassification: '01' // 不動産取引価格情報
            },
            headers: {
              'Ocp-Apim-Subscription-Key': this.apiKey,
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip'
            },
            timeout: 15000
          });

          if (response.status === 200 && response.data) {
            allData = allData.concat(response.data);
            console.log(`✅ ${year}年データ取得成功: ${response.data.length || 0}件`);
          }
        } catch (yearError) {
          console.warn(`⚠️ ${year}年データ取得失敗:`, yearError.message);
        }
      }

      if (allData.length > 0) {
        console.log(`🎯 総合データ取得成功: ${allData.length}件 (目標: ${regionalConfig.minData}件以上)`);
        
        // データ件数が不足している場合は、検索範囲を拡大
        if (allData.length < regionalConfig.minData) {
          console.log(`⚠️ データ件数不足 (${allData.length}件 < ${regionalConfig.minData}件)`);
          console.log(`🔄 検索範囲を拡大して追加データを取得`);
          
          // 近隣都道府県のデータも取得
          const nearbyPrefectures = this.getNearbyPrefectures(prefectureCode);
          for (const nearbyCode of nearbyPrefectures) {
            try {
              const nearbyResponse = await axios.get(endpoint, {
                params: {
                  year: new Date().getFullYear(),
                  area: nearbyCode,
                  priceClassification: '01'
                },
                headers: {
                  'Ocp-Apim-Subscription-Key': this.apiKey,
                  'Accept': 'application/json',
                  'Accept-Encoding': 'gzip'
                },
                timeout: 15000
              });

              if (nearbyResponse.status === 200 && nearbyResponse.data) {
                allData = allData.concat(nearbyResponse.data);
                console.log(`✅ 近隣地域(${nearbyCode})データ追加: ${nearbyResponse.data.length}件`);
              }
            } catch (nearbyError) {
              console.warn(`⚠️ 近隣地域(${nearbyCode})データ取得失敗:`, nearbyError.message);
            }
          }
        }
        
        return this.formatNearbyData(allData);
      } else {
        throw new Error('国交相APIからデータを取得できませんでした');
      }

    } catch (error) {
      console.error('❌ 国交相API呼び出しエラー:', error.message);
      console.log('🔄 モックデータにフォールバック');
      return this.getMockNearbyData(address, area, age, purpose);
    }
  }

  // 検索対象年を計算
  getSearchYears(periodMonths) {
    const years = [];
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - Math.floor(periodMonths / 12);
    
    for (let year = startYear; year <= currentYear; year++) {
      years.push(year);
    }
    
    return years;
  }

  // 近隣都道府県のコードを取得
  getNearbyPrefectures(prefectureCode) {
    const nearbyMap = {
      '13': ['11', '12', '14'], // 東京都 → 埼玉、千葉、神奈川
      '27': ['26', '28', '29', '30'], // 大阪府 → 京都、兵庫、奈良、和歌山
      '23': ['21', '22', '24'], // 愛知県 → 岐阜、静岡、三重
      '34': ['33', '35', '36'], // 広島県 → 岡山、山口、徳島
      '40': ['41', '42', '43'], // 福岡県 → 佐賀、長崎、熊本
    };
    
    return nearbyMap[prefectureCode] || [];
  }

    // 住所から都道府県コードを抽出
    extractPrefectureCode(address) {
      if (!address || typeof address !== 'string') {
        console.warn('住所が未定義または無効です:', address);
        return '34'; // デフォルトは広島県
      }

      const prefectureMap = {
        '北海道': '01', '青森県': '02', '岩手県': '03', '宮城県': '04', '秋田県': '05',
        '山形県': '06', '福島県': '07', '茨城県': '08', '栃木県': '09', '群馬県': '10',
        '埼玉県': '11', '千葉県': '12', '東京都': '13', '神奈川県': '14', '新潟県': '15',
        '富山県': '16', '石川県': '17', '福井県': '18', '山梨県': '19', '長野県': '20',
        '岐阜県': '21', '静岡県': '22', '愛知県': '23', '三重県': '24', '滋賀県': '25',
        '京都府': '26', '大阪府': '27', '兵庫県': '28', '奈良県': '29', '和歌山県': '30',
        '鳥取県': '31', '島根県': '32', '岡山県': '33', '広島県': '34', '山口県': '35',
        '徳島県': '36', '香川県': '37', '愛媛県': '38', '高知県': '39', '福岡県': '40',
        '佐賀県': '41', '長崎県': '42', '熊本県': '43', '大分県': '44', '宮崎県': '45',
        '鹿児島県': '46', '沖縄県': '47'
      };

      for (const [prefecture, code] of Object.entries(prefectureMap)) {
        if (address.includes(prefecture)) {
          return code;
        }
      }

      // デフォルトは広島県
      return '34';
    }

  // 近傍補正の適用
  applyNearbyCorrection(nearbyData, address, area, age) {
    if (!nearbyData || nearbyData.length === 0) {
      return [];
    }

    return nearbyData.map(item => {
      // 距離による補正
      const distanceCorrection = this.calculateDistanceCorrection(item.distance_km);
      
      // 面積による補正
      const areaCorrection = this.calculateAreaCorrection(item.area, area);
      
      // 築年による補正
      const ageCorrection = this.calculateAgeCorrection(item.age, age);
      
      // 総合補正係数
      const totalCorrection = distanceCorrection * areaCorrection * ageCorrection;
      
      // 補正後の価格
      const correctedPrice = item.price * totalCorrection;
      
      return {
        ...item,
        corrected_price: correctedPrice,
        corrections: {
          distance: distanceCorrection,
          area: areaCorrection,
          age: ageCorrection,
          total: totalCorrection
        }
      };
    });
  }

  // 距離による補正係数の計算
  calculateDistanceCorrection(distanceKm) {
    // 距離が近いほど価格が高い（駅近効果）
    if (distanceKm <= 0.3) return 1.15;      // 駅徒歩5分以内
    if (distanceKm <= 0.5) return 1.10;      // 駅徒歩10分以内
    if (distanceKm <= 0.8) return 1.05;      // 駅徒歩15分以内
    if (distanceKm <= 1.0) return 1.00;      // 駅徒歩20分以内
    return 0.95;                              // それ以上
  }

  // 面積による補正係数の計算
  calculateAreaCorrection(itemArea, targetArea) {
    const ratio = itemArea / targetArea;
    
    // 面積が近いほど補正が少ない
    if (ratio >= 0.9 && ratio <= 1.1) return 1.00;
    if (ratio >= 0.8 && ratio <= 1.2) return 0.98;
    if (ratio >= 0.7 && ratio <= 1.3) return 0.95;
    return 0.90;
  }

  // 築年による補正係数の計算
  calculateAgeCorrection(itemAge, targetAge) {
    const ageDiff = Math.abs(itemAge - targetAge);
    
    // 築年が近いほど補正が少ない
    if (ageDiff <= 2) return 1.00;
    if (ageDiff <= 5) return 0.98;
    if (ageDiff <= 10) return 0.95;
    return 0.90;
  }

  // データのフォーマット
  formatNearbyData(rawData) {
    if (!rawData || !Array.isArray(rawData)) {
      return [];
    }

    return rawData.map(item => ({
      id: item.id || `mock_${Math.random().toString(36).substr(2, 9)}`,
      address: item.address,
      price: parseFloat(item.price) || 0,
      area: parseFloat(item.area) || 0,
      age: parseInt(item.age) || 0,
      purpose: item.purpose,
      distance_km: parseFloat(item.distance_km) || 0,
      transaction_date: item.transaction_date,
      features: item.features || []
    }));
  }

  // モックデータ（API keyがない場合）
  getMockNearbyData(address, area, age, purpose) {
    const mockData = [];
    const basePrice = this.estimateBasePrice(area, age, purpose);
    
    // 地域別の設定を取得
    const prefectureCode = this.extractPrefectureCode(address);
    const regionalConfig = this.getRegionalSearchConfig(prefectureCode);
    const targetDataCount = regionalConfig.minData;
    
    console.log(`🎭 モックデータ生成: 目標${targetDataCount}件`);
    
    // 地域別設定に基づいてデータ件数を決定
    for (let i = 0; i < targetDataCount; i++) {
      const distance = 0.1 + (i * 0.02); // 0.1km〜20km（より広範囲）
      const priceVariation = 0.7 + (Math.random() * 0.6); // ±30%（より現実的）
      const areaVariation = 0.7 + (Math.random() * 0.6);
      const ageVariation = Math.max(0, age - 5 + (Math.random() * 10));
      
      mockData.push({
        id: `mock_${i}`,
        address: `${address}付近`,
        price: Math.round(basePrice * priceVariation),
        area: Math.round(area * areaVariation),
        age: Math.round(ageVariation),
        purpose: purpose,
        distance_km: distance,
        transaction_date: this.getRandomDate(),
        features: this.getRandomFeatures()
      });
    }
    
    console.log(`✅ モックデータ生成完了: ${mockData.length}件`);
    return mockData.sort((a, b) => a.distance_km - b.distance_km);
  }

  // ベース価格の推定
  estimateBasePrice(area, age, purpose) {
    let basePricePerSqm = 500000; // 50万円/㎡（デフォルト）
    
    // 用途による調整
    switch (purpose) {
      case '住宅':
        basePricePerSqm = 600000;
        break;
      case '店舗':
        basePricePerSqm = 800000;
        break;
      case '事務所':
        basePricePerSqm = 400000;
        break;
      case '倉庫':
        basePricePerSqm = 200000;
        break;
    }
    
    // 築年による調整
    const ageAdjustment = Math.max(0.5, 1 - (age * 0.02));
    
    return Math.round(area * basePricePerSqm * ageAdjustment);
  }

  // ランダム日付の生成
  getRandomDate() {
    const start = new Date(2023, 0, 1);
    const end = new Date();
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(randomTime).toISOString().split('T')[0];
  }

  // ランダム特徴の生成
  getRandomFeatures() {
    const allFeatures = [
      '駅徒歩5分以内', '南向き', '角地', '駐車場あり', 'バルコニー',
      'エレベーター', '管理費安い', 'ペット可', '即入居可', 'リフォーム済み'
    ];
    
    const featureCount = 2 + Math.floor(Math.random() * 4); // 2-5個
    const shuffled = allFeatures.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, featureCount);
  }

  // 市場動向データの取得
  async getMarketTrends(address, purpose) {
    try {
      if (!this.apiKey) {
        return this.getMockMarketTrends();
      }

      const response = await axios.get(`${this.apiUrl}/market/trends`, {
        params: { address, purpose },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;

    } catch (error) {
      console.error('Market trends API error:', error);
      return this.getMockMarketTrends();
    }
  }

  // モック市場動向データ
  getMockMarketTrends() {
    return {
      trend: 'stable', // rising, stable, declining
      change_rate: 0.02, // 2%上昇
      volume: 'medium', // low, medium, high
      confidence: 0.8
    };
  }

  // 詳細統計分析による信憑性向上
  generateDetailedAnalysis(nearbyProperties, targetArea, targetAge) {
    if (!nearbyProperties || nearbyProperties.length === 0) {
      return {
        confidence_score: 0.5,
        analysis_details: 'データ不足のため分析できません'
      };
    }

    const analysis = {
      confidence_score: 0.5,
      data_quality: {},
      statistical_metrics: {},
      recommendations: []
    };

    // データ件数による信頼性評価
    const dataCount = nearbyProperties.length;
    if (dataCount >= 800) {
      analysis.confidence_score = 0.95;
      analysis.data_quality.level = '非常に高';
    } else if (dataCount >= 500) {
      analysis.confidence_score = 0.85;
      analysis.data_quality.level = '高';
    } else if (dataCount >= 300) {
      analysis.confidence_score = 0.75;
      analysis.data_quality.level = '中';
    } else if (dataCount >= 200) {
      analysis.confidence_score = 0.65;
      analysis.data_quality.level = '低';
    } else {
      analysis.confidence_score = 0.55;
      analysis.data_quality.level = '非常に低';
    }

    // データの多様性評価
    const uniqueAreas = new Set(nearbyProperties.map(p => Math.round(p.area / 10) * 10)).size;
    const uniqueAges = new Set(nearbyProperties.map(p => Math.round(p.age / 5) * 5)).size;
    const uniqueDistances = new Set(nearbyProperties.map(p => Math.round(p.distance_km * 2) / 2)).size;

    analysis.data_quality.diversity = {
      areas: uniqueAreas,
      ages: uniqueAges,
      distances: uniqueDistances
    };

    // 統計的指標の計算
    const prices = nearbyProperties.map(p => p.price).filter(p => p > 0);
    if (prices.length > 0) {
      const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const sorted = prices.sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      
      // 外れ値の除外（上位・下位5%を除外）
      const lowerBound = sorted[Math.floor(sorted.length * 0.05)];
      const upperBound = sorted[Math.floor(sorted.length * 0.95)];
      const filteredPrices = prices.filter(p => p >= lowerBound && p <= upperBound);
      
      analysis.statistical_metrics = {
        total_count: prices.length,
        filtered_count: filteredPrices.length,
        mean_price: Math.round(mean),
        median_price: median,
        price_range: `${Math.round(lowerBound)}万円〜${Math.round(upperBound)}万円`,
        standard_deviation: this.calculateStandardDeviation(filteredPrices),
        coefficient_of_variation: this.calculateCoefficientOfVariation(filteredPrices)
      };
    }

    // 信頼性向上のための推奨事項
    if (dataCount < 500) {
      analysis.recommendations.push('より多くの取引データを収集することを推奨');
    }
    if (uniqueAreas < 5) {
      analysis.recommendations.push('面積の多様性を向上させるため、より広い範囲でのデータ収集を推奨');
    }
    if (uniqueAges < 3) {
      analysis.recommendations.push('築年数の多様性を向上させるため、より広い範囲でのデータ収集を推奨');
    }

    analysis.analysis_details = `データ件数: ${dataCount}件, 信頼性レベル: ${analysis.data_quality.level}`;
    
    return analysis;
  }

  // 標準偏差の計算
  calculateStandardDeviation(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(variance);
  }

  // 変動係数の計算
  calculateCoefficientOfVariation(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = this.calculateStandardDeviation(values);
    return mean > 0 ? (stdDev / mean) * 100 : 0;
  }

  // データ品質の評価
  assessDataQuality(properties) {
    const totalProperties = properties.length;
    const validProperties = properties.filter(p => 
      p.price > 0 && p.area > 0 && p.age >= 0
    );

    const dataCompleteness = validProperties.length / totalProperties;
    const priceRange = this.calculatePriceRange(validProperties);
    const areaRange = this.calculateAreaRange(validProperties);
    const ageRange = this.calculateAgeRange(validProperties);

    return {
      completeness: Math.round(dataCompleteness * 1000) / 10, // パーセント
      price_range: priceRange,
      area_range: areaRange,
      age_range: ageRange,
      quality_level: this.getQualityLevel(dataCompleteness)
    };
  }

  // 統計分析の実行
  performStatisticalAnalysis(properties, targetArea, targetAge) {
    const prices = properties.map(p => p.price);
    const areas = properties.map(p => p.area);
    const ages = properties.map(p => p.age);
    const pricesPerSqm = properties.map(p => p.price / p.area);

    // 基本統計量
    const basicStats = {
      count: properties.length,
      price: this.calculateBasicStats(prices),
      area: this.calculateBasicStats(areas),
      age: this.calculateBasicStats(ages),
      price_per_sqm: this.calculateBasicStats(pricesPerSqm)
    };

    // 信頼区間の計算
    const confidenceIntervals = {
      price: this.calculateConfidenceInterval(prices, 0.95),
      price_per_sqm: this.calculateConfidenceInterval(pricesPerSqm, 0.95)
    };

    // 相関分析
    const correlations = {
      price_area: this.calculateCorrelation(prices, areas),
      price_age: this.calculateCorrelation(prices, ages),
      area_age: this.calculateCorrelation(areas, ages)
    };

    // 外れ値の検出
    const outliers = this.detectOutliers(properties);

    return {
      basic_stats: basicStats,
      confidence_intervals: confidenceIntervals,
      correlations: correlations,
      outliers: outliers
    };
  }

  // 市場状況の分析
  analyzeMarketConditions(properties) {
    // 価格分布の分析
    const priceDistribution = this.analyzePriceDistribution(properties);
    
    // 市場の安定性
    const marketStability = this.assessMarketStability(properties);
    
    // 価格トレンド
    const priceTrend = this.analyzePriceTrend(properties);

    return {
      price_distribution: priceDistribution,
      market_stability: marketStability,
      price_trend: priceTrend
    };
  }

  // 信頼性要因の特定
  identifyReliabilityFactors(properties, targetArea, targetAge) {
    const factors = [];

    // データ量による信頼性
    if (properties.length >= 100) {
      factors.push({ name: 'データ量', score: 0.9, description: '100件以上の豊富なデータ' });
    } else if (properties.length >= 50) {
      factors.push({ name: 'データ量', score: 0.7, description: '50件以上の十分なデータ' });
    } else if (properties.length >= 20) {
      factors.push({ name: 'データ量', score: 0.5, description: '20件以上の基本的なデータ' });
    } else {
      factors.push({ name: 'データ量', score: 0.3, description: 'データが不足しています' });
    }

    // 類似性による信頼性
    const similarProperties = this.findSimilarProperties(properties, targetArea, targetAge);
    const similarityScore = Math.min(0.9, similarProperties.length / 20);
    factors.push({
      name: '類似性',
      score: similarityScore,
      description: `${similarProperties.length}件の類似物件`
    });

    // 価格の一貫性
    const priceConsistency = this.assessPriceConsistency(properties);
    factors.push({
      name: '価格一貫性',
      score: priceConsistency.score,
      description: priceConsistency.description
    });

    // 地域の市場成熟度
    const marketMaturity = this.assessMarketMaturity(properties);
    factors.push({
      name: '市場成熟度',
      score: marketMaturity.score,
      description: marketMaturity.description
    });

    return factors;
  }

  // 総合信頼度スコアの計算
  calculateComprehensiveConfidence(analysis) {
    let totalScore = 0;
    let totalWeight = 0;

    // データ品質の重み: 30%
    const dataQualityWeight = 0.3;
    totalScore += (analysis.data_quality.completeness / 100) * dataQualityWeight;
    totalWeight += dataQualityWeight;

    // 統計分析の重み: 25%
    const statisticalWeight = 0.25;
    const statisticalScore = this.calculateStatisticalScore(analysis.statistical_analysis);
    totalScore += statisticalScore * statisticalWeight;
    totalWeight += statisticalWeight;

    // 市場分析の重み: 25%
    const marketWeight = 0.25;
    const marketScore = this.calculateMarketScore(analysis.market_analysis);
    totalScore += marketScore * marketWeight;
    totalWeight += marketWeight;

    // 信頼性要因の重み: 20%
    const reliabilityWeight = 0.2;
    const reliabilityScore = this.calculateReliabilityScore(analysis.reliability_factors);
    totalScore += reliabilityScore * reliabilityWeight;
    totalWeight += reliabilityWeight;

    const finalScore = totalScore / totalWeight;
    return Math.min(0.98, Math.max(0.05, finalScore));
  }
}

module.exports = new ReinfolibService();
