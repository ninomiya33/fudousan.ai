# 二宮不動産 査定システムAPI

不動産査定から商談までをLINE Botで完結するシステム

## 機能概要

### 1. LINE友だち追加・同意取得
- LIFFミニフォームで氏名・電話・学習可否を取得
- 同意フラグの管理

### 2. 査定チャット
- 住所 → 面積 → 築年 → 用途の順次入力
- Reinfolib API + 近傍補正 + AI予測
- 結果をSupabaseに保存

### 3. 結果提示
- 価格レンジ + 根拠（近傍件数・期間・半径・特徴量の寄与）
- 「相談する」ボタンで次のステップへ

### 4. 予約システム
- Google FreeBusyで空き枠取得
- カレンダー登録 + オンライン会議URL発行
- Google Meet / Zoom連携

### 5. PDF生成・送付
- Google Apps Scriptで見積PDF自動生成
- Drive URLをLINEに送付
- リード表に記録

### 6. 商談管理
- 結果記録（成約/保留/失注理由・次回タスク）
- リマインド自動化

## 技術スタック

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **LINE Bot**: @line/bot-sdk
- **Google APIs**: Calendar, Drive, Meet
- **PDF Generation**: Google Apps Script
- **Real Estate Data**: Reinfolib API

## セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
```bash
cp env.example .env
# .envファイルを編集して必要な値を設定
```

### 3. データベースのセットアップ
Supabaseで以下のテーブルを作成：
- `owners` - オーナー情報
- `properties` - 物件情報
- `appraisals` - 査定結果
- `appointments` - 予約情報
- `leads` - リード管理

### 4. サーバーの起動
```bash
npm run dev  # 開発モード
npm start    # 本番モード
```

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|----------|------|
| `/onboard` | POST | 同意・登録 |
| `/appraise` | POST | 査定入力 |
| `/slots` | GET | 空き枠取得 |
| `/book` | POST | 予約確定 |
| `/pdf` | POST | PDF生成 |
| `/lead-status` | POST | 商談結果記録 |

## LINE Bot設定

1. LINE Developers Consoleでチャネル作成
2. Webhook URL設定: `https://your-domain.com/webhook`
3. チャネルアクセストークンとシークレットを取得
4. LIFFアプリの作成（同意フォーム用）

## Google APIs設定

1. Google Cloud Consoleでプロジェクト作成
2. Calendar API, Drive API, Meet APIを有効化
3. OAuth 2.0認証情報の作成
4. サービスアカウントの設定（必要に応じて）

## 開発・デプロイ

### 開発環境
```bash
npm run dev
```

### 本番環境へのデプロイ

#### Vercelでのデプロイ（推奨）

1. **Vercel CLIのインストール**
```bash
npm i -g vercel
```

2. **プロジェクトのデプロイ**
```bash
vercel --prod
```

3. **環境変数の設定**
Vercelダッシュボードで以下を設定：
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REINFOLIB_API_KEY`
- `NODE_ENV=production`

4. **LINE Bot Webhook URLの更新**
```
https://your-project.vercel.app/webhook
```

#### その他のデプロイ方法

- **Railway**: `npm i -g @railway/cli && railway up`
- **Render**: Webサービスとしてデプロイ
- **Heroku**: 従来型VPS

### テスト
```bash
npm test
```

### 本番デプロイ
環境変数を適切に設定してから：
```bash
npm start
```
