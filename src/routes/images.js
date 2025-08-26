const express = require('express');
const path = require('path');
const router = express.Router();

// 画像ファイルを提供するルート
router.get('/images/:category/:filename', (req, res) => {
  const { category, filename } = req.params;
  const imagePath = path.join(__dirname, '../../public/images', category, filename);
  
  // 画像ファイルの存在確認
  if (require('fs').existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    // 画像が存在しない場合はデフォルト画像を返す
    const defaultImagePath = path.join(__dirname, '../../public/images/default.png');
    if (require('fs').existsSync(defaultImagePath)) {
      res.sendFile(defaultImagePath);
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  }
});

// 画像一覧を取得するAPI
router.get('/list', (req, res) => {
  const fs = require('fs');
  const imagesDir = path.join(__dirname, '../../public/images');
  const imageList = {};

  try {
    if (fs.existsSync(imagesDir)) {
      const categories = fs.readdirSync(imagesDir);
      
      categories.forEach(category => {
        const categoryPath = path.join(imagesDir, category);
        if (fs.statSync(categoryPath).isDirectory()) {
          const files = fs.readdirSync(categoryPath);
          imageList[category] = files.filter(file => 
            /\.(png|jpg|jpeg|gif)$/i.test(file)
          );
        }
      });
    }
    
    res.json({
      success: true,
      images: imageList,
      baseUrl: `${req.protocol}://${req.get('host')}/api/images`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to read image directory',
      details: error.message
    });
  }
});

// 画像のアップロード（開発用）
router.post('/upload', (req, res) => {
  // 本番環境では適切な認証とセキュリティ対策が必要
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Upload not allowed in production' });
  }

  res.json({
    success: true,
    message: 'Image upload endpoint (development only)',
    note: 'Implement proper file upload handling here'
  });
});

module.exports = router;





