const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('../models/userSchema');
const User = mongoose.model('userdbs');

function requireUser(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'no token' });
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    // 관리자 로그인 토큰은 sub를 쓰므로 기존 uid 흐름과 맞춰준다.
    if (payload && !payload.uid && payload.sub) payload.uid = payload.sub;
    req.user = payload; // { uid, role, tv }
    return next();
  } catch {
    return res.status(401).json({ message: 'invalid token' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'no user' });
    const uid = req.user.uid || req.user.sub;
    const { tv } = req.user;
    if (!uid) return res.status(401).json({ message: 'no user id' });
    const u = await User.findById(uid);
    if (!u) return res.status(401).json({ message: 'user not found' });
    if (u.isBlocked) return res.status(403).json({ message: 'blocked' });
    if ((u.tokenVersion || 0) !== (tv || 0)) return res.status(401).json({ message: 'token version mismatch' });
    if (u.role !== 'admin') return res.status(403).json({ message: 'admin only' });
    return next();
  } catch {
    return res.status(401).json({ message: 'admin check failed' });
  }
}

module.exports = { requireUser, requireAdmin };
