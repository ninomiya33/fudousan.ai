const express = require('express');
const router = express.Router();
// const lineBot = require('../services/lineBot');
const { supabase } = require('../config/database');
const cron = require('node-cron');

// リードステータス更新
router.post('/status', async (req, res) => {
  try {
    const { 
      lead_id, 
      status, 
      reason, 
      next_action,
      next_action_at,
      notes 
    } = req.body;

    if (!lead_id || !status) {
      return res.status(400).json({ error: 'lead_idとstatusが必要です' });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (reason) updateData.reason = reason;
    if (next_action) updateData.next_action = next_action;
    if (next_action_at) updateData.next_action_at = next_action_at;
    if (notes) updateData.notes = notes;

    const { data: updatedLead, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', lead_id)
      .select()
      .single();

    if (error) throw error;

    // LINEでステータス更新通知（一時的に無効化）
    // await sendLeadStatusNotification(updatedLead);

    res.json({
      success: true,
      lead: updatedLead,
      message: 'リードステータスが更新されました'
    });

  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({ error: 'リードステータスの更新に失敗しました' });
  }
});

// リード一覧取得
router.get('/list', async (req, res) => {
  try {
    const { 
      owner_id, 
      status, 
      limit = 20, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('leads')
      .select(`
        *,
        owners (
          name,
          phone,
          email
        ),
        properties (
          address,
          area,
          age,
          purpose
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: leads, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      leads: leads || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: leads ? leads.length : 0
      }
    });

  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'リード一覧の取得に失敗しました' });
  }
});

// リード詳細取得
router.get('/:lead_id', async (req, res) => {
  try {
    const { lead_id } = req.params;

    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        *,
        owners (
          name,
          phone,
          email,
          line_user_id
        ),
        properties (
          address,
          area,
          age,
          purpose
        ),
        lead_followups (
          id,
          action,
          notes,
          created_at
        )
      `)
      .eq('id', lead_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'リードが見つかりません' });
      }
      throw error;
    }

    res.json({
      success: true,
      lead
    });

  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'リード詳細の取得に失敗しました' });
  }
});

// リード統計情報
router.get('/stats/overview', async (req, res) => {
  try {
    const { owner_id } = req.query;

    let query = supabase.from('leads').select('*', { count: 'exact', head: true });

    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }

    const { count: totalLeads } = await query;

    // ステータス別の件数
    const statusCounts = {};
    const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

    for (const status of statuses) {
      let statusQuery = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', status);
      if (owner_id) {
        statusQuery = statusQuery.eq('owner_id', owner_id);
      }
      const { count } = await statusQuery;
      statusCounts[status] = count || 0;
    }

    // 今月の新規リード数
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    let thisMonthQuery = supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisMonth.toISOString());

    if (owner_id) {
      thisMonthQuery = thisMonthQuery.eq('owner_id', owner_id);
    }

    const { count: thisMonthLeads } = await thisMonthQuery;

    // 成約率
    const wonLeads = statusCounts.closed_won || 0;
    const totalClosed = (statusCounts.closed_won || 0) + (statusCounts.closed_lost || 0);
    const winRate = totalClosed > 0 ? (wonLeads / totalClosed) * 100 : 0;

    res.json({
      success: true,
      stats: {
        total_leads: totalLeads || 0,
        this_month_leads: thisMonthLeads || 0,
        status_counts: statusCounts,
        win_rate: Math.round(winRate),
        conversion_rate: totalLeads > 0 ? Math.round((totalClosed / totalLeads) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Get lead stats error:', error);
    res.status(500).json({ error: 'リード統計の取得に失敗しました' });
  }
});

// フォローアップ記録
router.post('/:lead_id/followup', async (req, res) => {
  try {
    const { lead_id } = req.params;
    const { action, notes, next_action, next_action_at } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'actionが必要です' });
    }

    // フォローアップ記録を作成
    const { data: followup, error: followupError } = await supabase
      .from('lead_followups')
      .insert({
        lead_id,
        action,
        notes,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (followupError) throw followupError;

    // リードの次のアクションを更新
    if (next_action || next_action_at) {
      const updateData = { updated_at: new Date().toISOString() };
      if (next_action) updateData.next_action = next_action;
      if (next_action_at) updateData.next_action_at = next_action_at;

      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead_id);

      if (leadUpdateError) throw leadUpdateError;
    }

    // LINEでフォローアップ通知（一時的に無効化）
    // await sendFollowupNotification(lead_id, action, notes);

    res.json({
      success: true,
      followup,
      message: 'フォローアップが記録されました'
    });

  } catch (error) {
    console.error('Create followup error:', error);
    res.status(500).json({ error: 'フォローアップの記録に失敗しました' });
  }
});

// フォローアップ履歴取得
router.get('/:lead_id/followups', async (req, res) => {
  try {
    const { lead_id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const { data: followups, error } = await supabase
      .from('lead_followups')
      .select('*')
      .eq('lead_id', lead_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      followups: followups || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: followups ? followups.length : 0
      }
    });

  } catch (error) {
    console.error('Get followups error:', error);
    res.status(500).json({ error: 'フォローアップ履歴の取得に失敗しました' });
  }
});

// リマインダー設定
router.post('/:lead_id/reminder', async (req, res) => {
  try {
    const { lead_id } = req.params;
    const { reminder_type, reminder_at, message } = req.body;

    if (!reminder_type || !reminder_at) {
      return res.status(400).json({ error: 'reminder_typeとreminder_atが必要です' });
    }

    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert({
        lead_id,
        type: reminder_type,
        scheduled_at: reminder_at,
        message: message || 'リードのフォローアップが必要です',
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // リードの次のアクションを更新
    await supabase
      .from('leads')
      .update({
        next_action: `reminder_${reminder_type}`,
        next_action_at: reminder_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead_id);

    res.json({
      success: true,
      reminder,
      message: 'リマインダーが設定されました'
    });

  } catch (error) {
    console.error('Set reminder error:', error);
    res.status(500).json({ error: 'リマインダーの設定に失敗しました' });
  }
});

// リマインダー一覧取得
router.get('/reminders/list', async (req, res) => {
  try {
    const { owner_id, status = 'pending' } = req.query;

    let query = supabase
      .from('reminders')
      .select(`
        *,
        leads (
          id,
          owners (
            name,
            phone
          ),
          properties (
            address
          )
        )
      `)
      .eq('status', status)
      .order('scheduled_at', { ascending: true });

    if (owner_id) {
      query = query.eq('leads.owner_id', owner_id);
    }

    const { data: reminders, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      reminders: reminders || []
    });

  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: 'リマインダー一覧の取得に失敗しました' });
  }
});

// リマインダー処理
router.put('/reminders/:reminder_id/process', async (req, res) => {
  try {
    const { reminder_id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'statusが必要です' });
    }

    const updateData = {
      status,
      processed_at: new Date().toISOString()
    };

    if (notes) updateData.notes = notes;

    const { data: reminder, error } = await supabase
      .from('reminders')
      .update(updateData)
      .eq('id', reminder_id)
      .select()
      .single();

    if (error) throw error;

    // LINEでリマインダー通知（一時的に無効化）
    // await sendReminderNotification(reminder);

    res.json({
      success: true,
      reminder,
      message: 'リマインダーが処理されました'
    });

  } catch (error) {
    console.error('Process reminder error:', error);
    res.status(500).json({ error: 'リマインダーの処理に失敗しました' });
  }
});

// 自動リマインダーチェック（毎日午前9時に実行）
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('🔔 自動リマインダーチェック開始...');

    const now = new Date();
    const { data: dueReminders, error } = await supabase
      .from('reminders')
      .select(`
        *,
        leads (
          id,
          owners (
            name,
            phone,
            line_user_id
          ),
          properties (
            address
          )
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now.toISOString());

    if (error) throw error;

    for (const reminder of dueReminders || []) {
      try {
        // リマインダーを処理済みに更新
        await supabase
          .from('reminders')
          .update({
            status: 'processed',
            processed_at: now.toISOString()
          })
          .eq('id', reminder.id);

        // LINEでリマインダー通知（一時的に無効化）
        // await sendReminderNotification(reminder);

        console.log(`✅ リマインダー処理完了: ${reminder.id}`);

      } catch (reminderError) {
        console.error(`❌ リマインダー処理エラー: ${reminder.id}`, reminderError);
      }
    }

    console.log(`🔔 自動リマインダーチェック完了: ${dueReminders?.length || 0}件処理`);

  } catch (error) {
    console.error('❌ 自動リマインダーチェックエラー:', error);
  }
});

// LINE通知関数（一時的に無効化）
async function sendLeadStatusNotification(lead) {
  try {
    const message = {
      type: 'text',
      text: `リードステータスが更新されました\n\n物件: ${lead.properties?.address}\nステータス: ${lead.status}\n次のアクション: ${lead.next_action || 'なし'}`
    };

    // await lineBot.client.pushMessage(lead.owners.line_user_id, message);
  } catch (error) {
    console.error('Send lead status notification error:', error);
  }
}

async function sendFollowupNotification(leadId, action, notes) {
  try {
    // リード情報を取得
    const { data: lead } = await supabase
      .from('leads')
      .select(`
        owners (
          line_user_id
        )
      `)
      .eq('id', leadId)
      .single();

    if (lead?.owners?.line_user_id) {
      const message = {
        type: 'text',
        text: `フォローアップが記録されました\n\nアクション: ${action}\nメモ: ${notes || 'なし'}`
      };

      // await lineBot.client.pushMessage(lead.owners.line_user_id, message);
    }
  } catch (error) {
    console.error('Send followup notification error:', error);
  }
}

async function sendReminderNotification(reminder) {
  try {
    const message = {
      type: 'text',
      text: `リードフォローアップのリマインダーです\n\n物件: ${reminder.leads?.properties?.address}\nメッセージ: ${reminder.message}`
    };

    // await lineBot.client.pushMessage(reminder.leads.owners.line_user_id, message);
  } catch (error) {
    console.error('Send reminder notification error:', error);
  }
}

module.exports = router;
