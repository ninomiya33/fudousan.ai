-- 二宮不動産査定システム用 データベースセットアップ
-- 新しいSupabaseプロジェクト用

-- 1. オーナーテーブル
CREATE TABLE IF NOT EXISTS owners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    line_user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    consent_given BOOLEAN DEFAULT false,
    google_calendar_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 物件テーブル
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    line_user_id TEXT NOT NULL,
    address TEXT NOT NULL,
    area DECIMAL(10,2),
    age INTEGER,
    purpose TEXT,
    appraisal_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PDFレポートテーブル
CREATE TABLE IF NOT EXISTS pdf_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    line_user_id TEXT NOT NULL,
    pdf_url TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_owners_line_user_id ON owners(line_user_id);
CREATE INDEX IF NOT EXISTS idx_properties_line_user_id ON properties(line_user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_reports_property_id ON pdf_reports(property_id);
CREATE INDEX IF NOT EXISTS idx_pdf_reports_line_user_id ON pdf_reports(line_user_id);

-- 5. RLSポリシーの設定
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_reports ENABLE ROW LEVEL SECURITY;

-- owners テーブルのRLSポリシー
CREATE POLICY "Users can view their own data" ON owners
    FOR ALL USING (line_user_id = current_setting('app.current_user_id', true)::text);

-- properties テーブルのRLSポリシー
CREATE POLICY "Users can view their own properties" ON properties
    FOR ALL USING (line_user_id = current_setting('app.current_user_id', true)::text);

-- pdf_reports テーブルのRLSポリシー
CREATE POLICY "Users can view their own reports" ON pdf_reports
    FOR ALL USING (line_user_id = current_setting('app.current_user_id', true)::text);

-- 6. 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 完了メッセージ
SELECT 'Database setup completed successfully!' as status;
