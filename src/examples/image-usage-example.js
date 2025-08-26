// LINE Bot 画像使用例
// このファイルは参考用です。実際の実装には含めません。

const { createImageMessage, createImageTextMessage } = require('../config/images');

// 例1: 査定開始時の挨拶（画像 + テキスト）
async function sendWelcomeMessage(lineClient, replyToken) {
  const messages = createImageTextMessage(
    'characters', 
    'welcome', 
    'こんにちは！不動産査定のお手伝いをさせていただきます！\n\nまずは物件の住所を教えていただけますか？'
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

// 例2: 住所入力ステップ（画像 + テキスト）
async function sendAddressStepMessage(lineClient, replyToken) {
  const messages = createImageTextMessage(
    'steps', 
    'address', 
    '📍 まずは物件の住所を教えていただけますか？\n\n例：\n• 東京都新宿区西新宿1-1-1\n• 大阪市北区梅田1-1-1\n• 横浜市西区みなとみらい1-1-1\n\nお住まいの住所、もしくは査定したい物件の住所を教えてくださいね。'
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

// 例3: 面積入力ステップ（画像 + テキスト）
async function sendAreaStepMessage(lineClient, replyToken) {
  const messages = createImageTextMessage(
    'steps', 
    'area', 
    '📏 次に物件の面積を教えていただけますか？\n\n例：\n• 70㎡\n• 100㎡\n• 50㎡\n\n数字だけで大丈夫です。お気軽にお答えくださいね。'
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

// 例4: 築年数入力ステップ（画像 + テキスト）
async function sendAgeStepMessage(lineClient, replyToken) {
  const messages = createImageTextMessage(
    'steps', 
    'age', 
    '🏗️ 次に築年数を教えていただけますか？\n\n例：\n• 10年\n• 新築\n• 築20年\n\nお住まいの築年数、もしくは築年数をお教えくださいね。'
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

// 例5: 用途選択ステップ（画像 + テキスト）
async function sendPurposeStepMessage(lineClient, replyToken) {
  const messages = createImageTextMessage(
    'steps', 
    'purpose', 
    '🎯 最後に用途を教えていただけますか？\n\n以下のいずれかからお選びください：\n• 売却\n• 購入\n• 賃貸\n\nどのような目的で査定をご希望でしょうか？'
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

// 例6: 個人情報入力ステップ（画像 + テキスト）
async function sendPersonalInfoStepMessage(lineClient, replyToken) {
  const messages = createImageTextMessage(
    'steps', 
    'personal_info', 
    '👤 個人情報を入力していただきますね。\n\nまずは**お名前**を教えていただけますか？\n\n例：\n• 山田太郎\n• 佐藤花子\n• 田中一郎\n\nお名前をお教えください。'
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

// 例7: 査定結果表示（画像 + テキスト）
async function sendAppraisalResultMessage(lineClient, replyToken, result) {
  const messages = createImageTextMessage(
    'results', 
    'appraisal', 
    `📊 査定完了いたしました！\n\n${result.summary}\n\n詳細な結果をご覧になりたい場合は「詳細表示」とお送りください。\n相談予約をご希望の場合は「予約したい」とお送りください。\nやり直しの場合は「やり直し」とお送りください。`
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

// 例8: 詳細結果表示（画像 + テキスト）
async function sendDetailedResultMessage(lineClient, replyToken, result) {
  const messages = createImageTextMessage(
    'results', 
    'detailed', 
    `📈 詳細査定結果\n\n${result.detailed}\n\n次のアクションを選択してください：\n\n1️⃣ 相談予約：「予約したい」\n2️⃣ 物件改善提案：「改善提案」\n3️⃣ 市場分析レポート：「市場分析」\n4️⃣ フォローアップ設定：「フォローアップ」\n5️⃣ やり直し：「やり直し」`
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

// 例9: 査定完了時の祝福（画像 + テキスト）
async function sendCompletionMessage(lineClient, replyToken) {
  const messages = createImageTextMessage(
    'characters', 
    'celebration', 
    '🎉 査定が完了いたしました！\n\nお疲れさまでした！\n\n査定結果についてご質問がございましたら、お気軽にお聞かせください。\n\nまた、相談予約やフォローアップ設定も承っております。'
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

// 例10: 予約アクション（画像 + テキスト）
async function sendAppointmentMessage(lineClient, replyToken) {
  const messages = createImageTextMessage(
    'actions', 
    'appointment', 
    '📅 相談予約のご依頼ありがとうございます！\n\n以下の方法で予約をお取りできます：\n\n1️⃣ オンライン予約システム\n2️⃣ お電話での予約\n3️⃣ 店舗での直接予約\n\nご希望の方法をお教えください。また、ご相談内容やご希望の日時があれば、お聞かせください。'
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

// 例11: 改善提案アクション（画像 + テキスト）
async function sendImprovementMessage(lineClient, replyToken) {
  const messages = createImageTextMessage(
    'actions', 
    'improvement', 
    '🔧 物件改善提案\n\n物件価値を向上させるための改善案をご提案いたします。\n\n• リフォーム工事\n• 設備の更新\n• 外装の改善\n• 庭の整備\n\nこれらの改善を行うことで、物件価値の向上が期待できます。\n\n次のアクション：\n1️⃣ 相談予約：「予約したい」\n2️⃣ フォローアップ設定：「フォローアップ」\n3️⃣ やり直し：「やり直し」'
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

// 例12: 市場分析アクション（画像 + テキスト）
async function sendMarketAnalysisMessage(lineClient, replyToken) {
  const messages = createImageTextMessage(
    'actions', 
    'market_analysis', 
    '📊 市場分析レポート\n\n現在の市場状況と今後の動向について分析いたしました。\n\n• 価格トレンド：上昇傾向\n• 取引量：安定\n• 需要：高\n• 供給：限定的\n\n市場の動向を把握することで、適切なタイミングでの売買が可能になります。\n\n次のアクション：\n1️⃣ 相談予約：「予約したい」\n2️⃣ フォローアップ設定：「フォローアップ」\n3️⃣ やり直し：「やり直し」'
  );
  
  await lineClient.replyMessage(replyToken, messages);
}

module.exports = {
  sendWelcomeMessage,
  sendAddressStepMessage,
  sendAreaStepMessage,
  sendAgeStepMessage,
  sendPurposeStepMessage,
  sendPersonalInfoStepMessage,
  sendAppraisalResultMessage,
  sendDetailedResultMessage,
  sendCompletionMessage,
  sendAppointmentMessage,
  sendImprovementMessage,
  sendMarketAnalysisMessage
};





