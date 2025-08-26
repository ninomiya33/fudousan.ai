const express = require('express');
const googleServiceAccount = require('../services/googleServiceAccount');
const router = express.Router();

// Googleサービスアカウントの状態確認
router.get('/status', (req, res) => {
  try {
    const status = googleServiceAccount.getStatus();
    res.json({
      success: true,
      google_service_account: status,
      message: status.configured ? 'Google Service Account configured' : 'Google Service Account not configured'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Google Service Account status check failed'
    });
  }
});

// Google Calendar APIのテスト
router.get('/calendar/test', async (req, res) => {
  try {
    if (!googleServiceAccount.isConfigured) {
      return res.status(400).json({
        success: false,
        error: 'Google Service Account not configured',
        message: 'Please configure Google Service Account credentials first'
      });
    }

    const calendar = await googleServiceAccount.getCalendarClient();
    const calendarList = await calendar.calendarList.list();
    
    res.json({
      success: true,
      message: 'Google Calendar API connection successful',
      calendars: calendarList.data.items || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Google Calendar API test failed'
    });
  }
});

// Google Drive APIのテスト
router.get('/drive/test', async (req, res) => {
  try {
    if (!googleServiceAccount.isConfigured) {
      return res.status(400).json({
        success: false,
        error: 'Google Service Account not configured',
        message: 'Please configure Google Service Account credentials first'
      });
    }

    const drive = await googleServiceAccount.getDriveClient();
    const about = await drive.about.get({ fields: 'user,storageQuota' });
    
    res.json({
      success: true,
      message: 'Google Drive API connection successful',
      user: about.data.user,
      storage: about.data.storageQuota
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Google Drive API test failed'
    });
  }
});

module.exports = router;
