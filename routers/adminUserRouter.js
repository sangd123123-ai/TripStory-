// routers/adminUserRouter.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireUser, requireAdmin } = require('../middlewares/auth');

require('../models/userSchema'); // userdbs 모델 등록
const User = mongoose.model('userdbs');
const adminRequired = [requireUser, requireAdmin];

// 유틸: 정렬 파싱 "createdAt:desc" -> { createdAt: -1 }
function parseSort(sort) {
  if (!sort) return { createdAt: -1 };
  const [k, dir] = String(sort).split(':');
  return { [k]: dir === 'asc' ? 1 : -1 };
}

// 목록
router.get('/users', adminRequired, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const size = Math.max(1, Math.min(100, parseInt(req.query.size ?? '20', 10)));
    const sort = parseSort(req.query.sort || 'createdAt:desc');
    const q = (req.query.query || '').trim();
    const role = (req.query.role || '').trim();      // 'admin' | 'user' | ''
    const status = (req.query.status || '').trim();  // 'active' | 'blocked' | ''

    const filter = {};
    if (q) {
      filter.$or = [
        { userId: new RegExp(q, 'i') },
        { userid: new RegExp(q, 'i') },
        { username: new RegExp(q, 'i') },
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
      ];
    }
    if (role) filter.role = role;
    if (status) filter.isBlocked = status === 'blocked';

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort(sort)
        .skip((page - 1) * size)
        .limit(size)
        .lean(),
      User.countDocuments(filter),
    ]);

    // 필드 정규화: createdAt / lastLogin 없을 수도 있어 방어
    const norm = items.map(u => ({
      ...u,
      createdAt: u.createdAt || u.joinedAt || u._id?.getTimestamp?.() || null,
      lastLogin: u.lastLogin || u.last_login || null,
      role: u.role || 'user',
      isBlocked: !!u.isBlocked,
    }));

    res.json({ items: norm, total, page, size });
  } catch (e) {
    console.error('[ADMIN users list] error:', e);
    res.status(500).json({ message: '목록 조회 중 오류' });
  }
});

// 단건 수정 (권한/상태)
router.patch('/users/:id', adminRequired, async (req, res) => {
  try {
    const { role, isBlocked } = req.body;
    const update = {};
    if (role === 'admin' || role === 'user') update.role = role;
    if (typeof isBlocked === 'boolean') update.isBlocked = isBlocked;

    const doc = await User.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!doc) return res.status(404).json({ message: '사용자 없음' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[ADMIN users patch] error:', e);
    res.status(500).json({ message: '수정 실패' });
  }
});

// 단건 삭제
router.delete('/users/:id', adminRequired, async (req, res) => {
  try {
    const r = await User.findByIdAndDelete(req.params.id).lean();
    if (!r) return res.status(404).json({ message: '사용자 없음' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[ADMIN users delete] error:', e);
    res.status(500).json({ message: '삭제 실패' });
  }
});

// 일괄 작업: { ids: [], action: 'block'|'unblock'|'delete' }
router.post('/users/bulk', adminRequired, async (req, res) => {
  try {
    const { ids, action } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'ids 비어있음' });

    if (action === 'block') {
      await User.updateMany({ _id: { $in: ids } }, { $set: { isBlocked: true } });
    } else if (action === 'unblock') {
      await User.updateMany({ _id: { $in: ids } }, { $set: { isBlocked: false } });
    } else if (action === 'delete') {
      await User.deleteMany({ _id: { $in: ids } });
    } else {
      return res.status(400).json({ message: '알 수 없는 action' });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[ADMIN users bulk] error:', e);
    res.status(500).json({ message: '일괄 작업 실패' });
  }
});

module.exports = router;
