// routers/marketRouter.js
const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const { requireUser, requireAdmin } = require('../middlewares/auth');

const adminRequired = [requireUser, requireAdmin];

// ✅ GET /api/market/vendors - 단순화
router.get('/vendors', async (req, res) => {
  try {
    const { region, search } = req.query;
    const q = {};

    if (region) q.region = region; // ✅ 그대로 사용
    if (search) {
      const term = new RegExp(String(search), 'i');
      q.$or = [
        { name: term },
        { description: term },
        { region: term },
        { 'products.name': term },
        { 'products.tags': term },
      ];
    }

    const list = await Vendor.find(q).sort({ rating: -1, name: 1 }).lean();
    return res.json({ ok: true, list });
  } catch (e) {
    console.error('[market/vendors] error:', e);
    return res.status(500).json({ ok: false, message: '마켓 조회 실패' });
  }
});

// ✅ POST /api/market/vendors - 표준화 제거
router.post('/vendors', adminRequired, async (req, res) => {
  try {
    const doc = await Vendor.create(req.body); // ✅ enum으로 검증됨
    return res.json({ ok: true, item: doc });
  } catch (e) {
    console.error('[market/vendors POST] error:', e);
    return res.status(400).json({ ok: false, message: '제휴처 등록 실패' });
  }
});

// ✅ PUT /api/market/vendors/:id
router.put('/vendors/:id', adminRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Vendor.findByIdAndUpdate(id, req.body, { new: true });
    if (!doc) return res.status(404).json({ ok: false, message: '없음' });
    return res.json({ ok: true, item: doc });
  } catch (e) {
    console.error('[market/vendors PUT] error:', e);
    return res.status(400).json({ ok: false, message: '수정 실패' });
  }
});

module.exports = router;
