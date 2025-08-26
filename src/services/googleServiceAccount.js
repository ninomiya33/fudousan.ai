const { google } = require('googleapis');

class GoogleServiceAccount {
  constructor() {
    this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    this.privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    this.projectId = process.env.GOOGLE_PROJECT_ID;
    
    if (!this.serviceAccountEmail || !this.privateKey) {
      console.warn('Google Service Account credentials not configured');
      this.isConfigured = false;
      return;
    }
    
    this.isConfigured = true;
    this.auth = new google.auth.JWT(
      this.serviceAccountEmail,
      null,
      this.privateKey,
      [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/script.external_request'
      ]
    );
  }

  // 認証クライアントの取得
  async getAuthClient() {
    if (!this.isConfigured) {
      throw new Error('Google Service Account not configured');
    }

    try {
      await this.auth.authorize();
      return this.auth;
    } catch (error) {
      console.error('Google Service Account authorization failed:', error);
      throw error;
    }
  }

  // Google Calendar APIクライアントの取得
  async getCalendarClient() {
    const auth = await this.getAuthClient();
    return google.calendar({ version: 'v3', auth });
  }

  // Google Drive APIクライアントの取得
  async getDriveClient() {
    const auth = await this.getAuthClient();
    return google.drive({ version: 'v3', auth });
  }

  // Google Apps Script APIクライアントの取得
  async getScriptClient() {
    const auth = await this.getAuthClient();
    return google.script({ version: 'v1', auth });
  }

  // サービスアカウントの状態確認
  getStatus() {
    return {
      configured: this.isConfigured,
      email: this.serviceAccountEmail,
      project_id: this.projectId,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/script.external_request'
      ]
    };
  }
}

module.exports = new GoogleServiceAccount();
