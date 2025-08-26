const express = require('express');
const router = express.Router();
const chatgptService = require('../services/chatgptService');
const { supabase } = require('../config/database');

// 査定結果の詳細説明生成
router.post('/appraisal-explanation', async (req, res) => {
  try {
    const { appraisal_id, property_id } = req.body;

    if (!appraisal_id || !property_id) {
      return res.status(400).json({ error: 'appraisal_idとproperty_idが必要です' });
    }

    // 査定情報を取得
    const { data: appraisal, error: appraisalError } = await supabase
      .from('appraisals')
      .select('*')
      .eq('id', appraisal_id)
      .single();

    if (appraisalError) throw appraisalError;

    // 物件情報を取得
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single();

    if (propertyError) throw propertyError;

    // ChatGPTで詳細説明を生成
    const explanation = await chatgptService.generateAppraisalExplanation(
      appraisal.final_result || appraisal,
      property
    );

    res.json({
      success: true,
      explanation: explanation.explanation,
      model: explanation.model,
      usage: explanation.usage
    });

  } catch (error) {
    console.error('Generate appraisal explanation error:', error);
    res.status(500).json({ error: '査定説明の生成に失敗しました' });
  }
});

// 物件価値向上の改善提案生成
router.post('/improvement-suggestions', async (req, res) => {
  try {
    const { property_id, appraisal_id } = req.body;

    if (!property_id || !appraisal_id) {
      return res.status(400).json({ error: 'property_idとappraisal_idが必要です' });
    }

    // 物件情報を取得
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single();

    if (propertyError) throw propertyError;

    // 査定情報を取得
    const { data: appraisal, error: appraisalError } = await supabase
      .from('appraisals')
      .select('*')
      .eq('id', appraisal_id)
      .single();

    if (appraisalError) throw appraisalError;

    // ChatGPTで改善提案を生成
    const suggestions = await chatgptService.generateImprovementSuggestions(
      property,
      appraisal.final_result || appraisal
    );

    res.json({
      success: true,
      suggestions: suggestions.suggestions,
      model: suggestions.model,
      usage: suggestions.usage
    });

  } catch (error) {
    console.error('Generate improvement suggestions error:', error);
    res.status(500).json({ error: '改善提案の生成に失敗しました' });
  }
});

// 市場分析レポート生成
router.post('/market-analysis', async (req, res) => {
  try {
    const { address, property_type } = req.body;

    if (!address || !property_type) {
      return res.status(400).json({ error: 'addressとproperty_typeが必要です' });
    }

    // ChatGPTで市場分析を生成
    const analysis = await chatgptService.generateMarketAnalysis(address, property_type);

    res.json({
      success: true,
      analysis: analysis.analysis,
      model: analysis.model,
      usage: analysis.usage
    });

  } catch (error) {
    console.error('Generate market analysis error:', error);
    res.status(500).json({ error: '市場分析の生成に失敗しました' });
  }
});

// カスタマーサポート応答生成
router.post('/customer-support', async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'questionが必要です' });
    }

    // ChatGPTでカスタマーサポート応答を生成
    const response = await chatgptService.generateCustomerSupportResponse(question, context);

    res.json({
      success: true,
      response: response.response,
      model: response.model,
      usage: response.usage
    });

  } catch (error) {
    console.error('Generate customer support response error:', error);
    res.status(500).json({ error: 'カスタマーサポート応答の生成に失敗しました' });
  }
});

// AI機能の一覧取得
router.get('/features', async (req, res) => {
  try {
    const features = [
      {
        id: 'appraisal-explanation',
        name: '査定結果詳細説明',
        description: '査定結果を分かりやすく説明し、物件の価値や特徴を詳しく分析',
        endpoint: '/api/ai/appraisal-explanation',
        method: 'POST'
      },
      {
        id: 'improvement-suggestions',
        name: '価値向上改善提案',
        description: '物件の価値を高めるための具体的な改善提案を生成',
        endpoint: '/api/ai/improvement-suggestions',
        method: 'POST'
      },
      {
        id: 'market-analysis',
        name: '市場分析レポート',
        description: '地域の市場動向と物件の投資価値を詳しく分析',
        endpoint: '/api/ai/market-analysis',
        method: 'POST'
      },
      {
        id: 'customer-support',
        name: 'カスタマーサポート',
        description: '不動産査定に関する質問に専門的で親切に回答',
        endpoint: '/api/ai/customer-support',
        method: 'POST'
      }
    ];

    res.json({
      success: true,
      features,
      total: features.length
    });

  } catch (error) {
    console.error('Get AI features error:', error);
    res.status(500).json({ error: 'AI機能一覧の取得に失敗しました' });
  }
});

// API使用量の確認
router.get('/usage', async (req, res) => {
  try {
    const usage = await chatgptService.getUsageStats();

    if (usage.success) {
      res.json({
        success: true,
        usage: usage.usage
      });
    } else {
      res.json({
        success: false,
        message: 'API使用量の取得に失敗しました',
        error: usage.error
      });
    }

  } catch (error) {
    console.error('Get API usage error:', error);
    res.status(500).json({ error: 'API使用量の取得に失敗しました' });
  }
});

// AI機能のヘルスチェック
router.get('/health', async (req, res) => {
  try {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    
    res.json({
      success: true,
      status: hasApiKey ? 'healthy' : 'warning',
      message: hasApiKey ? 'ChatGPT API is configured' : 'ChatGPT API key not configured, using mock responses',
      features: {
        appraisal_explanation: true,
        improvement_suggestions: true,
        market_analysis: true,
        customer_support: true
      }
    });

  } catch (error) {
    console.error('AI health check error:', error);
    res.status(500).json({ error: 'AI機能のヘルスチェックに失敗しました' });
  }
});

module.exports = router;
