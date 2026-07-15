import express from 'express';
import upload from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function convertToWebp(file) {
  const originalPath = file.path;
  const finalFilename = file.filename.split('.')[0] + '.webp';
  const finalPath = path.join(path.dirname(originalPath), finalFilename);

  const inputBuffer = fs.readFileSync(originalPath);
  const outputBuffer = await sharp(inputBuffer)
    .webp({ quality: 80 })
    .toBuffer();

  fs.writeFileSync(finalPath, outputBuffer);
  fs.unlinkSync(originalPath);
  return finalFilename;
}

function compressVideo(file) {
  return new Promise((resolve, reject) => {
    const originalPath = file.path;
    const baseName = file.filename.split('.')[0];
    const finalFilename = baseName + '.mp4';
    const finalPath = path.join(path.dirname(originalPath), finalFilename);
    // Write to a temp file to avoid input == output collision when input is already .mp4
    const tmpPath = path.join(path.dirname(originalPath), baseName + '_tmp.mp4');

    console.log(`Compressing video: ${file.originalname} → ${finalFilename}`);

    const args = [
      '-i', originalPath,
      '-vcodec', 'libx264',
      '-crf', '28',
      '-preset', 'fast',
      '-vf', 'scale=-2:720',
      '-acodec', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      tmpPath,
    ];

    const ffmpeg = spawn(FFMPEG_PATH, args);

    let stderrOutput = '';
    ffmpeg.stderr.on('data', (data) => {
      stderrOutput += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        try { fs.unlinkSync(originalPath); } catch (_) {}
        // Rename temp file to final filename
        try { fs.renameSync(tmpPath, finalPath); } catch (_) {}
        console.log(`Video compressed successfully: ${finalFilename}`);
        resolve(finalFilename);
      } else {
        console.error(`FFmpeg exited with code ${code} for ${file.originalname}`);
        console.error(`FFmpeg stderr:\n${stderrOutput.slice(-2000)}`);
        // Clean up temp file if it exists
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        // Fall back to original file on failure
        resolve(file.filename);
      }
    });

    ffmpeg.on('error', (err) => {
      console.error('FFmpeg spawn error:', err);
      resolve(file.filename); // Fall back gracefully
    });
  });
}

async function processFile(file) {
  console.log(`[upload] Processing file: ${file.originalname} | mimetype: ${file.mimetype} | size: ${file.size} bytes`);

  if (file.mimetype.startsWith('image/')) {
    try {
      const result = await convertToWebp(file);
      console.log(`[upload] Image converted to WebP: ${result}`);
      return result;
    } catch (err) {
      console.error('[upload] WebP conversion failed:', err);
      return file.filename;
    }
  }

  if (file.mimetype.startsWith('video/')) {
    console.log(`[upload] Video detected, starting FFmpeg compression with path: ${FFMPEG_PATH}`);
    return await compressVideo(file);
  }

  console.log(`[upload] File saved as-is (PDF or unknown): ${file.filename}`);
  return file.filename;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// Public upload for customer leads
router.post('/public', upload.any(), async (req, res) => {
  const file = req.files && req.files[0];
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const finalFilename = await processFile(file);

  return res.json({
    message: 'File uploaded successfully.',
    filename: finalFilename,
    originalName: file.originalname,
    path: `/uploads/${finalFilename}`,
  });
});

router.use(authenticateToken);

router.post('/', upload.any(), async (req, res) => {
  const file = req.files && req.files[0];
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const finalFilename = await processFile(file);

  return res.json({
    message: 'File uploaded successfully.',
    filename: finalFilename,
    originalName: file.originalname,
    path: `/uploads/${finalFilename}`,
  });
});

router.delete('/:filename', (req, res) => {
  const filename = req.params.filename;
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.join(__dirname, '../../../uploads', filename);
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    res.json({ message: 'File deleted successfully.' });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Failed to delete file.' });
  }
});

export default router;
