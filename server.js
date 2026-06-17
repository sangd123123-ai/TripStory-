// server.js 메인 라우팅 진입점 + 기존 subserver 라우터 연결
const express = require('express');
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

dotenv.config();

// ====== 스키마를 안전하게 미리 로드합니다. 없거나 안 쓰는 모델은 건너뜁니다. ======
[
  './models/tripSchema',
  './models/mytripSchema',
  './models/imageSchema',
  './models/userSchema',
  './models/reviewSchema',
  './models/TravelReview',
  './models/Comment', // subserver 라우터에서 사용
  './models/tripSchema',
  './models/approvalSchema',
  './models/stampSchema',
  './models/couponSchema',
  './models/Vendor'
].forEach((m) => { try { require(m); } catch (_) {} });

const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// ====== 미들웨어 ======
app.use(compression());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));
app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:'],
    },
  },
}));
app.use(morgan('dev'));

// 인증 엔드포인트 과다 요청을 제한합니다.
app.use('/auth', rateLimit({ windowMs: 60_000, max: 300 }));
app.use('/admin-auth', rateLimit({ windowMs: 60_000, max: 300 }));

// ====== CORS (배포, 로컬, LAN 출처 허용) ======
const allowList = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  (process.env.CLIENT_ORIGIN || '').replace(/\/$/, ''),
].filter(Boolean));
const LAN3000 = /^http:\/\/192\.168\.\d+\.\d+:3000$/;
const LAN8080 = /^http:\/\/192\.168\.\d+\.\d+:8080$/;

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // Postman 또는 동일 출처 요청
    const norm = origin.replace(/\/$/, '');
    if (allowList.has(norm) || LAN3000.test(norm) || LAN8080.test(norm)) return cb(null, true);
    console.log('CORS 차단:', origin);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// ====== 안전한 라우터 마운트 유틸: Router, 미들웨어, (app) 모듈 지원 ======
function isRouterLike(mod) {
  // express.Router 인스턴스는 use/handle을 가집니다.
  return (
    mod &&
    (typeof mod === 'function' || typeof mod === 'object') &&
    typeof mod.use === 'function' &&
    typeof mod.handle === 'function'
  );
}

function mountAuto(basePathOrApp, modPath) {
  try {
    const mod = require(modPath);

    // 1) Router 객체/함수 (express.Router())
    if (isRouterLike(mod)) {
      if (typeof basePathOrApp === 'string') {
        app.use(basePathOrApp, mod);
        console.log(`mounted(router) ${basePathOrApp}: ${modPath}`);
      } else {
        // basePathOrApp이 app이면 base path 없이 바로 연결합니다.
        basePathOrApp.use(mod);
        console.log(`mounted(router) (no base): ${modPath}`);
      }
      return;
    }

    // 2) 함수형 모듈: (app) => { ... }
    if (typeof mod === 'function') {
      mod(app);
      console.log(`mounted(fn): ${modPath}`);
      return;
    }

    // 3) 미들웨어 형태의 객체
    if (mod && typeof mod === 'object') {
      if (typeof basePathOrApp === 'string') {
        app.use(basePathOrApp, mod);
        console.log(`mounted(mw) ${basePathOrApp}: ${modPath}`);
      } else {
        basePathOrApp.use(mod);
        console.log(`mounted(mw) (no base): ${modPath}`);
      }
      return;
    }

    console.warn(`mount skipped (unknown export): ${modPath}`);
  } catch (e) {
    console.warn(`mount skipped ${modPath}: ${e.message}`);
  }
}

// ===== (A) 메인 라우터 =====
mountAuto('/auth', './routers/auth');
mountAuto('/admin-auth', './routers/adminAuth');
mountAuto('/admin', './routers/adminNoticeRouter');
mountAuto('/admin', './routers/adminUserRouter');
mountAuto('/api/ai', './routers/aiRouter');
mountAuto('/admin-stats', './routers/adminStatsRouter');
mountAuto("/geo", './routers/geoRouter');
mountAuto("/api/places", './routers/placesRouter');
mountAuto("/api/weather-course", "./routers/weatherCourseRouter");
mountAuto("/api", "./routers/weeklyFestivalRouter");
mountAuto("/approval", "./routers/approvalRouters");
mountAuto("/stamp", "./routers/stampRouters");
mountAuto("/mytrip", "./routers/mytripRouters");
mountAuto('/api/coupons', './routers/couponRouter');
mountAuto('/api/market', './routers/marketRouter');
mountAuto('/api/tripstory', './routers/tripStoryRouter');
mountAuto('/api/visit',    './routers/visitRouter');

try {
  const noticeRouter = require('./routers/noticeRouter');
  app.use('/notices', noticeRouter);
  console.log('mounted(router) /notices: ./routers/noticeRouter');
} catch (e) {
  console.warn('/notices skipped:', e.message);
}

// ===== (B) 기존 subserver 기능 =====
mountAuto(app, './routers/weatherRouters');      // (app)=>...
mountAuto(app, './routers/festivalRouter');
mountAuto(app, './routers/themeTravelRouter');
mountAuto('/api/travel-reviews', './routers/travelReviewRouter');
mountAuto('/api/travel-reviews', './routers/commentRouter');

app.get("/_envcheck", (req, res) => {
  const mask = (v) => (v ? `${String(v).slice(0, 5)}...(${String(v).length})` : null);
  res.json({
    KMA_KEY: process.env.KMA_SERVICE_KEY ? "OK" : "없음",
    KTO_KEY: process.env.KTO_SERVICE_KEY ? "OK" : "없음",
    NODE_ENV: process.env.NODE_ENV,
  });
});



const MONGODB_URI = process.env.MONGODB_URI;

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');

    // 관리자 name/nickname 깨진 문자 복구 (1회성 마이그레이션)
    try {
      const User = mongoose.model('userdbs');
      const result = await User.updateMany(
        { role: 'admin' },
        [{ $set: {
          name: { $cond: [{ $or: [{ $eq: ['$name', ''] }, { $eq: ['$name', null] }, { $not: [{ $regexMatch: { input: { $ifNull: ['$name', ''] }, regex: /^[\x20-\x7E가-힣ᄀ-ᇿ㄰-㆏]+$/ } }] }] }, '관리자', '$name'] },
          nickname: { $cond: [{ $or: [{ $eq: ['$nickname', ''] }, { $eq: ['$nickname', null] }, { $not: [{ $regexMatch: { input: { $ifNull: ['$nickname', ''] }, regex: /^[\x20-\x7E가-힣ᄀ-ᇿ㄰-㆏]+$/ } }] }] }, '관리자', '$nickname'] },
        }}]
      );
      if (result.modifiedCount > 0) console.log(`관리자 name/nickname 복구: ${result.modifiedCount}건`);
    } catch (e) {
      console.warn('관리자 마이그레이션 실패(무시):', e.message);
    }

    // 서버 시작 시 벤더 데이터를 지우는 작업은 위험하므로
    // 개발 환경에서 명시적으로 허용한 경우에만 실행합니다.
    try {
      if (process.env.NODE_ENV === 'development' && process.env.CLEAR_VENDOR_SAMPLE_DATA === 'true') {
        const Vendor = require('./models/Vendor');
        const result = await Vendor.deleteMany({});
        if (result.deletedCount > 0) console.log(`[market] 벤더 샘플 데이터 삭제 완료: ${result.deletedCount}건`);
      }
    } catch (e) {
      console.warn('[market] 벤더 샘플 데이터 삭제 건너뜀:', e.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connect error:', err);
    process.exit(1);
  });
