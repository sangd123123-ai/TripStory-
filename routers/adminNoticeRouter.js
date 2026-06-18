// routers/adminNoticeRouter.js — 서버 수정 없이 안전 가드 버전 (2025-10-29)
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireUser, requireAdmin } = require('../middlewares/auth');

// ✅ 모델은 파일에서 바로 import (단수 등록명 'notice')
const Notice = require('../models/noticeSchema'); // noticeSchema.js가 module.exports = model('notice', ...) 임
// (기존처럼 mongoose.model('notices')로 직접 꺼내면 등록명 불일치로 에러)

const router = express.Router();

// 관리자 공지 API는 관리자 인증을 통과한 요청만 허용한다.
const adminRequired = [requireUser, requireAdmin];

/* -----------------------------
   Multer (업로드) 설정
------------------------------ */
const uploadRoot = path.join(process.cwd(), 'uploads');
const noticeDir = path.join(uploadRoot, 'notices');
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot);
if (!fs.existsSync(noticeDir)) fs.mkdirSync(noticeDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, noticeDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safe = `notice_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    cb(null, `${safe}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error('ONLY_IMAGE'), ok);
  }
});

const toPublicUrl = (absPath) =>
  `/uploads/${path.relative(uploadRoot, absPath).replace(/\\/g, '/')}`;

const tryUnlink = (absPath) => {
  if (!absPath) return;
  fs.stat(absPath, (err, st) => {
    if (!err && st.isFile()) fs.unlink(absPath, () => {});
  });
};

/* -----------------------------
   목록: GET /admin/notices
   쿼리: page, size, q
------------------------------ */
router.get('/notices', adminRequired, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
  const size = Math.max(1, Math.min(50, parseInt(req.query.size ?? '20', 10)));
  const q = (req.query.q ?? '').trim();

  const cond = q ? { title: { $regex: q, $options: 'i' } } : {};
  const total = await Notice.countDocuments(cond);
  const items = await Notice.find(cond)
    .sort({ createdAt: -1 }) // 핀 정렬 필요 시 { isPinned: -1, createdAt: -1 }
    .skip((page - 1) * size)
    .limit(size)
    .lean();

  res.json({ ok: true, page, size, total, items });
});

/* -----------------------------
   등록: POST /admin/notices
   - multipart/form-data(image) 또는 JSON(image_url) 모두 지원
------------------------------ */
router.post(
  '/notices',
  adminRequired,
  (req, res, next) => {
    const ct = (req.headers['content-type'] || '').toLowerCase();
    if (ct.includes('multipart/form-data')) return upload.single('image')(req, res, next);
    next();
  },
  async (req, res) => {
    try {
      const body = req.body || {};
      const title = (body.title || '').trim();
      const content = body.content || '';

      if (!title || !content) {
        return res.status(400).json({ message: 'title/content required' });
      }

      const doc = { title, content };
      if (req.file) {
        doc.image_url = toPublicUrl(req.file.path);
      } else if (body.image_url) {
        doc.image_url = body.image_url;
      }

      const created = await Notice.create(doc);
      res.json({ ok: true, item: created });
    } catch (e) {
      console.error('[ADMIN NOTICE CREATE]', e);
      res.status(500).json({ message: 'create failed' });
    }
  }
);

/* -----------------------------
   수정: PATCH /admin/notices/:id
   - multipart/form-data(image 교체) 또는 JSON(image_url 교체/제거)
------------------------------ */
router.patch(
  '/notices/:id',
  adminRequired,
  (req, res, next) => {
    const ct = (req.headers['content-type'] || '').toLowerCase();
    if (ct.includes('multipart/form-data')) return upload.single('image')(req, res, next);
    next();
  },
  async (req, res) => {
    try {
      const id = req.params.id;
      const found = await Notice.findById(id);
      if (!found) return res.status(404).json({ message: 'not found' });

      const body = req.body || {};
      if (typeof body.title === 'string') found.title = body.title.trim();
      if (typeof body.content === 'string') found.content = body.content;

      if (req.file) {
        if (found.image_url && found.image_url.startsWith('/uploads/')) {
          const oldAbs = path.join(process.cwd(), found.image_url.replace(/^\//, ''));
          tryUnlink(oldAbs);
        }
        found.image_url = toPublicUrl(req.file.path);
      } else if (typeof body.image_url === 'string') {
        found.image_url = body.image_url || undefined; // 빈 문자열이면 제거
      }

      await found.save();
      res.json({ ok: true, item: found });
    } catch (e) {
      console.error('[ADMIN NOTICE PATCH]', e);
      res.status(500).json({ message: 'update failed' });
    }
  }
);

/* -----------------------------
   삭제: DELETE /admin/notices/:id
------------------------------ */
router.delete('/notices/:id', adminRequired, async (req, res) => {
  try {
    const id = req.params.id;
    const found = await Notice.findById(id);
    if (!found) return res.status(404).json({ message: 'not found' });

    if (found.image_url && found.image_url.startsWith('/uploads/')) {
      const oldAbs = path.join(process.cwd(), found.image_url.replace(/^\//, ''));
      tryUnlink(oldAbs);
    }
    await Notice.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (e) {
    console.error('[ADMIN NOTICE DELETE]', e);
    res.status(500).json({ message: 'delete failed' });
  }
});

module.exports = router;
