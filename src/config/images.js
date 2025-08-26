// 画像設定（画像ファイルは削除されました）
const imageConfig = {
  // ステップ用の画像（プレースホルダー）
  steps: {
    welcome: {
      url: null,
      description: '歓迎メッセージのステップ',
      alt: '👋 査定を開始しましょう！'
    },
    address: {
      url: null,
      description: '住所入力のステップ',
      alt: '📍 住所を教えてください'
    },
    area: {
      url: null,
      description: '面積入力のステップ',
      alt: '📏 面積を教えてください'
    },
    age: {
      url: null,
      description: '築年数入力のステップ',
      alt: '🏗️ 築年数を教えてください'
    },
    purpose: {
      url: null,
      description: '用途選択のステップ',
      alt: '🎯 用途を教えてください'
    },
    personal_info: {
      url: null,
      description: '個人情報入力のステップ',
      alt: '📚 個人情報を入力してください'
    }
  },

  // 結果表示用の画像（プレースホルダー）
  results: {
    appraisal: {
      url: null,
      description: '査定結果の表示',
      alt: '📊 査定結果が表示されています'
    },
    detailed: {
      url: null,
      description: '詳細分析の表示',
      alt: '📈 詳細な分析結果です'
    },
    success: {
      url: null,
      description: '成功の表示',
      alt: '🎉 査定が完了しました！'
    }
  },

  // アクション用の画像（プレースホルダー）
  actions: {
    appointment: {
      url: null,
      description: '予約の設定',
      alt: '📅 相談予約の設定'
    },
    improvement: {
      url: null,
      description: '改善提案の表示',
      alt: '🔧 物件改善の提案'
    },
    market_analysis: {
      url: null,
      description: '市場分析の表示',
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

// 画像メッセージオブジェクトを生成する関数（画像なし）
function createImageMessage(category, type) {
  // 画像ファイルは削除されたので、nullを返す
  return null;
}

// 画像 + テキストの組み合わせメッセージを生成する関数（テキストのみ）
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
