-- テスト用サンプルデータ作成

-- 1. テスト用オーナーの作成（既存のものがあれば更新）
INSERT INTO owners (id, line_user_id, name, phone, email, consent_given, google_calendar_id) 
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'U1234567890abcdef', 'テスト太郎', '090-1234-5678', 'test@example.com', true, 'test@group.calendar.google.com')
ON CONFLICT (line_user_id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    consent_given = EXCLUDED.consent_given,
    google_calendar_id = EXCLUDED.google_calendar_id;

-- 2. テスト用物件の作成
INSERT INTO properties (id, line_user_id, address, area, age, purpose, created_at)
VALUES 
    ('test-property-001', 'U1234567890abcdef', '東京都新宿区西新宿1-1-1', 70, 10, '売却', NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. テスト用査定の作成
INSERT INTO appraisals (id, property_id, reinfolib_data, corrected_data, ai_prediction, created_at)
VALUES 
    ('test-appraisal-001', 'test-property-001', 
     '{"nearby_properties": [], "radius": 1, "period": 12}', 
     '{}', 
     '{"success": true, "min_price": 40500000, "max_price": 49500000, "confidence": 0.8}', 
     NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. テスト用リードの作成
INSERT INTO leads (id, owner_id, property_id, appraisal_id, status, source, priority, next_action, next_action_at, created_at)
VALUES 
    ('test-lead-001', '550e8400-e29b-41d4-a716-446655440000', 'test-property-001', 'test-appraisal-001', 
     'new', 'line_bot', 'medium', 'Initial contact', NOW() + INTERVAL '1 day', NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. テスト用予約の作成
INSERT INTO appointments (id, owner_id, property_id, slot_datetime, meeting_type, status, customer_name, customer_phone, created_at)
VALUES 
    ('test-appointment-001', '550e8400-e29b-41d4-a716-446655440000', 'test-property-001', 
     NOW() + INTERVAL '2 days', 'online', 'confirmed', 'テスト顧客', '090-8765-4321', NOW())
ON CONFLICT (id) DO NOTHING;

-- 完了メッセージ
SELECT 'Test data created successfully!' as status;
