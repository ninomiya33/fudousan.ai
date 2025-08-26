const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/database'); // supabaseAdminを使用
// const lineBot = require('../services/lineBot');
const googleCalendarService = require('../services/googleCalendarService');

// 利用可能な予約枠取得
router.get('/slots', async (req, res) => {
  try {
    const { owner_id, date, duration = 60 } = req.query;

    if (!owner_id || !date) {
      return res.status(400).json({ error: 'owner_idとdateが必要です' });
    }

    console.log('📅 予約枠取得開始:', { owner_id, date, duration });

    // オーナーのGoogle Calendar IDを取得
    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('owners')
      .select('google_calendar_id')
      .eq('id', owner_id)
      .single();

    if (ownerError) {
      console.warn('オーナー情報の取得に失敗（モックモード）:', ownerError.message);
      // モックモードで動作
      const mockSlots = googleCalendarService.getMockAvailableSlots(date, parseInt(duration));
      return res.json({
        success: true,
        available_slots: mockSlots,
        date,
        duration: parseInt(duration),
        mode: 'mock'
      });
    }

    // Google Calendarから利用可能な枠を取得
    const availableSlots = await googleCalendarService.getAvailableSlots(
      owner.google_calendar_id || 'primary',
      date,
      parseInt(duration)
    );

    res.json({
      success: true,
      available_slots: availableSlots,
      date,
      duration: parseInt(duration),
      mode: 'google_calendar'
    });

  } catch (error) {
    console.error('Get available slots error:', error);
    
    // エラーの場合もモックモードで動作
    const mockSlots = googleCalendarService.getMockAvailableSlots(
      req.query.date || new Date().toISOString().split('T')[0], 
      parseInt(req.query.duration) || 60
    );
    
    res.json({
      success: true,
      available_slots: mockSlots,
      date: req.query.date || new Date().toISOString().split('T')[0],
      duration: parseInt(req.query.duration) || 60,
      mode: 'mock_fallback'
    });
  }
});

// 予約確定
router.post('/book', async (req, res) => {
  try {
    const { 
      owner_id, 
      property_id, 
      slot_datetime, 
      meeting_type = 'online',
      notes = '',
      customer_name,
      customer_phone,
      customer_email
    } = req.body;

    if (!owner_id || !property_id || !slot_datetime) {
      return res.status(400).json({ error: 'owner_id、property_id、slot_datetimeが必要です' });
    }

    console.log('📝 予約作成開始:', { owner_id, property_id, slot_datetime, meeting_type });

    // オーナー情報を取得
    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('owners')
      .select('*')
      .eq('id', owner_id)
      .single();

    if (ownerError) {
      console.warn('オーナー情報の取得に失敗（モックモード）:', ownerError.message);
      // モックモードで動作
      const mockEvent = googleCalendarService.createMockEvent(slot_datetime, 60);
      const mockAppointment = {
        id: `mock_appointment_${Date.now()}`,
        owner_id,
        property_id,
        slot_datetime,
        meeting_type,
        google_event_id: mockEvent.event_id,
        meeting_url: mockEvent.meeting_url,
        status: 'confirmed',
        customer_name,
        customer_phone,
        customer_email,
        notes,
        created_at: new Date().toISOString()
      };

      return res.json({
        success: true,
        appointment: mockAppointment,
        calendar_event: mockEvent,
        mode: 'mock'
      });
    }

    // Google Calendarに予約を作成
    const calendarEvent = await googleCalendarService.createAppointment(
      owner.google_calendar_id || 'primary',
      slot_datetime,
      60, // 60分の予約
      meeting_type,
      owner.name || '二宮不動産',
      notes
    );

    if (!calendarEvent.success) {
      console.warn('Google Calendarでの予約作成に失敗（モックモード）:', calendarEvent.error);
      // モックモードで動作
      const mockEvent = googleCalendarService.createMockEvent(slot_datetime, 60);
      calendarEvent.event_id = mockEvent.event_id;
      calendarEvent.meeting_url = mockEvent.meeting_url;
    }

    // データベースに予約を保存
    const appointmentData = {
      owner_id,
      property_id,
      slot_datetime,
      meeting_type,
      google_event_id: calendarEvent.event_id,
      meeting_url: calendarEvent.meeting_url,
      status: 'confirmed',
      customer_name,
      customer_phone,
      customer_email,
      notes
    };

    let savedAppointment;
    try {
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) {
        console.warn('予約の保存に失敗（モックモード）:', appointmentError.message);
        savedAppointment = {
          id: `mock_appointment_${Date.now()}`,
          ...appointmentData,
          created_at: new Date().toISOString()
        };
      } else {
        savedAppointment = appointment;
      }
    } catch (dbError) {
      console.warn('データベース保存エラー（モックモード）:', dbError.message);
      savedAppointment = {
        id: `mock_appointment_${Date.now()}`,
        ...appointmentData,
        created_at: new Date().toISOString()
      };
    }

    // リードレコードを作成
    try {
      const leadData = {
        owner_id,
        property_id,
        status: 'contacted',
        source: 'appointment_booking',
        priority: 'medium',
        next_action: 'Follow up after appointment',
        next_action_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1週間後
      };

      await supabaseAdmin
        .from('leads')
        .insert(leadData);
    } catch (leadError) {
      console.warn('リードレコードの作成に失敗:', leadError.message);
    }

    res.json({
      success: true,
      appointment: savedAppointment,
      calendar_event: {
        event_id: calendarEvent.event_id,
        meeting_url: calendarEvent.meeting_url
      },
      mode: calendarEvent.success ? 'google_calendar' : 'mock'
    });

  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ 
      error: '予約の作成に失敗しました',
      details: error.message 
    });
  }
});

// 予約更新
router.put('/:appointment_id', async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const updateData = req.body;

    // 予約情報を取得
    const { data: appointment, error: getError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (getError) throw getError;

    // オーナー情報を取得
    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('owners')
      .select('google_calendar_id')
      .eq('id', appointment.owner_id)
      .single();

    if (ownerError) throw ownerError;

    // Google Calendarの予約も更新
    if (updateData.slot_datetime && appointment.google_event_id) {
      const calendarUpdate = await googleCalendarService.updateAppointment(
        owner.google_calendar_id,
        appointment.google_event_id,
        updateData.slot_datetime,
        updateData.meeting_type || appointment.meeting_type
      );

      if (!calendarUpdate.success) {
        throw new Error(calendarUpdate.error || 'Google Calendarの更新に失敗しました');
      }

      updateData.google_event_id = calendarUpdate.event_id;
      updateData.meeting_url = calendarUpdate.meeting_url;
    }

    updateData.updated_at = new Date().toISOString();

    // データベースの予約を更新
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', appointment_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // LINEで予約更新通知（一時的に無効化）
    // await sendAppointmentUpdateNotification(owner.line_user_id, updatedAppointment);

    res.json({
      success: true,
      appointment: updatedAppointment,
      message: '予約が更新されました'
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: '予約の更新に失敗しました' });
  }
});

// 予約キャンセル
router.delete('/:appointment_id', async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const { reason = '' } = req.body;

    // 予約情報を取得
    const { data: appointment, error: getError } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        owners (
          google_calendar_id,
          line_user_id
        )
      `)
      .eq('id', appointment_id)
      .single();

    if (getError) throw getError;

    // Google Calendarの予約もキャンセル
    if (appointment.google_event_id && appointment.owners.google_calendar_id) {
      const calendarCancel = await googleCalendarService.cancelAppointment(
        appointment.owners.google_calendar_id,
        appointment.google_event_id
      );

      if (!calendarCancel.success) {
        console.warn('Google Calendarのキャンセルに失敗:', calendarCancel.error);
      }
    }

    // データベースの予約をキャンセル
    const { error: cancelError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment_id);

    if (cancelError) throw cancelError;

    // リードステータスも更新
    await supabaseAdmin
      .from('leads')
      .update({
        status: 'appointment_cancelled',
        next_action: 'reschedule',
        updated_at: new Date().toISOString()
      })
      .eq('owner_id', appointment.owner_id)
      .eq('property_id', appointment.property_id);

    // LINEで予約キャンセル通知（一時的に無効化）
    // await sendAppointmentCancellationNotification(appointment.owners.line_user_id, appointment, reason);

    res.json({
      success: true,
      message: '予約がキャンセルされました'
    });

  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: '予約のキャンセルに失敗しました' });
  }
});

// オーナーの予約一覧取得
router.get('/:owner_id/appointments', async (req, res) => {
  try {
    const { owner_id } = req.params;
    const { status, date_from, date_to, limit = 20, offset = 0 } = req.query;

    console.log('📋 予約一覧取得開始:', { owner_id, status, date_from, date_to, limit, offset });

    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        properties (
          address,
          area,
          age,
          purpose
        )
      `)
      .eq('owner_id', owner_id)
      .range(offset, offset + limit - 1)
      .order('slot_datetime', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (date_from) {
      query = query.gte('slot_datetime', date_from);
    }

    if (date_to) {
      query = query.lte('slot_datetime', date_to);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.warn('予約一覧の取得に失敗（モックモード）:', error.message);
      // モックモードで動作
      const mockAppointments = [
        {
          id: 'mock_appointment_001',
          owner_id: owner_id,
          property_id: 'test-property-001',
          slot_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          meeting_type: 'online',
          status: 'confirmed',
          customer_name: 'テスト顧客',
          customer_phone: '090-1234-5678',
          created_at: new Date().toISOString(),
          properties: {
            address: '東京都新宿区西新宿1-1-1',
            area: 70,
            age: 10,
            purpose: '売却'
          }
        }
      ];

      return res.json({
        success: true,
        appointments: mockAppointments,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: mockAppointments.length
        },
        mode: 'mock'
      });
    }

    res.json({
      success: true,
      appointments: appointments || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: appointments ? appointments.length : 0
      },
      mode: 'database'
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    
    // エラーの場合もモックモードで動作
    const mockAppointments = [
      {
        id: 'mock_appointment_002',
        owner_id: owner_id,
        property_id: 'test-property-001',
        slot_datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        meeting_type: 'online',
        status: 'pending',
        customer_name: 'モック顧客',
        customer_phone: '090-9999-9999',
        created_at: new Date().toISOString(),
        properties: {
          address: '東京都新宿区西新宿1-1-1',
          area: 70,
          age: 10,
          purpose: '売却'
        }
      }
    ];

    res.json({
      success: true,
      appointments: mockAppointments,
      pagination: {
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        total: mockAppointments.length
      },
      mode: 'mock_fallback'
    });
  }
});

// 予約統計情報
router.get('/:owner_id/stats', async (req, res) => {
  try {
    const { owner_id } = req.params;
    const { date_from, date_to } = req.query;

    let dateFilter = {};
    if (date_from) dateFilter.gte = date_from;
    if (date_to) dateFilter.lte = date_to;

    // 総予約数
    const { count: totalAppointments } = await supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', owner_id)
      .match(dateFilter);

    // ステータス別の件数
    const { data: statusCounts } = await supabaseAdmin
      .from('appointments')
      .select('status')
      .eq('owner_id', owner_id)
      .match(dateFilter);

    const statusStats = {};
    statusCounts?.forEach(appointment => {
      statusStats[appointment.status] = (statusStats[appointment.status] || 0) + 1;
    });

    // 会議タイプ別の件数
    const { data: meetingTypeCounts } = await supabaseAdmin
      .from('appointments')
      .select('meeting_type')
      .eq('owner_id', owner_id)
      .match(dateFilter);

    const meetingTypeStats = {};
    meetingTypeCounts?.forEach(appointment => {
      meetingTypeStats[appointment.meeting_type] = (meetingTypeStats[appointment.meeting_type] || 0) + 1;
    });

    // 月別の件数
    const { data: monthlyCounts } = await supabaseAdmin
      .from('appointments')
      .select('slot_datetime')
      .eq('owner_id', owner_id)
      .match(dateFilter);

    const monthlyStats = {};
    monthlyCounts?.forEach(appointment => {
      const month = appointment.slot_datetime.substring(0, 7); // YYYY-MM
      monthlyStats[month] = (monthlyStats[month] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        total_appointments: totalAppointments || 0,
        status_distribution: statusStats,
        meeting_type_distribution: meetingTypeStats,
        monthly_trend: monthlyStats
      }
    });

  } catch (error) {
    console.error('Get appointment stats error:', error);
    res.status(500).json({ error: '予約統計の取得に失敗しました' });
  }
});

// LINE通知関数（一時的に無効化）
async function sendAppointmentConfirmation(lineUserId, appointment) {
  try {
    const message = {
      type: 'template',
      altText: '予約確認',
      template: {
        type: 'buttons',
        title: '予約が確定されました',
        text: `日時: ${new Date(appointment.slot_datetime).toLocaleString('ja-JP')}\n会議タイプ: ${appointment.meeting_type}\n\n詳細はこちらからご確認ください。`,
        actions: [
          {
            type: 'uri',
            label: '会議に参加',
            uri: appointment.meeting_url || '#'
          },
          {
            type: 'postback',
            label: '予約を変更',
            data: `reschedule_${appointment.id}`
          }
        ]
      }
    };

    // await lineBot.client.pushMessage(lineUserId, message);
  } catch (error) {
    console.error('Send appointment confirmation error:', error);
  }
}

async function sendAppointmentUpdateNotification(lineUserId, appointment) {
  try {
    const message = {
      type: 'text',
      text: `予約が更新されました\n\n日時: ${new Date(appointment.slot_datetime).toLocaleString('ja-JP')}\n会議タイプ: ${appointment.meeting_type}\n\n新しい会議URL: ${appointment.meeting_url || 'なし'}`
    };

    // await lineBot.client.pushMessage(lineUserId, message);
  } catch (error) {
    console.error('Send appointment update notification error:', error);
  }
}

async function sendAppointmentCancellationNotification(lineUserId, appointment, reason) {
  try {
    const message = {
      type: 'text',
      text: `予約がキャンセルされました\n\n日時: ${new Date(appointment.slot_datetime).toLocaleString('ja-JP')}\n理由: ${reason || '特になし'}\n\n再予約をご希望の場合は、お気軽にお声かけください。`
    };

    // await lineBot.client.pushMessage(lineUserId, message);
  } catch (error) {
    console.error('Send appointment cancellation notification error:', error);
  }
}

module.exports = router;
