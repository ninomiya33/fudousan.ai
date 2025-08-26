const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  constructor() {
    this.doc = null;
  }

  async generateAppraisalPDF(appraisalData) {
    return new Promise((resolve, reject) => {
      try {
        // PDFドキュメントを作成（日本語対応）
        this.doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          },
          autoFirstPage: true
        });

        // 日本語フォントを設定（システムフォントを使用）
        const fontPath = '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc';
        let japaneseFont = 'Helvetica'; // フォールバック
        
        try {
          if (fs.existsSync(fontPath)) {
            this.doc.font(fontPath);
            japaneseFont = fontPath;
          } else {
            // 代替フォントを試す
            const alternativeFonts = [
              '/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc',
              '/System/Library/Fonts/STHeiti Light.ttc',
              '/System/Library/Fonts/STHeiti Medium.ttc'
            ];
            
            for (const font of alternativeFonts) {
              if (fs.existsSync(font)) {
                this.doc.font(font);
                japaneseFont = font;
                break;
              }
            }
          }
        } catch (fontError) {
          console.warn('⚠️ 日本語フォントの読み込みに失敗:', fontError.message);
          // デフォルトフォントを使用
        }

        // ヘッダー
        this.doc
          .fontSize(24)
          .font(japaneseFont)
          .text('不動産査定レポート', { align: 'center' })
          .moveDown(0.5);

        this.doc
          .fontSize(12)
          .font(japaneseFont)
          .text(`生成日時: ${new Date().toLocaleString('ja-JP')}`, { align: 'center' })
          .moveDown(1);

        // 物件基本情報
        this.doc
          .fontSize(16)
          .font(japaneseFont)
          .text('物件基本情報')
          .moveDown(0.5);

        this.doc
          .fontSize(12)
          .font(japaneseFont)
          .text(`住所: ${appraisalData.address || '未入力'}`)
          .text(`面積: ${appraisalData.area || '未入力'}㎡ (${this.convertToTsubo(appraisalData.area)}坪)`)
          .text(`築年数: ${appraisalData.age || '未入力'}年`)
          .text(`用途: ${appraisalData.purpose || '未入力'}`)
          .moveDown(1);

        // 査定結果
        this.doc
          .fontSize(16)
          .font(japaneseFont)
          .text('査定結果')
          .moveDown(0.5);

        if (appraisalData.aiPrediction) {
          const prediction = appraisalData.aiPrediction;
          this.doc
            .fontSize(12)
            .font(japaneseFont)
            .text(`推定価格: ${prediction.price_range || '未算出'}`)
            .text(`分析データ件数: ${prediction.data_count || 0}件`)
            .text(`市場動向: ${prediction.market_trend || '未分析'}`)
            .text(`価格動向: ${prediction.price_trend || '未分析'}`)
            .text(`投資価値: ${prediction.investment_value || '未分析'}`)
            .text(`信頼度: ${prediction.confidence || '未算出'}`)
            .moveDown(1);

          // 市場インサイト
          if (prediction.market_insights && prediction.market_insights.length > 0) {
            this.doc
              .fontSize(14)
              .font(japaneseFont)
              .text('市場インサイト')
              .moveDown(0.5);

            this.doc
              .fontSize(10)
              .font(japaneseFont);
            
            prediction.market_insights.forEach(insight => {
              this.doc.text(`• ${insight}`);
            });
            this.doc.moveDown(1);
          }

          // 類似物件
          if (prediction.comparable_properties && prediction.comparable_properties.length > 0) {
            this.doc
              .fontSize(14)
              .font(japaneseFont)
              .text('類似物件（参考）')
              .moveDown(0.5);

            this.doc
              .fontSize(10)
              .font(japaneseFont);
            
            prediction.comparable_properties.slice(0, 3).forEach((prop, index) => {
              this.doc.text(`${index + 1}. ${prop.address} - ${(prop.corrected_price / 10000).toFixed(0)}万円 (${prop.area}㎡, 築${prop.age}年)`);
            });
            this.doc.moveDown(1);
          }
        }

        // フッター
        this.doc
          .fontSize(10)
          .font('Helvetica')
          .text('※ この査定結果はAI分析による推定値であり、実際の取引価格とは異なる場合があります。', { align: 'center' })
          .moveDown(0.5);

        this.doc
          .text('※ 詳細な査定やご相談は、ルノア公式LINEまでお問い合わせください。', { align: 'center' });

        // PDFをバッファに変換
        const chunks = [];
        this.doc.on('data', chunk => chunks.push(chunk));
        this.doc.on('end', () => {
          const result = Buffer.concat(chunks);
          resolve(result);
        });

        // PDFの生成を完了
        this.doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  formatPrice(yen) {
    if (!yen || isNaN(yen)) return '未算出';
    return `${(yen / 10000).toLocaleString()}万円`;
  }

  convertToTsubo(sqm) {
    if (!sqm || isNaN(sqm)) return '未算出';
    return (sqm * 0.3025).toFixed(2);
  }

  // 一時ファイルとして保存
  async saveToTempFile(pdfBuffer, filename) {
    const tempDir = path.join(__dirname, '../../temp');
    
    // tempディレクトリが存在しない場合は作成
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);
    return filePath;
  }

  // 一時ファイルを削除
  async cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('一時ファイル削除エラー:', error);
    }
  }
}

module.exports = PDFGenerator;
