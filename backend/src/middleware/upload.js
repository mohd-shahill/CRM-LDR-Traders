import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|pdf|mp4|mov|avi/;
  const allowedMimetypes = /image\/(jpeg|png|webp|gif)|application\/pdf|video\/(mp4|quicktime|x-msvideo|avi|x-matroska)/;

  const extOk = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedMimetypes.test(file.mimetype);

  if (extOk || mimeOk) {
    return cb(null, true);
  }
  cb(new Error('Only images, PDFs, and videos are allowed!'));
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB file size limit
  fileFilter,
});

export default upload;
export { uploadDir };
