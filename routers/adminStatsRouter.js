// routers/adminStatsRouter.js — 2025-10-28
const express = require('express');
const mongoose = require('mongoose');
const { requireUser, requireAdmin } = require('../middlewares/auth');

require('../models/userSchema');
require('../models/stampSchema');
require('../models/visitorLogSchema');

const User       = mongoose.model('userdbs');
const Stamp      = mongoose.model('stampdbs');
const VisitorLog = mongoose.model('visitorlogs');

const router = express.Router();
const adminRequired = [requireUser, requireAdmin];

// 사용자 스탬프 등급 기준과 관리자 통계 기준을 맞춘다.
function getStampGradeName(count) {
  const level = Math.min(Math.floor(count / 3), 4);
  return ['새싹', '탐험가', '마스터', '전문가', '레전드'][level];
}

// KST(UTC+9) 하루 경계 계산
function getKSTDayRange(date = new Date()) {
  const now = date;
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const kstMidnight = new Date(Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate(), 0, 0, 0, 0
  ));
  const start = new Date(kstMidnight.getTime() - 9 * 60 * 60 * 1000);
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** ⬇️⬇️⬇️ 기존 기능: 그대로 유지 ⬇️⬇️⬇️ **/

// 오늘 방문자 수 — visitorLog 기반 (비로그인 포함)
router.get('/today-visitors', adminRequired, async (_req, res) => {
  try {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const today = kst.toISOString().slice(0, 10);
    const count = await VisitorLog.countDocuments({ date: today });
    res.json({ count });
  } catch (err) {
    console.error('[admin-stats] today-visitors', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// 최근 7일(일자별) 방문자 수 — visitorLog 기반 (비로그인 포함)
router.get('/last7days', adminRequired, async (_req, res) => {
  try {
    // 7일치 날짜 문자열 생성 (KST)
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const kst = new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000);
      dates.push(kst.toISOString().slice(0, 10));
    }

    const agg = await VisitorLog.aggregate([
      { $match: { date: { $in: dates } } },
      { $group: { _id: '$date', count: { $sum: 1 } } },
    ]);

    const countMap = Object.fromEntries(agg.map(x => [x._id, x.count]));
    const results = dates.map(date => ({
      dateStart: new Date(date + 'T00:00:00+09:00'),
      dateEnd:   new Date(date + 'T23:59:59+09:00'),
      count: countMap[date] ?? 0,
    }));

    res.json({ items: results });
  } catch (err) {
    console.error('[admin-stats] last7days', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// 전체 회원 수
router.get('/total-users', adminRequired, async (_req, res) => {
  try {
    const count = await User.countDocuments({ isBlocked: { $ne: true } });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// 마스터 등급 수(스탬프 등급 기반) — 사용자 등급 기준과 동일하게 계산
router.get('/master-count', adminRequired, async (_req, res) => {
  try {
    const [result] = await Stamp.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $match: { count: { $gte: 6, $lt: 9 } } },
      { $count: 'count' },
    ]);
    res.json({ count: result?.count ?? 0 });
  } catch (e) {
    console.error('[admin-stats] master-count', e.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/** ⬆️⬆️⬆️ 기존 기능: 그대로 유지 ⬆️⬆️⬆️ **/

// ✅ 신규: 스탬프 등급 분포 (도넛차트)
//  - stampdbs 컬렉션의 userId별 스탬프 개수를 집계해 등급 분류
router.get('/stamp-stats', adminRequired, async (_req, res) => {
  try {
    const agg = await Stamp.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);

    const stats = { '새싹': 0, '탐험가': 0, '마스터': 0, '전문가': 0, '레전드': 0 };

    for (const { count } of agg) {
      stats[getStampGradeName(count)]++;
    }

    res.json(stats);
  } catch (err) {
    console.error('[admin-stats] stamp-stats', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
