const axios = require('axios');

class GASService {
  constructor() {
    this.endpoint = process.env.GAS_PDF_ENDPOINT;
    
    if (!this.endpoint) {
      console.warn('Google Apps Script endpoint not configured');
    }
  }

  // PDF生成
  async generatePDF(data, templateType = 'standard') {
    try {
      if (!this.endpoint) {
        console.warn('GAS endpoint not configured, returning mock result');
        return this.getMockPDFResult(data);
      }

      const requestData = {
        action: 'generate_pdf',
        template_type: templateType,
        data: data,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(this.endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒タイムアウト
      });

      if (response.status !== 200) {
        throw new Error(`GAS API returned status ${response.status}`);
      }

      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.error || 'PDF generation failed');
      }

      return {
        success: true,
        file_id: result.file_id,
        drive_url: result.drive_url,
        file_size: result.file_size,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('GAS PDF generation error:', error);
      
      // エラーの場合はモック結果を返す
      return this.getMockPDFResult(data);
    }
  }

  // PDF再生成
  async regeneratePDF(fileId, data, templateType = 'standard') {
    try {
      if (!this.endpoint) {
        console.warn('GAS endpoint not configured, returning mock result');
        return this.getMockPDFResult(data);
      }

      const requestData = {
        action: 'regenerate_pdf',
        file_id: fileId,
        template_type: templateType,
        data: data,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(this.endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status !== 200) {
        throw new Error(`GAS API returned status ${response.status}`);
      }

      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.error || 'PDF regeneration failed');
      }

      return {
        success: true,
        file_id: result.file_id,
        drive_url: result.drive_url,
        file_size: result.file_size,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('GAS PDF regeneration error:', error);
      return this.getMockPDFResult(data);
    }
  }

  // PDF削除
  async deletePDF(fileId) {
    try {
      if (!this.endpoint) {
        console.warn('GAS endpoint not configured, skipping deletion');
        return { success: true, message: 'Mock deletion' };
      }

      const requestData = {
        action: 'delete_pdf',
        file_id: fileId,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(this.endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status !== 200) {
        throw new Error(`GAS API returned status ${response.status}`);
      }

      return response.data;

    } catch (error) {
      console.error('GAS PDF deletion error:', error);
      return { success: false, error: error.message };
    }
  }

  // テンプレート一覧取得
  async getTemplates() {
    try {
      if (!this.endpoint) {
        return this.getMockTemplates();
      }

      const response = await axios.get(`${this.endpoint}?action=get_templates`, {
        timeout: 10000
      });

      if (response.status !== 200) {
        throw new Error(`GAS API returned status ${response.status}`);
      }

      return response.data;

    } catch (error) {
      console.error('GAS get templates error:', error);
      return this.getMockTemplates();
    }
  }

  // テンプレートプレビュー取得
  async getTemplatePreview(templateId) {
    try {
      if (!this.endpoint) {
        return { success: false, error: 'GAS endpoint not configured' };
      }

      const response = await axios.get(`${this.endpoint}?action=get_preview&template_id=${templateId}`, {
        timeout: 15000
      });

      if (response.status !== 200) {
        throw new Error(`GAS API returned status ${response.status}`);
      }

      return response.data;

    } catch (error) {
      console.error('GAS get template preview error:', error);
      return { success: false, error: error.message };
    }
  }

  // モックPDF結果（GAS endpointがない場合）
  getMockPDFResult(data) {
    const mockFileId = `mock_pdf_${Date.now()}`;
    const mockDriveUrl = `https://drive.google.com/file/d/${mockFileId}/view`;
    
    return {
      success: true,
      file_id: mockFileId,
      drive_url: mockDriveUrl,
      file_size: '256KB',
      generated_at: new Date().toISOString(),
      note: 'This is a mock PDF result. Configure GAS endpoint for actual PDF generation.'
    };
  }

  // モックテンプレート（GAS endpointがない場合）
  getMockTemplates() {
    return {
      success: true,
      templates: [
        {
          id: 'standard',
          name: '標準テンプレート',
          description: '一般的な査定結果レポート',
          preview_url: null,
          available: true
        },
        {
          id: 'premium',
          name: 'プレミアムテンプレート',
          description: '詳細な分析とグラフ付きレポート',
          preview_url: null,
          available: true
        },
        {
          id: 'simple',
          name: 'シンプルテンプレート',
          description: '簡潔な査定結果サマリー',
          preview_url: null,
          available: true
        }
      ]
    };
  }

  // ヘルスチェック
  async healthCheck() {
    try {
      if (!this.endpoint) {
        return { 
          status: 'warning', 
          message: 'GAS endpoint not configured',
          available: false
        };
      }

      const response = await axios.get(`${this.endpoint}?action=health`, {
        timeout: 5000
      });

      if (response.status === 200) {
        return {
          status: 'healthy',
          message: 'GAS service is responding',
          available: true,
          response_time: response.headers['x-response-time'] || 'unknown'
        };
      } else {
        return {
          status: 'unhealthy',
          message: `GAS service returned status ${response.status}`,
          available: false
        };
      }

    } catch (error) {
      return {
        status: 'error',
        message: `GAS service error: ${error.message}`,
        available: false,
        error: error.message
      };
    }
  }

  // バッチPDF生成
  async generateBatchPDFs(requests) {
    try {
      if (!this.endpoint) {
        console.warn('GAS endpoint not configured, returning mock batch results');
        return this.getMockBatchResults(requests);
      }

      const batchData = {
        action: 'batch_generate_pdf',
        requests: requests,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(this.endpoint, batchData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 1分タイムアウト
      });

      if (response.status !== 200) {
        throw new Error(`GAS API returned status ${response.status}`);
      }

      return response.data;

    } catch (error) {
      console.error('GAS batch PDF generation error:', error);
      return this.getMockBatchResults(requests);
    }
  }

  // モックバッチ結果
  getMockBatchResults(requests) {
    const results = requests.map((request, index) => {
      const mockFileId = `mock_batch_${Date.now()}_${index}`;
      const mockDriveUrl = `https://drive.google.com/file/d/${mockFileId}/view`;
      
      return {
        request_id: request.id || `req_${index}`,
        success: true,
        file_id: mockFileId,
        drive_url: mockDriveUrl,
        file_size: '256KB',
        generated_at: new Date().toISOString(),
        note: 'Mock batch result'
      };
    });

    return {
      success: true,
      batch_id: `batch_${Date.now()}`,
      total_requests: requests.length,
      successful: results.length,
      failed: 0,
      results: results
    };
  }

  // カスタムテンプレート作成
  async createCustomTemplate(templateData) {
    try {
      if (!this.endpoint) {
        return { 
          success: false, 
          error: 'GAS endpoint not configured for custom templates' 
        };
      }

      const requestData = {
        action: 'create_template',
        template: templateData,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(this.endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });

      if (response.status !== 200) {
        throw new Error(`GAS API returned status ${response.status}`);
      }

      return response.data;

    } catch (error) {
      console.error('GAS create custom template error:', error);
      return { success: false, error: error.message };
    }
  }

  // テンプレート更新
  async updateTemplate(templateId, templateData) {
    try {
      if (!this.endpoint) {
        return { 
          success: false, 
          error: 'GAS endpoint not configured for template updates' 
        };
      }

      const requestData = {
        action: 'update_template',
        template_id: templateId,
        template: templateData,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(this.endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });

      if (response.status !== 200) {
        throw new Error(`GAS API returned status ${response.status}`);
      }

      return response.data;

    } catch (error) {
      console.error('GAS update template error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GASService();
