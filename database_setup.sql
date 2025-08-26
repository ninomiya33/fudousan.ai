-- 予約システムとPDF生成に必要なテーブル作成

-- 1. 予約テーブル
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    slot_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_type VARCHAR(50) DEFAULT 'online' CHECK (meeting_type IN ('online', 'in_person', 'phone')),
    google_event_id VARCHAR(255),
    meeting_url TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. リード管理テーブル
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    appraisal_id UUID REFERENCES appraisals(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
    source VARCHAR(100) DEFAULT 'line_bot',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    estimated_value DECIMAL(15,2),
    next_action TEXT,
    next_action_at TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. リマインダーテーブル
CREATE TABLE IF NOT EXISTS reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'followup' CHECK (type IN ('followup', 'pdf_send', 'appointment_reminder', 'custom')),
    message TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_appointments_owner_id ON appointments(owner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_property_id ON appointments(property_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot_datetime ON appointments(slot_datetime);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_next_action_at ON leads(next_action_at);

CREATE INDEX IF NOT EXISTS idx_reminders_lead_id ON reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);

-- 5. RLSポリシーの設定
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- appointments テーブルのRLSポリシー
CREATE POLICY "Users can view their own appointments" ON appointments
    FOR SELECT USING (owner_id IN (
        SELECT id FROM owners WHERE line_user_id = current_setting('app.current_user_id', true)::text
    ));

CREATE POLICY "Users can insert their own appointments" ON appointments
    FOR INSERT WITH CHECK (owner_id IN (
        SELECT id FROM owners WHERE line_user_id = current_setting('app.current_user_id', true)::text
    ));

CREATE POLICY "Users can update their own appointments" ON appointments
    FOR UPDATE USING (owner_id IN (
        SELECT id FROM owners WHERE line_user_id = current_setting('app.current_user_id', true)::text
    ));

-- leads テーブルのRLSポリシー
CREATE POLICY "Users can view their own leads" ON leads
    FOR SELECT USING (owner_id IN (
        SELECT id FROM owners WHERE line_user_id = current_setting('app.current_user_id', true)::text
    ));

CREATE POLICY "Users can insert their own leads" ON leads
    FOR INSERT WITH CHECK (owner_id IN (
        SELECT id FROM owners WHERE line_user_id = current_setting('app.current_user_id', true)::text
    ));

CREATE POLICY "Users can update their own leads" ON leads
    FOR UPDATE USING (owner_id IN (
        SELECT id FROM owners WHERE line_user_id = current_setting('app.current_user_id', true)::text
    ));

-- reminders テーブルのRLSポリシー
CREATE POLICY "Users can view their own reminders" ON reminders
    FOR SELECT USING (lead_id IN (
        SELECT l.id FROM leads l 
        JOIN owners o ON l.owner_id = o.id 
        WHERE o.line_user_id = current_setting('app.current_user_id', true)::text
    ));

CREATE POLICY "Users can insert their own reminders" ON reminders
    FOR INSERT WITH CHECK (lead_id IN (
        SELECT l.id FROM leads l 
        JOIN owners o ON l.owner_id = o.id 
        WHERE o.line_user_id = current_setting('app.current_user_id', true)::text
    ));

CREATE POLICY "Users can update their own reminders" ON reminders
    FOR UPDATE USING (lead_id IN (
        SELECT l.id FROM leads l 
        JOIN owners o ON l.owner_id = o.id 
        WHERE o.line_user_id = current_setting('app.current_user_id', true)::text
    ));

-- 6. サンプルデータの挿入（テスト用）
INSERT INTO owners (id, line_user_id, name, phone, email, consent_given, google_calendar_id) 
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'U1234567890abcdef', 'テスト太郎', '090-1234-5678', 'test@example.com', true, 'test@group.calendar.google.com')
ON CONFLICT (line_user_id) DO NOTHING;

-- 7. 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 完了メッセージ
SELECT 'Database setup completed successfully!' as status;
