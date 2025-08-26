// LINE Bot 画像設定ファイル
// 各ステップで使用する画像のURLと説明を管理

const imageConfig = {
  // キャラクター画像
  characters: {
    welcome: {
      url: '/images/characters/welcome.png',
      description: '虫眼鏡を持った調査員風の家キャラクターが挨拶している画像',
      alt: '🔍 こんにちは！不動産査定のお手伝いをさせていただきます！'
    },
    expert: {
      url: '/images/characters/expert.png',
      description: 'ハンマーを持った建設作業員風の家キャラクターが専門的な説明をしている画像',
      alt: '🔨 専門的なアドバイスを提供いたします'
    },
    celebration: {
      url: '/images/characters/celebration.png',
      description: 'チェックリストを持った家キャラクターが査定完了を祝福している画像',
      alt: '✅ 査定完了！お疲れさまでした！'
    }
  },

  // 各ステップ用の画像
  steps: {
    address: {
      url: '/images/steps/address.png',
      description: '住所入力のステップを示す地図や家のイラスト',
      alt: '📍 住所を教えてください'
    },
    area: {
      url: '/images/steps/area.png',
      description: '面積入力のステップを示すメジャーや図面のイラスト',
      alt: '📏 面積を教えてください'
    },
    age: {
      url: '/images/steps/age.png',
      description: '築年数入力のステップを示す建物のイラスト',
      alt: '🏗️ 築年数を教えてください'
    },
    purpose: {
      url: '/images/steps/purpose.png',
      description: '用途選択のステップを示す選択肢のイラスト',
      alt: '🎯 用途を教えてください'
    },
    personal_info: {
      url: '/images/steps/personal_info.png',
      description: '本を持った学習者風の家キャラクターが個人情報入力を案内している画像',
      alt: '📚 個人情報を入力してください'
    }
  },

  // 結果表示用の画像
  results: {
    appraisal: {
      url: '/images/results/appraisal.png',
      description: '査定結果を示すグラフや分析のイラスト',
      alt: '📊 査定結果が表示されています'
    },
    detailed: {
      url: '/images/results/detailed.png',
      description: '詳細分析を示す詳細なグラフのイラスト',
      alt: '📈 詳細な分析結果です'
    },
    success: {
      url: '/images/results/success.png',
      description: '成功を示す祝福や達成のイラスト',
      alt: '🎉 査定が完了しました！'
    }
  },

  // アクション用の画像
  actions: {
    appointment: {
      url: '/images/actions/appointment.png',
      description: '予約を示すカレンダーのイラスト',
      alt: '📅 相談予約の設定'
    },
    improvement: {
      url: '/images/actions/improvement.png',
      description: '改善提案を示す工具やアイデアのイラスト',
      alt: '🔧 物件改善の提案'
    },
    market_analysis: {
      url: '/images/actions/market_analysis.png',
      description: '市場分析を示すチャートやグラフのイラスト',
      alt: '📊 市場分析レポート'
    }
  }
};

// 画像URLを取得する関数
function getImageUrl(category, type) {
  return imageConfig[category]?.[type]?.url || null;
}

// 画像の説明を取得する関数
function getImageDescription(category, type) {
  return imageConfig[category]?.[type]?.description || '';
}

// 画像の代替テキストを取得する関数
function getImageAlt(category, type) {
  return imageConfig[category]?.[type]?.alt || '';
}

// 画像メッセージオブジェクトを生成する関数（LINE Bot最適化）
function createImageMessage(category, type) {
  const url = getImageUrl(category, type);
  if (!url) return null;

  // LINE Bot用の最適化された画像設定
  return {
    type: 'image',
    originalContentUrl: `${process.env.BASE_URL || 'http://localhost:3000'}${url}`,
    previewImageUrl: `${process.env.BASE_URL || 'http://localhost:3000'}${url}`,
    // 画像サイズを小さく表示（LINE Botの制限内）
    size: 'small'
  };
}

// 画像 + テキストの組み合わせメッセージを生成する関数（LINE Bot最適化）
function createImageTextMessage(category, type, text) {
  // 画像なしでテキストのみを返す
  return [{ type: 'text', text }];
}

module.exports = {
  imageConfig,
  getImageUrl,
  getImageDescription,
  getImageAlt,
  createImageMessage,
  createImageTextMessage
};
