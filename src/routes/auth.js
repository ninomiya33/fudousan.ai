const express = require('express');
const router = express.Router();
const { supabase } = require('../config/database');
// const lineBot = require('../services/lineBot');

// オンボーディング（同意・登録）
router.post('/onboard', async (req, res) => {
  try {
    const { 
      line_user_id, 
      name, 
      phone, 
      consent_learning,
      address,
      area,
      age,
      purpose
    } = req.body;

    if (!line_user_id || !name || !phone) {
      return res.status(400).json({ error: 'line_user_id、name、phoneが必要です' });
    }

    // 既存ユーザーのチェック
    const { data: existingUser, error: checkError } = await supabase
      .from('owners')
      .select('*')
      .eq('line_user_id', line_user_id)
      .single();

    if (existingUser) {
      // 既存ユーザーの更新
      const { data: updatedUser, error: updateError } = await supabase
        .from('owners')
        .update({
          name,
          phone,
          consent_learning: consent_learning || false,
          status: 'active',
          step: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('line_user_id', line_user_id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 査定情報がある場合は物件テーブルにも保存
      if (address && area && age && purpose) {
        await supabase
          .from('properties')
          .insert({
            line_user_id,
            address,
            area: parseFloat(area),
            age: parseInt(age),
            purpose,
            status: 'pending_appraisal'
          });
      }

      res.json({
        success: true,
        user: updatedUser,
        message: 'ユーザー情報が更新されました'
      });

    } else {
      // 新規ユーザーの作成
      const { data: newUser, error: insertError } = await supabase
        .from('owners')
        .insert({
          line_user_id,
          name,
          phone,
          consent_learning: consent_learning || false,
          status: 'active',
          step: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 査定情報がある場合は物件テーブルにも保存
      if (address && area && age && purpose) {
        await supabase
          .from('properties')
          .insert({
            line_user_id,
            address,
            area: parseFloat(area),
            age: parseInt(age),
            purpose,
            status: 'pending_appraisal'
          });
      }

      res.json({
        success: true,
        user: newUser,
        message: 'ユーザー登録が完了しました'
      });
    }

  } catch (error) {
    console.error('Onboard error:', error);
    res.status(500).json({ error: 'オンボーディングに失敗しました' });
  }
});

// ユーザー情報取得
router.get('/user/:line_user_id', async (req, res) => {
  try {
    const { line_user_id } = req.params;

    const { data: user, error } = await supabase
      .from('owners')
      .select(`
        *,
        properties (
          id,
          address,
          area,
          age,
          purpose,
          status
        ),
        appraisals (
          id,
          status,
          final_result,
          created_at
        )
      `)
      .eq('line_user_id', line_user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'ユーザーが見つかりません' });
      }
      throw error;
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
  }
});

// ユーザー情報更新
router.put('/user/:line_user_id', async (req, res) => {
  try {
    const { line_user_id } = req.params;
    const updateData = req.body;

    // 更新可能なフィールドのみを抽出
    const allowedFields = [
      'name', 'phone', 'email', 'consent_learning', 
      'google_calendar_id', 'preferences'
    ];
    
    const filteredData = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    filteredData.updated_at = new Date().toISOString();

    const { data: updatedUser, error } = await supabase
      .from('owners')
      .update(filteredData)
      .eq('line_user_id', line_user_id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      user: updatedUser,
      message: 'ユーザー情報が更新されました'
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'ユーザー情報の更新に失敗しました' });
  }
});

// 同意設定の更新
router.put('/consent/:line_user_id', async (req, res) => {
  try {
    const { line_user_id } = req.params;
    const { consent_learning, consent_marketing, consent_third_party } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (consent_learning !== undefined) updateData.consent_learning = consent_learning;
    if (consent_marketing !== undefined) updateData.consent_marketing = consent_marketing;
    if (consent_third_party !== undefined) updateData.consent_third_party = consent_third_party;

    const { data: updatedUser, error } = await supabase
      .from('owners')
      .update(updateData)
      .eq('line_user_id', line_user_id)
      .select()
      .single();

    if (error) throw error;

    // LINEで同意設定の更新を通知（一時的に無効化）
    // await lineBot.client.pushMessage(line_user_id, {
    //   type: 'text',
    //   text: '同意設定が更新されました。'
    // });

    res.json({
      success: true,
      user: updatedUser,
      message: '同意設定が更新されました'
    });

  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json({ error: '同意設定の更新に失敗しました' });
  }
});

// ユーザー削除（アカウント無効化）
router.delete('/user/:line_user_id', async (req, res) => {
  try {
    const { line_user_id } = req.params;

    // ユーザーのステータスを無効化
    const { error } = await supabase
      .from('owners')
      .update({
        status: 'inactive',
        deactivated_at: new Date().toISOString()
      })
      .eq('line_user_id', line_user_id);

    if (error) throw error;

    // 関連する予約もキャンセル
    await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('owner_id', line_user_id);

    // リードステータスも更新
    await supabase
      .from('leads')
      .update({ 
        status: 'inactive',
        next_action: 'none'
      })
      .eq('owner_id', line_user_id);

    res.json({
      success: true,
      message: 'アカウントが無効化されました'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'アカウントの無効化に失敗しました' });
  }
});

// ユーザー統計情報
router.get('/stats/:line_user_id', async (req, res) => {
  try {
    const { line_user_id } = req.params;

    // 各種統計情報を取得
    const [
      { count: propertyCount },
      { count: appraisalCount },
      { count: appointmentCount },
      { count: leadCount }
    ] = await Promise.all([
      supabase.from('properties').select('*', { count: 'exact', head: true }).eq('line_user_id', line_user_id),
      supabase.from('appraisals').select('*', { count: 'exact', head: true }).eq('properties.line_user_id', line_user_id),
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('owner_id', line_user_id),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('owner_id', line_user_id)
    ]);

    // 査定成功率
    const { data: successfulAppraisals } = await supabase
      .from('appraisals')
      .select('*', { count: 'exact', head: true })
      .eq('properties.line_user_id', line_user_id)
      .eq('status', 'completed');

    const successRate = appraisalCount > 0 ? (successfulAppraisals / appraisalCount) * 100 : 0;

    res.json({
      success: true,
      stats: {
        properties: propertyCount || 0,
        appraisals: appraisalCount || 0,
        appointments: appointmentCount || 0,
        leads: leadCount || 0,
        appraisal_success_rate: Math.round(successRate)
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: '統計情報の取得に失敗しました' });
  }
});

// ユーザー検索
router.get('/search', async (req, res) => {
  try {
    const { query, status, limit = 20, offset = 0 } = req.query;

    let searchQuery = supabase
      .from('owners')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (query) {
      searchQuery = searchQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%,line_user_id.ilike.%${query}%`);
    }

    if (status) {
      searchQuery = searchQuery.eq('status', status);
    }

    const { data: users, error } = await searchQuery;

    if (error) throw error;

    res.json({
      success: true,
      users: users || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: users ? users.length : 0
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'ユーザー検索に失敗しました' });
  }
});

module.exports = router;
