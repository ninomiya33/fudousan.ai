# LINE Bot 画像ファイル

このディレクトリには、LINE Botで使用する画像ファイルが保存されています。

## 📁 ディレクトリ構造

```
public/images/
├── characters/          # キャラクター画像
│   ├── welcome.png     # 挨拶キャラクター
│   ├── expert.png      # 専門家キャラクター
│   └── celebration.png # 祝福キャラクター
├── steps/              # 各ステップ用画像
│   ├── address.png     # 住所入力
│   ├── area.png        # 面積入力
│   ├── age.png         # 築年数入力
│   ├── purpose.png     # 用途選択
│   └── personal_info.png # 個人情報入力
├── results/            # 結果表示用画像
│   ├── appraisal.png   # 査定結果
│   ├── detailed.png    # 詳細分析
│   └── success.png     # 成功・完了
└── actions/            # アクション用画像
    ├── appointment.png  # 予約
    ├── improvement.png  # 改善提案
    └── market_analysis.png # 市場分析
```

## 🖼️ 画像仕様

### **推奨サイズ**
- **LINE Bot用**: 1024 x 1024 ピクセル
- **プレビュー用**: 240 x 240 ピクセル

### **ファイル形式**
- **推奨**: PNG（透過対応）
- **対応**: JPEG, GIF

### **ファイルサイズ**
- **最大**: 10MB以下
- **推奨**: 1MB以下

## 📝 使用方法

### **1. 画像を配置**
各カテゴリのディレクトリに画像ファイルを配置してください。

### **2. コードでの使用**
```javascript
const { createImageMessage, createImageTextMessage } = require('./config/images');

// 画像のみ
const imageMessage = createImageMessage('characters', 'welcome');

// 画像 + テキスト
const messages = createImageTextMessage('steps', 'address', '住所を教えてください');
```

### **3. LINE Botでの送信**
```javascript
// 単一メッセージ
await lineClient.replyMessage(event.replyToken, imageMessage);

// 複数メッセージ
await lineClient.replyMessage(event.replyToken, messages);
```

## 🔧 開発時の注意点

1. **画像ファイル名**: 英数字とアンダースコアのみ使用
2. **パス**: 相対パスで指定
3. **キャッシュ**: ブラウザキャッシュを考慮
4. **セキュリティ**: 本番環境では適切な認証を実装

## 📱 LINE Botでの表示例

- **査定開始時**: キャラクター画像 + 挨拶メッセージ
- **各ステップ**: ステップ用画像 + 説明メッセージ
- **結果表示**: 結果用画像 + 査定結果
- **完了時**: 祝福画像 + 完了メッセージ





