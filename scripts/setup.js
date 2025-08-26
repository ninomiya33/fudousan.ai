#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 二宮不動産査定システムAPI セットアップ開始...\n');

// 1. 依存関係のインストール
console.log('📦 依存関係をインストール中...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ 依存関係のインストールが完了しました\n');
} catch (error) {
  console.error('❌ 依存関係のインストールに失敗しました:', error.message);
  process.exit(1);
}

// 2. 環境変数ファイルの作成
console.log('🔧 環境変数ファイルを作成中...');
const envExamplePath = path.join(__dirname, '..', 'env.example');
const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .envファイルが作成されました');
    console.log('⚠️  必要に応じて.envファイルを編集してください\n');
  } catch (error) {
    console.error('❌ .envファイルの作成に失敗しました:', error.message);
  }
} else {
  console.log('✅ .envファイルは既に存在します\n');
}

// 3. データベーススキーマの確認
console.log('🗄️  データベーススキーマを確認中...');
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  console.log('✅ データベーススキーマファイルが見つかりました');
  console.log('📋 Supabaseで以下のSQLを実行してください:\n');
  console.log(`   ${schemaPath}\n`);
} else {
  console.error('❌ データベーススキーマファイルが見つかりません');
}

// 4. ディレクトリ構造の確認
console.log('📁 プロジェクト構造を確認中...');
const requiredDirs = [
  'src',
  'src/routes',
  'src/services',
  'src/models',
  'src/middleware',
  'src/utils',
  'src/config',
  'database',
  'scripts'
];

const missingDirs = requiredDirs.filter(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  return !fs.existsSync(dirPath);
});

if (missingDirs.length === 0) {
  console.log('✅ 必要なディレクトリがすべて存在します\n');
} else {
  console.log('❌ 以下のディレクトリが不足しています:');
  missingDirs.forEach(dir => console.log(`   - ${dir}`));
  console.log('');
}

// 5. 設定チェック
console.log('⚙️  設定をチェック中...');
const requiredEnvVars = [
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_CHANNEL_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'REINFOLIB_API_KEY',
  'OPENAI_API_KEY'
];

console.log('必須環境変数:');
requiredEnvVars.forEach(varName => {
  console.log(`   ${varName}: ${process.env[varName] ? '✅ 設定済み' : '❌ 未設定'}`);
});

console.log('\nオプション環境変数:');
optionalEnvVars.forEach(varName => {
  console.log(`   ${varName}: ${process.env[varName] ? '✅ 設定済み' : '⚠️  未設定（オプション）'}`);
});

// 6. セットアップ完了
console.log('\n🎉 セットアップが完了しました！\n');

console.log('次のステップ:');
console.log('1. .envファイルを編集して必要な環境変数を設定');
console.log('2. Supabaseでデータベーススキーマを実行');
console.log('3. LINE Developers ConsoleでBotを設定');
console.log('4. Google Cloud ConsoleでAPIを設定（オプション）');
console.log('5. npm run dev でサーバーを起動\n');

console.log('📚 詳細なセットアップ手順は README.md を参照してください');
console.log('🔗 LINE Bot Webhook URL: http://localhost:3000/webhook');
console.log('🔗 API ヘルスチェック: http://localhost:3000/health\n');

// 7. 開発サーバーの起動オプション
console.log('開発サーバーを起動しますか？ (y/n)');
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const input = data.trim().toLowerCase();
  if (input === 'y' || input === 'yes') {
    console.log('\n🚀 開発サーバーを起動中...');
    try {
      execSync('npm run dev', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ サーバーの起動に失敗しました:', error.message);
    }
  } else {
    console.log('\n👋 セットアップが完了しました。手動でサーバーを起動してください。');
    process.exit(0);
  }
});
