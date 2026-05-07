const express = require('express');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

require('../models/visitorLogSchema');
const VisitorLog = mongoose.model('visitorlogs');

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';

function getKSTDateString() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

router.post('/', async (req, res) => {
  try {
    let visitorId = req.cookies?.vid;
    if (!visitorId) {
      visitorId = randomUUID();
      res.cookie('vid', visitorId, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
      });
    }

    const date = getKSTDateString();
    await VisitorLog.updateOne(
      { date, visitorId },
      { $setOnInsert: { date, visitorId } },
      { upsert: true }
    );

    res.json({ ok: true });
  } catch (err) {
    // duplicate key(11000)는 이미 집계된 것 — 정상
    if (err.code !== 11000) console.error('[visit]', err.message);
    res.json({ ok: true });
  }
});

module.exports = router;
