const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { analyzeResume } = require('../lib/ai');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ['.pdf', '.docx'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

async function extractText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

router.post('/resume/upload', requireAuth, upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const rawText = await extractText(req.file.path, req.file.originalname);

  let analysisJson = null;
  try {
    analysisJson = await analyzeResume(rawText);
  } catch (err) {
    console.error('AI analysis failed:', err.message);
  }

  const resume = await prisma.resume.create({
    data: {
      userId: req.userId,
      fileUrl: req.file.path,
      rawText,
      analysisJson,
    },
  });

  res.status(201).json({ ...resume, aiUnavailable: analysisJson === null });
});

router.get('/resume/analysis', requireAuth, async (req, res) => {
  const resume = await prisma.resume.findFirst({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!resume) return res.status(404).json({ error: 'No resume found' });
  res.json(resume);
});

module.exports = router;
