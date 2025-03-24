import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// استخدام الملفات الثابتة
app.use(express.static(__dirname));

// توجيه كل الطلبات إلى index.html
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// تشغيل الخادم على المنفذ 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});