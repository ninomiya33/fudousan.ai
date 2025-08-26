-- 二宮不動産査定システム データベーススキーマ
-- Supabase (PostgreSQL) 用

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- オーナーテーブル（物件所有者）
CREATE TABLE owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_user_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    display_name VARCHAR(255),
    picture_url TEXT,
    consent_learning BOOLEAN DEFAULT false,
    consent_marketing BOOLEAN DEFAULT false,
    consent_third_party BOOLEAN DEFAULT false,
    google_calendar_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    step VARCHAR(50) DEFAULT 'onboarding',
    preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deactivated_at TIMESTAMP WITH TIME ZONE
);

-- 物件テーブル
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_user_id VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    area DECIMAL(10,2),
    age INTEGER,
    purpose VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending_appraisal',
    additional_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (line_user_id) REFERENCES owners(line_user_id) ON DELETE CASCADE
);

-- 査定テーブル
CREATE TABLE appraisals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL,
    reinfolib_data JSONB,
    corrected_data JSONB,
    ai_prediction JSONB,
    final_result JSONB,
    status VARCHAR(50) DEFAULT 'processing',
    confidence_score DECIMAL(3,2),
    nearby_count INTEGER,
    radius_km DECIMAL(5,2),
    period_months INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- 予約テーブル
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    slot_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 60, -- 分単位
    meeting_type VARCHAR(50) DEFAULT 'online', -- online, offline
    meeting_url TEXT,
    google_calendar_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
);

-- リード管理テーブル
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    appointment_id UUID,
    property_id UUID,
    appraisal_id UUID,
    status VARCHAR(50) DEFAULT 'new',
    source VARCHAR(100) DEFAULT 'line_bot',
    reason TEXT, -- 失注理由
    next_action VARCHAR(255),
    next_action_at TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    template_type VARCHAR(50) DEFAULT 'standard',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    FOREIGN KEY (appraisal_id) REFERENCES appraisals(id) ON DELETE SET NULL
);

-- リードフォローアップテーブル
CREATE TABLE lead_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_notes TEXT NOT NULL,
    next_action VARCHAR(255),
    next_action_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(50) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- リマインダーテーブル
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    action VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- PDFレポートテーブル
CREATE TABLE IF NOT EXISTS pdf_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id UUID, -- 物件IDを追加
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  appraisal_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

-- PDFレポート用のインデックス
CREATE INDEX IF NOT EXISTS idx_pdf_reports_user_id ON pdf_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_reports_created_at ON pdf_reports(created_at);

-- PDFレポートのRLSポリシー設定
ALTER TABLE pdf_reports ENABLE ROW LEVEL SECURITY;

-- パブリックアクセスを許可するポリシー
CREATE POLICY "Allow public access to pdf_reports" ON pdf_reports
    FOR ALL USING (true);

-- インデックスの作成
CREATE INDEX idx_owners_line_user_id ON owners(line_user_id);
CREATE INDEX idx_owners_status ON owners(status);
CREATE INDEX idx_properties_line_user_id ON properties(line_user_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_appraisals_property_id ON appraisals(property_id);
CREATE INDEX idx_appraisals_status ON appraisals(status);
CREATE INDEX idx_appointments_owner_id ON appointments(owner_id);
CREATE INDEX idx_appointments_slot_datetime ON appointments(slot_datetime);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_next_action_at ON leads(next_action_at);
CREATE INDEX idx_lead_followups_lead_id ON lead_followups(lead_id);
CREATE INDEX idx_reminders_lead_id ON reminders(lead_id);
CREATE INDEX idx_reminders_scheduled_at ON reminders(scheduled_at);
CREATE INDEX idx_reminders_status ON reminders(status);

-- 全文検索用のインデックス
CREATE INDEX idx_properties_address_gin ON properties USING gin(to_tsvector('japanese', address));
CREATE INDEX idx_owners_name_gin ON owners USING gin(to_tsvector('japanese', name));

-- 更新日時の自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルに更新日時トリガーを設定
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appraisals_updated_at BEFORE UPDATE ON appraisals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdf_reports_updated_at BEFORE UPDATE ON pdf_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 統計情報用のビュー
CREATE VIEW lead_summary AS
SELECT 
    l.id,
    l.status,
    l.source,
    l.created_at,
    o.name as owner_name,
    o.phone as owner_phone,
    p.address as property_address,
    p.area as property_area,
    p.purpose as property_purpose,
    a.final_result as appraisal_result,
    app.slot_datetime as appointment_datetime
FROM leads l
LEFT JOIN owners o ON l.owner_id = o.id
LEFT JOIN properties p ON l.property_id = p.id
LEFT JOIN appraisals a ON l.appraisal_id = a.id
LEFT JOIN appointments app ON l.appointment_id = app.id;

-- 査定統計用のビュー
CREATE VIEW appraisal_summary AS
SELECT 
    a.id,
    a.status,
    a.confidence_score,
    a.nearby_count,
    a.radius_km,
    a.period_months,
    a.created_at,
    p.address,
    p.area,
    p.age,
    p.purpose,
    o.name as owner_name
FROM appraisals a
JOIN properties p ON a.property_id = p.id
JOIN owners o ON p.line_user_id = o.line_user_id;

-- PDFレポート統計用のビュー
CREATE VIEW pdf_reports_summary AS
SELECT 
    pr.id,
    pr.user_id,
    pr.filename,
    pr.created_at,
    pr.appraisal_data->>'address' as property_address,
    pr.appraisal_data->>'area' as property_area,
    pr.appraisal_data->>'purpose' as property_purpose
FROM pdf_reports pr
ORDER BY pr.created_at DESC;

-- 予約統計用のビュー
CREATE VIEW appointment_summary AS
SELECT 
    app.id,
    app.slot_datetime,
    app.duration,
    app.meeting_type,
    app.status,
    app.created_at,
    o.name as owner_name,
    o.phone as owner_phone
FROM appointments app
JOIN owners o ON app.owner_id = o.id;

-- RLS (Row Level Security) の設定
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- 基本的なRLSポリシー（必要に応じて調整）
CREATE POLICY "Owners can view own data" ON owners
    FOR SELECT USING (line_user_id = current_user);

CREATE POLICY "Properties can be viewed by owner" ON properties
    FOR SELECT USING (line_user_id = current_user);

CREATE POLICY "Appraisals can be viewed by property owner" ON appraisals
    FOR SELECT USING (
        property_id IN (
            SELECT id FROM properties WHERE line_user_id = current_user
        )
    );

-- サンプルデータの挿入（開発用）
INSERT INTO owners (line_user_id, name, phone, status, step) VALUES
('U1234567890abcdef', '田中太郎', '090-1234-5678', 'active', 'completed'),
('U0987654321fedcba', '佐藤花子', '080-8765-4321', 'active', 'completed');

INSERT INTO properties (line_user_id, address, area, age, purpose, status) VALUES
('U1234567890abcdef', '東京都渋谷区渋谷1-1-1', 85.5, 15, '住宅', 'appraised'),
('U0987654321fedcba', '東京都新宿区新宿2-2-2', 120.0, 8, '店舗', 'pending_appraisal');

-- 権限の設定
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
