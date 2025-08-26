# Google Calendar & Google Apps Script 設定ガイド

## 1. Google Calendar API の設定

### 1.1 Google Cloud Console での設定
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. Google Calendar API を有効化
4. OAuth 2.0 クライアントIDを作成

### 1.2 必要な環境変数
`.env` ファイルに以下を追加：

```bash
# Google Calendar API
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token_here

# Google Apps Script
GAS_PDF_ENDPOINT=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 1.3 認証トークンの取得
1. 認証URLにアクセスして認証コードを取得
2. 認証コードをリフレッシュトークンに交換
3. リフレッシュトークンを環境変数に設定

## 2. Google Apps Script の設定

### 2.1 GAS プロジェクトの作成
1. [Google Apps Script](https://script.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. PDF生成用のスクリプトを作成

### 2.2 PDF生成スクリプト
```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'generate_pdf') {
      return generatePDF(data);
    } else if (data.action === 'regenerate_pdf') {
      return regeneratePDF(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function generatePDF(data) {
  try {
    // PDF生成ロジック
    const template = getTemplate(data.template_type);
    const pdfContent = fillTemplate(template, data.data);
    
    // Google Driveに保存
    const blob = Utilities.newBlob(pdfContent, 'application/pdf', 'appraisal_report.pdf');
    const file = DriveApp.createFile(blob);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      file_id: file.getId(),
      drive_url: file.getUrl(),
      file_size: file.getSize()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getTemplate(templateType) {
  // テンプレート取得ロジック
  return {
    standard: 'standard_template',
    premium: 'premium_template'
  }[templateType] || 'standard_template';
}

function fillTemplate(template, data) {
  // テンプレート埋め込みロジック
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
}
```

### 2.3 デプロイ設定
1. スクリプトをデプロイ
2. ウェブアプリとして公開
3. エンドポイントURLを環境変数に設定

## 3. テスト手順

### 3.1 予約システムのテスト
```bash
# 利用可能な予約枠の取得
curl -X GET "http://localhost:3000/api/appointment/slots?owner_id=550e8400-e29b-41d4-a716-446655440000&date=2025-08-25&duration=60"

# 予約の作成
curl -X POST "http://localhost:3000/api/appointment/book" \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "550e8400-e29b-41d4-a716-446655440000",
    "property_id": "test_property_id",
    "slot_datetime": "2025-08-25T10:00:00Z",
    "meeting_type": "online",
    "customer_name": "テスト顧客",
    "customer_phone": "090-1234-5678"
  }'
```

### 3.2 PDF生成のテスト
```bash
# PDF生成
curl -X POST "http://localhost:3000/api/pdf/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "550e8400-e29b-41d4-a716-446655440000",
    "property_id": "test_property_id",
    "appraisal_id": "test_appraisal_id",
    "template_type": "standard"
  }'
```

## 4. トラブルシューティング

### 4.1 よくある問題
- 認証トークンの期限切れ
- GASエンドポイントのアクセス権限
- データベース接続エラー

### 4.2 解決方法
- リフレッシュトークンの再取得
- GASのデプロイ設定の確認
- データベーステーブルの存在確認
