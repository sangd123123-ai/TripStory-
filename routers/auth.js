// routers/auth.js — 2025-10-28 통합본
// - profileImage 단일화
// - 소셜 upsert(경쟁 안전, userId 기준) + 쿠키/TTL 안정화
// - 프로필 이미지 업로드(updateFile) 포함

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const qs = require('querystring');

// 파일 업로드(multer)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('../models/userSchema');
const User = mongoose.model('userdbs');

const router = express.Router();

// ===== 환경 =====
const isProd = process.env.NODE_ENV === 'production';
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');

const ACCESS_TTL_SEC = 60 * 120;       // 120분
const REFRESH_TTL_SEC = 60 * 60 * 24;  // 24시간

// ===== JWT 유틸 =====
function signAccessToken(user) {
  return jwt.sign({ uid: String(user._id), role: user.role || 'user' }, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL_SEC });
}
function signRefreshToken(user) {
  return jwt.sign({ uid: String(user._id), typ: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL_SEC });
}

const refreshCookieOpts = {
  httpOnly: true,
  secure: isProd ? true : false,
  sameSite: isProd ? 'none' : 'lax',
  path: '/auth/refresh',
  maxAge: REFRESH_TTL_SEC * 1000,
};

// ===== 인증 미들웨어 =====
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'no token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    // ✅ 관리자 토큰(sub)도 유저 토큰(uid)처럼 인식되도록 매핑
    if (payload && !payload.uid && payload.sub) payload.uid = payload.sub;
    req.user = payload; // { uid }
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'invalid/expired token' });
  }
}

// ===== 업로드 준비 =====
fs.mkdirSync(path.join(__dirname, '..', 'uploads'), { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname).toLowerCase()}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif/.test(path.extname(file.originalname).toLowerCase()) &&
               /image\/(jpeg|png|gif)/.test(file.mimetype);
    return ok ? cb(null, true) : cb(new Error('이미지 파일만 업로드 가능합니다.'));
  }
});

// =======================================================
// 로컬: 회원가입/로그인/리프레시/ME/로그아웃/정보수정/파일수정
// =======================================================
router.post('/register', async (req, res) => {
  try {
    const { userId, password, email, name, nickname, address } = req.body || {};
    if (!userId || !password) return res.status(400).json({ message: '필수 값 누락' });

    const exists = await User.findOne({ userId });
    if (exists) return res.status(409).json({ message: '이미 존재하는 아이디' });

    const hashed = await bcrypt.hash(String(password), 10);
    const u = new User({
      userId,
      email: email || '',
      name: name || '',
      nickname: nickname || '',
      address: address || '',
      passwordHash: hashed,
      profileImage: '/img/profile-placeholder.png'
    });

    await u.save();

    res.json({ user: u.toSafeJSON ? u.toSafeJSON() : {
      id: String(u._id),
      userId: u.userId,
      email: u.email || '',
      name: u.name || '',
      nickname: u.nickname || '',
      address: u.address || '',
      profileImage: u.profileImage || ''
    }});
  } catch (e) {
    console.error('[auth/register]', e);
    res.status(500).json({ message: 'register error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body || {};
    const u = await User.findOne({ userId });
    if (!u) return res.status(401).json({ message: '아이디/비밀번호 확인' });

    const ok = await bcrypt.compare(String(password), String(u.passwordHash || ''));
    if (!ok) return res.status(401).json({ message: '아이디/비밀번호 확인' });

    const at = signAccessToken(u);
    const rt = signRefreshToken(u);

    // lastLogin 업데이트 (방문자 집계용)
    await User.findByIdAndUpdate(u._id, { lastLogin: new Date() });

    // refresh cookie 저장
    res.cookie('rt', rt, refreshCookieOpts);
    res.json({ accessToken: at, user: u.toSafeJSON ? u.toSafeJSON() : {
      id: String(u._id),
      userId: u.userId, email: u.email || '',
      profileImage: u.profileImage || ''
    }});
  } catch (e) {
    console.error('[auth/login]', e);
    res.status(500).json({ message: 'login error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.rt;
    if (!token) return res.status(401).json({ message: 'no refresh cookie' });

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const u = await User.findById(payload.uid);
    if (!u) return res.status(401).json({ message: 'no user' });

    const at = signAccessToken(u);
    const newRT = signRefreshToken(u);

    res.cookie('rt', newRT, refreshCookieOpts);
    res.json({ accessToken: at });
  } catch (e) {
    console.error('[auth/refresh]', e);
    res.status(401).json({ message: 'refresh error' });
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const u = await User.findById(req.user.uid);
    if (!u) return res.status(404).json({ message: 'not found' });
    res.json({ user: u.toSafeJSON ? u.toSafeJSON() : {
      id: String(u._id),
      userId: u.userId,
      email: u.email || '',
      name: u.name || '',
      nickname: u.nickname || '',
      address: u.address || '',
      role: u.role || 'user',
      roles: u.roles || (u.role ? [u.role] : ['user']),
      isBlocked: !!u.isBlocked,
      profileImage: u.profileImage || '',
      lastLogin: u.lastLogin || null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }});
  } catch (e) {
    res.status(401).json({ message: 'auth failed' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('rt', { ...refreshCookieOpts, maxAge: 0 });
  res.json({ ok: true });
});

router.put('/update', authRequired, async (req, res) => {
  try {
    const { email, nickname, address, name, password } = req.body || {};
    const me = await User.findById(req.user.uid);
    if (!me) return res.status(404).json({ message: 'not found' });

    if (email !== undefined) me.email = email;
    if (nickname !== undefined) me.nickname = nickname;
    if (address !== undefined) me.address = address;
    if (name !== undefined) me.name = name;
    if (password) me.passwordHash = await bcrypt.hash(String(password), 10);

    await me.save();
    res.json({ user: me.toSafeJSON ? me.toSafeJSON() : {
      id: String(me._id),
      userId: me.userId,
      email: me.email || '',
      nickname: me.nickname || '',
      address: me.address || '',
      name: me.name || '',
      profileImage: me.profileImage || ''
    }});
  } catch (e) {
    console.error('[auth/update]', e);
    res.status(500).json({ message: 'update error' });
  }
});

// 파일 포함 수정 (multipart/form-data: field name = "upload")
router.put('/updateFile', authRequired, upload.single('upload'), async (req, res) => {
  try {
    const me = await User.findById(req.user.uid);
    if (!me) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

    const { name, nickname, email, address, password } = req.body || {};
    if (name !== undefined) me.name = name;
    if (nickname !== undefined) me.nickname = nickname;
    if (email !== undefined) me.email = email;
    if (address !== undefined) me.address = address;
    if (password) me.passwordHash = await bcrypt.hash(String(password), 10);

    if (req.file) {
      // 이전 사용자 파일 삭제(기본 플레이스홀더는 유지)
      if (me.profileImage && !me.profileImage.includes('/img/profile-placeholder.png')) {
        const oldLocal = me.profileImage.startsWith('http://localhost:8080/')
          ? me.profileImage.replace('http://localhost:8080/', '')
          : me.profileImage.startsWith('/uploads/')
            ? me.profileImage.slice(1)
            : null;
        if (oldLocal) {
          const oldPath = path.join(__dirname, '..', oldLocal);
          try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (_) {}
        }
      }
      // 새 파일 URL 저장(서버 정적 경로 기준)
      me.profileImage = `/uploads/${req.file.filename}`;
    }

    await me.save();
    res.json({ user: me.toSafeJSON ? me.toSafeJSON() : {
      id: String(me._id),
      userId: me.userId,
      email: me.email || '',
      name: me.name || '',
      nickname: me.nickname || '',
      address: me.address || '',
      profileImage: me.profileImage || ''
    }});
  } catch (e) {
    console.error('프로필 업데이트 오류:', e);
    res.status(500).json({ message: '프로필 업데이트 실패' });
  }
});

// ======================================
// Kakao OAuth (이메일 없이도 진행 + profileImage 수집)
// ======================================
router.get('/kakao', (req, res) => {
  const authorizeURL = 'https://kauth.kakao.com/oauth/authorize';
  const query = qs.stringify({
    response_type: 'code',
    client_id: process.env.KAKAO_CLIENT_ID,
    redirect_uri: process.env.KAKAO_REDIRECT_URI,
    scope: 'profile_nickname profile_image',
  });
  return res.redirect(`${authorizeURL}?${query}`);
});

router.get('/kakao/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect(`${CLIENT_ORIGIN}/login?error=social_kakao_no_code`);

    const tokenRes = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      qs.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        client_secret: process.env.KAKAO_CLIENT_SECRET || undefined,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const kakaoAccess = tokenRes.data?.access_token;
    if (!kakaoAccess) return res.redirect(`${CLIENT_ORIGIN}/login?error=social_kakao_no_token`);

    const meRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${kakaoAccess}` },
    });

    const kakao = meRes.data;
    const providerId = String(kakao.id);
    const acc = kakao.kakao_account || {};
    const prof = acc.profile || {};
    const nickname = prof.nickname || '';
    const name = nickname;
    const profileImage = prof.profile_image_url || (kakao.properties && kakao.properties.profile_image) || '';

    const userId = `kakao_${providerId}`;

    // userId 기준 경쟁 안전 upsert
    const u = await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          provider: 'kakao',
          providerId,
          name: name || undefined,
          nickname: nickname || undefined,
          profileImage: profileImage || undefined,
          role: 'user',
          lastLogin: new Date(),
        },
        $setOnInsert: {
          email: '',
          createdAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    const at = signAccessToken(u);
    const rt = signRefreshToken(u);
    res.cookie('rt', rt, refreshCookieOpts);
    return res.redirect(`${CLIENT_ORIGIN}/?token=${encodeURIComponent(at)}`);
  } catch (e) {
    console.error('[kakao/callback]', e?.response?.data || e.message);
    return res.redirect(`${CLIENT_ORIGIN}/login?error=social_kakao`);
  }
});

// ======================================
// Google OAuth (openid profile, 이메일 없이 진행)
// ======================================
router.get('/google', (req, res) => {
  const authorizeURL = 'https://accounts.google.com/o/oauth2/v2/auth';
  const query = qs.stringify({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  return res.redirect(`${authorizeURL}?${query}`);
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect(`${CLIENT_ORIGIN}/login?error=social_google_no_code`);

    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      qs.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const googleAccess = tokenRes.data?.access_token;
    if (!googleAccess) return res.redirect(`${CLIENT_ORIGIN}/login?error=social_google_no_token`);

    const meRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleAccess}` },
    });
    const g = meRes.data;
    const providerId = String(g.sub);
    const picture = g.picture || '';
    const name = g.name || '';
    const nickname = g.given_name || g.name || '';

    const userId = `google_${providerId}`;

    const u = await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          provider: 'google',
          providerId,
          name: name || undefined,
          nickname: nickname || undefined,
          profileImage: picture || undefined,
          role: 'user',
          lastLogin: new Date(),
        },
        $setOnInsert: {
          email: '',
          createdAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    const at = signAccessToken(u);
    const rt = signRefreshToken(u);
    res.cookie('rt', rt, refreshCookieOpts);
    return res.redirect(`${CLIENT_ORIGIN}/?token=${encodeURIComponent(at)}`);
  } catch (e) {
    console.error('[google/callback]', e?.response?.data || e.message);
    return res.redirect(`${CLIENT_ORIGIN}/login?error=social_google`);
  }
});

// ======================================
// 회원 탈퇴 (로그인 사용자 본인 삭제)
// ======================================
router.delete('/delete', authRequired, async (req, res) => {
  try {
    // 로그인된 사용자 정보
    const me = await User.findById(req.user.uid);
    if (!me) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

    // 프로필 이미지 파일 삭제 (기본 이미지는 제외)
    if (me.profileImage && !me.profileImage.includes('/img/profile-placeholder.png')) {
      const oldLocal = me.profileImage.startsWith('http://localhost:8080/')
        ? me.profileImage.replace('http://localhost:8080/', '')
        : me.profileImage.startsWith('/uploads/')
          ? me.profileImage.slice(1)
          : null;
      if (oldLocal) {
        const oldPath = path.join(__dirname, '..', oldLocal);
        try {
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (_) {}
      }
    }

    // 사용자 문서 삭제
    await me.deleteOne();

    // refresh 쿠키 제거
    res.clearCookie('rt', { ...refreshCookieOpts, maxAge: 0 });

    console.log(`[auth/delete] 회원 ${me.userId} 삭제 완료`);
    res.json({ ok: true, message: '계정이 성공적으로 삭제되었습니다.' });
  } catch (e) {
    console.error('[auth/delete]', e);
    res.status(500).json({ message: '회원 탈퇴 중 오류가 발생했습니다.' });
  }
});


module.exports = router;
module.exports.authRequired = authRequired;