const { google } = require('googleapis');
const googleServiceAccount = require('./googleServiceAccount');

class GoogleCalendarService {
  constructor() {
    this.serviceAccount = googleServiceAccount;
    
    if (!this.serviceAccount.isConfigured) {
      console.warn('Google Calendar API credentials not configured');
    }
  }

  // 空き枠の取得
  async getAvailableSlots(calendarId, date, duration) {
    try {
      if (!this.serviceAccount.isConfigured) {
        console.warn('Google Calendar not authenticated, returning mock slots');
        return this.getMockAvailableSlots(date, duration);
      }

      const calendar = await this.serviceAccount.getCalendarClient();
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      // 既存のイベントを取得
      const response = await calendar.events.list({
        calendarId: calendarId || 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      const busySlots = this.parseBusySlots(events);
      
      // 営業時間内の空き枠を生成
      const availableSlots = this.generateAvailableSlots(
        startDate,
        duration,
        busySlots
      );

      return availableSlots;

    } catch (error) {
      console.error('Get available slots error:', error);
      return this.getMockAvailableSlots(date, duration);
    }
  }

  // 予約イベントの作成
  async createAppointment(calendarId, slotDatetime, duration, meetingType, ownerName, notes = '') {
    try {
      if (!this.serviceAccount.isConfigured) {
        console.warn('Google Calendar not authenticated, returning mock event');
        return this.createMockEvent(slotDatetime, duration);
      }

      const calendar = await this.serviceAccount.getCalendarClient();
      const startTime = new Date(slotDatetime);
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      const event = {
        summary: `不動産査定相談 - ${ownerName}`,
        description: notes || '不動産査定のご相談',
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Tokyo'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Tokyo'
        },
        attendees: [
          { email: 'ninomiya@fudousan.com', displayName: '二宮不動産' }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1日前
            { method: 'popup', minutes: 30 }       // 30分前
          ]
        }
      };

      // Google Meet会議を追加
      if (meetingType === 'online') {
        event.conferenceData = {
          createRequest: {
            requestId: `meet_${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        };
      }

      const response = await calendar.events.insert({
        calendarId: calendarId || 'primary',
        resource: event,
        conferenceDataVersion: meetingType === 'online' ? 1 : 0
      });

      const createdEvent = response.data;
      
      return {
        success: true,
        event_id: createdEvent.id,
        meeting_url: createdEvent.conferenceData?.entryPoints?.[0]?.uri || null,
        summary: createdEvent.summary,
        start_time: createdEvent.start.dateTime,
        end_time: createdEvent.end.dateTime
      };

    } catch (error) {
      console.error('Create appointment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 予約イベントの更新
  async updateAppointment(calendarId, eventId, newSlotDatetime, meetingType) {
    try {
      if (!this.serviceAccount.isConfigured) {
        console.warn('Google Calendar not authenticated, returning mock event');
        return this.createMockEvent(newSlotDatetime, 60);
      }

      const calendar = await this.serviceAccount.getCalendarClient();
      const startTime = new Date(newSlotDatetime);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const updateData = {
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Tokyo'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Tokyo'
        }
      };

      const response = await calendar.events.patch({
        calendarId: calendarId || 'primary',
        eventId: eventId,
        resource: updateData
      });

      const updatedEvent = response.data;
      
      return {
        success: true,
        event_id: updatedEvent.id,
        meeting_url: updatedEvent.conferenceData?.entryPoints?.[0]?.uri || null,
        summary: updatedEvent.summary,
        start_time: updatedEvent.start.dateTime,
        end_time: updatedEvent.end.dateTime
      };

    } catch (error) {
      console.error('Update appointment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 予約イベントの削除
  async deleteAppointment(calendarId, eventId) {
    try {
      if (!this.serviceAccount.isConfigured) {
        console.warn('Google Calendar not authenticated, returning mock success');
        return { success: true };
      }

      const calendar = await this.serviceAccount.getCalendarClient();
      await calendar.events.delete({
        calendarId: calendarId || 'primary',
        eventId: eventId
      });

      return { success: true };

    } catch (error) {
      console.error('Delete appointment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // モックデータ生成（サービスアカウント未設定時）
  getMockAvailableSlots(date, duration) {
    const slots = [];
    const startHour = 9; // 9時から
    const endHour = 18;  // 18時まで
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = new Date(date);
        startTime.setHours(hour, minute, 0, 0);
        
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
        
        slots.push({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration: duration,
          available: true
        });
      }
    }
    
    return slots;
  }

  createMockEvent(slotDatetime, duration) {
    const startTime = new Date(slotDatetime);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    return {
      success: true,
      event_id: `mock_event_${Date.now()}`,
      meeting_url: 'https://meet.google.com/mock-9daqdljps',
      summary: '不動産査定相談（モック）',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString()
    };
  }

  // 既存のイベントからビジー時間を解析
  parseBusySlots(events) {
    return events.map(event => ({
      start: new Date(event.start.dateTime || event.start.date),
      end: new Date(event.end.dateTime || event.end.date)
    }));
  }

  // 利用可能な時間枠を生成
  generateAvailableSlots(startDate, duration, busySlots) {
    const slots = [];
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(startDate);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
        
        // ビジー時間と重複していないかチェック
        const isAvailable = !busySlots.some(busy => 
          (slotStart < busy.end && slotEnd > busy.start)
        );
        
        if (isAvailable) {
          slots.push({
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString(),
            duration: duration,
            available: true
          });
        }
      }
    }
    
    return slots;
  }
}

module.exports = new GoogleCalendarService();
