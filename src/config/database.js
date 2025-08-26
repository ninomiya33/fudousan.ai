const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase, supabaseAdmin;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase環境変数が設定されていません。モックモードで動作します。');
  
  // モッククライアントを作成
  supabase = {
    from: (table) => ({
      select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
      insert: () => ({ select: () => ({ single: () => ({ data: { id: 'mock_id' }, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) }),
      delete: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) })
    }),
    storage: {
      from: (bucket) => ({
        upload: () => Promise.resolve({ data: { path: 'mock_path' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://mock-url.com/mock.pdf' } }),
        remove: () => Promise.resolve({ error: null })
      })
    }
  };
  
  supabaseAdmin = supabase;
} else {
  try {
    // 通常のクライアント（匿名キー）
    supabase = createClient(supabaseUrl, supabaseAnonKey);

    // サービスロールキーを使用したクライアント（管理者権限）
    if (supabaseServiceKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    } else {
      supabaseAdmin = supabase; // サービスロールキーがない場合は匿名クライアントを使用
    }
    
    console.log('✅ Supabase接続が確立されました');
    
    // ストレージバケットの初期化を試行
    initializeStorageBuckets();
    
  } catch (error) {
    console.error('❌ Supabase接続エラー:', error.message);
    console.warn('⚠️  モックモードで動作します');
    
    // エラーが発生した場合はモッククライアントを使用
    supabase = {
      from: (table) => ({
        select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: () => ({ data: { id: 'mock_id' }, error: null }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) }),
        delete: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) })
      }),
      storage: {
        from: (bucket) => ({
          upload: () => Promise.resolve({ data: { path: 'mock_path' }, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: 'https://mock-url.com/mock.pdf' } }),
          remove: () => Promise.resolve({ error: null })
        })
      }
    };
    
    supabaseAdmin = supabase;
  }
}

// ストレージバケットの初期化
async function initializeStorageBuckets() {
  try {
    console.log('📦 ストレージバケットの初期化を開始...');
    
    // PDF保存用のバケットが存在するかチェック
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    
    if (error) {
      console.warn('⚠️  ストレージバケットの確認に失敗:', error.message);
      console.log('📦 ストレージ初期化をスキップしてサーバーを起動します');
      return;
    }
    
    // pdfsバケットが存在する場合は削除して再作成
    const pdfsBucket = buckets.find(bucket => bucket.name === 'pdfs');
    if (pdfsBucket) {
      console.log('📦 既存のPDFバケットを削除中...');
      
      try {
        // バケット内のファイルを削除
        const { data: files, error: listError } = await supabaseAdmin.storage
          .from('pdfs')
          .list();
        
        if (!listError && files && files.length > 0) {
          const fileNames = files.map(file => file.name);
          await supabaseAdmin.storage
            .from('pdfs')
            .remove(fileNames);
        }
        
        // バケットを削除
        const { error: deleteError } = await supabaseAdmin.storage.deleteBucket('pdfs');
        if (deleteError) {
          console.warn('⚠️  既存バケットの削除に失敗:', deleteError.message);
        }
      } catch (deleteError) {
        console.warn('⚠️  バケット削除中にエラー:', deleteError.message);
      }
    }
    
    // 新しいバケットを作成
    console.log('📦 PDF保存用のストレージバケットを作成中...');
    
    try {
      const { error: createError } = await supabaseAdmin.storage.createBucket('pdfs', {
        public: true,
        allowedMimeTypes: ['application/pdf'],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.warn('⚠️  PDFバケットの作成に失敗:', createError.message);
        console.log('📦 ストレージ初期化をスキップしてサーバーを起動します');
      } else {
        console.log('✅ PDF保存用のストレージバケットが作成されました');
      }
    } catch (createError) {
      console.warn('⚠️  バケット作成中にエラー:', createError.message);
      console.log('📦 ストレージ初期化をスキップしてサーバーを起動します');
    }
    
  } catch (error) {
    console.warn('⚠️  ストレージバケットの初期化に失敗:', error.message);
    console.log('📦 ストレージ初期化をスキップしてサーバーを起動します');
  }
}

module.exports = {
  supabase,
  supabaseAdmin
};
