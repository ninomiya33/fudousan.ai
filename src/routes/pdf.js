const express = require('express');
const router = express.Router();
const PDFGenerator = require('../utils/pdfGenerator');
const { supabase, supabaseAdmin } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 一時ファイル用のストレージ設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// PDF生成とSupabase保存
router.post('/generate', async (req, res) => {
  try {
    const { appraisalData, userId } = req.body;

    if (!appraisalData) {
      return res.status(400).json({ error: '査定データが必要です' });
    }

    // PDF生成
    const pdfGenerator = new PDFGenerator();
    const pdfBuffer = await pdfGenerator.generateAppraisalPDF(appraisalData);

    // ファイル名を生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `appraisal-${userId}-${timestamp}.pdf`;

    // 一時ファイルとして保存
    const tempFilePath = await pdfGenerator.saveToTempFile(pdfBuffer, filename);

    try {
      // Supabaseストレージにアップロード
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filename, pdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from('pdfs')
        .getPublicUrl(filename);

      // データベースにPDF情報を保存
      const { data: dbData, error: dbError } = await supabaseAdmin
        .from('pdf_reports')
        .insert({
          user_id: userId,
          filename: filename,
          file_path: uploadData.path,
          public_url: urlData.publicUrl,
          property_id: appraisalData.property_id, // 物件IDを追加
          appraisal_data: {
            // 査定結果のみを保存（基本情報は除外）
            aiPrediction: appraisalData.aiPrediction,
            generated_at: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // 一時ファイルを削除
      await pdfGenerator.cleanupTempFile(tempFilePath);

      res.json({
        success: true,
        pdf_id: dbData.id,
        filename: filename,
        public_url: urlData.publicUrl,
        message: 'PDFが正常に生成され、保存されました'
      });

    } catch (storageError) {
      // 一時ファイルを削除
      await pdfGenerator.cleanupTempFile(tempFilePath);
      throw storageError;
    }

  } catch (error) {
    console.error('PDF生成エラー:', error);
    res.status(500).json({
      error: 'PDF生成中にエラーが発生しました',
      details: error.message
    });
  }
});

// PDFレポート一覧取得
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('pdf_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      reports: data
    });

  } catch (error) {
    console.error('PDF履歴取得エラー:', error);
    res.status(500).json({
      error: 'PDF履歴の取得中にエラーが発生しました',
      details: error.message
    });
  }
});

// 特定のPDFレポート取得
router.get('/:pdfId', async (req, res) => {
  try {
    const { pdfId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('pdf_reports')
      .select('*')
      .eq('id', pdfId)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      report: data
    });

  } catch (error) {
    console.error('PDFレポート取得エラー:', error);
    res.status(500).json({
      error: 'PDFレポートの取得中にエラーが発生しました',
      details: error.message
    });
  }
});

// PDFレポート削除
router.delete('/:pdfId', async (req, res) => {
  try {
    const { pdfId } = req.params;

    // データベースからレポート情報を取得
    const { data: report, error: fetchError } = await supabaseAdmin
      .from('pdf_reports')
      .select('filename')
      .eq('id', pdfId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Supabaseストレージからファイルを削除
    const { error: storageError } = await supabase.storage
      .from('pdfs')
      .remove([report.filename]);

    if (storageError) {
      console.warn('ストレージからのファイル削除に失敗:', storageError);
    }

    // データベースからレコードを削除
    const { error: dbError } = await supabaseAdmin
      .from('pdf_reports')
      .delete()
      .eq('id', pdfId);

    if (dbError) {
      throw dbError;
    }

    res.json({
      success: true,
      message: 'PDFレポートが正常に削除されました'
    });

  } catch (error) {
    console.error('PDFレポート削除エラー:', error);
    res.status(500).json({
      error: 'PDFレポートの削除中にエラーが発生しました',
      details: error.message
    });
  }
});

module.exports = router;
