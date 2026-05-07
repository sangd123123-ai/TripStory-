// routers/adminStatsRouter.js — 2025-10-28
const express = require('express');
const mongoose = require('mongoose');

require('../models/userSchema');   // 안전하게 보장
require('../models/stampSchema');  // 도넛차트 집계용 (userId, location, date) :contentReference[oaicite:4]{index=4}

const User  = mongoose.model('userdbs');
const Stamp = mongoose.model('stampdbs');

const router = express.Router();

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

// 오늘 방문자 수(마지막 접속일이 '오늘'인 유저)
router.get('/today-visitors', async (_req, res) => {
  try {
    const { start, end } = getKSTDayRange(new Date());
    const count = await User.countDocuments({
      lastLogin: { $gte: start, $lt: end },
      isBlocked: { $ne: true },
    });
    res.json({ count, range: { start, end } });
  } catch (err) {
    console.error('[admin-stats] today-visitors', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// 최근 7일(일자별) 방문자 수 — aggregation 1회 쿼리
router.get('/last7days', async (_req, res) => {
  try {
    const { start: rangeStart } = getKSTDayRange(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
    const { end: rangeEnd }   = getKSTDayRange(new Date());

    const agg = await User.aggregate([
      { $match: { lastLogin: { $gte: rangeStart, $lt: rangeEnd }, isBlocked: { $ne: true } } },
      { $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $dateAdd: { startDate: '$lastLogin', unit: 'hour', amount: 9 } },
            },
          },
          count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    // 7일치 날짜 슬롯 생성 후 집계 결과 매핑
    const countMap = Object.fromEntries(agg.map(x => [x._id, x.count]));
    const results = [];
    for (let i = 6; i >= 0; i--) {
      const { start, end } = getKSTDayRange(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
      const kst = new Date(start.getTime() + 9 * 60 * 60 * 1000);
      const key = kst.toISOString().slice(0, 10);
      results.push({ dateStart: start, dateEnd: end, count: countMap[key] ?? 0 });
    }
    res.json({ items: results });
  } catch (err) {
    console.error('[admin-stats] last7days', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// 전체 회원 수
router.get('/total-users', async (_req, res) => {
  try {
    const count = await User.countDocuments({ isBlocked: { $ne: true } });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// 마스터 등급 수(유저 role 기반) — 기존 서비스 호환 목적
router.get('/master-count', async (_req, res) => {
  try {
    const count = await User.countDocuments({ role: 'master', isBlocked: { $ne: true } });
    res.json({ count });
  } catch (e) {
    console.error('[admin-stats] master-count', e.message);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/** ⬆️⬆️⬆️ 기존 기능: 그대로 유지 ⬆️⬆️⬆️ **/

// ✅ 신규: 스탬프 등급 분포 (도넛차트)
//  - stampdbs 컬렉션의 userId별 스탬프 개수를 집계해 등급 분류
router.get('/stamp-stats', async (_req, res) => {
  try {
    const agg = await Stamp.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);

    const stats = { '새싹': 0, '탐험가': 0, '전문가': 0, '마스터': 0, '레전드': 0 };

    for (const { count } of agg) {
      if (count < 5) stats['새싹']++;
      else if (count < 10) stats['탐험가']++;
      else if (count < 20) stats['전문가']++;
      else if (count < 30) stats['마스터']++;
      else stats['레전드']++;
    }

    res.json(stats);
  } catch (err) {
    console.error('[admin-stats] stamp-stats', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;