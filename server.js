// server.js ??메인 ?�선 구조 + subserver 기능 ?�류
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

// ====== ?�키�??�등�?(?�으�?로드�?/ ?�어???�류 ?�이 ?�킵) ======
[
  './models/tripSchema',
  './models/mytripSchema',
  './models/imageSchema',
  './models/userSchema',
  './models/reviewSchema',
  './models/TravelReview',
  './models/Comment', // subserver?�서 ?�용
  './models/tripSchema',
  './models/approvalSchema',
  './models/stampSchema',
  './models/couponSchema',
  './models/Vendor'
].forEach((m) => { try { require(m); } catch (_) {} });

const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// ====== 미들?�어 ======
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

// ?�증 ?�드?�인??보호 (??�� 방�?)
app.use('/auth', rateLimit({ windowMs: 60_000, max: 300 }));
app.use('/admin-auth', rateLimit({ windowMs: 60_000, max: 300 }));

// ====== CORS (메인/로컬/LAN 모두 ?�용) ======
const allowList = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'https://tripstory-production-8030.up.railway.app',
  (process.env.CLIENT_ORIGIN || '').replace(/\/$/, ''),
].filter(Boolean));
const LAN3000 = /^http:\/\/192\.168\.\d+\.\d+:3000$/;
const LAN8080 = /^http:\/\/192\.168\.\d+\.\d+:8080$/;

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // Postman ??
    const norm = origin.replace(/\/$/, '');
    if (allowList.has(norm) || LAN3000.test(norm) || LAN8080.test(norm)) return cb(null, true);
    console.log('??CORS 차단:', origin);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// ====== ?�전 마운???�틸: ?�수??app) & Router ????지??======
function isRouterLike(mod) {
  // express.Router()??function?�면??use/handle/stack ?�성??가�?
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

    // 1) Router 객체/?�수 (express.Router())
    if (isRouterLike(mod)) {
      if (typeof basePathOrApp === 'string') {
        app.use(basePathOrApp, mod);
        console.log(`??mounted(router) ${basePathOrApp}: ${modPath}`);
      } else {
        // basePathOrApp === app ??경우, 경로 ?�이 바로 use
        basePathOrApp.use(mod);
        console.log(`??mounted(router) (no base): ${modPath}`);
      }
      return;
    }

    // 2) ?�수??모듈: (app) => { ... }
    if (typeof mod === 'function') {
      mod(app);
      console.log(`??mounted(fn): ${modPath}`);
      return;
    }

    // 3) 기�? 미들?�어 객체
    if (mod && typeof mod === 'object') {
      if (typeof basePathOrApp === 'string') {
        app.use(basePathOrApp, mod);
        console.log(`??mounted(mw) ${basePathOrApp}: ${modPath}`);
      } else {
        basePathOrApp.use(mod);
        console.log(`??mounted(mw) (no base): ${modPath}`);
      }
      return;
    }

    console.warn(`?�️ mount skipped (unknown export): ${modPath}`);
  } catch (e) {
    console.warn(`?�️ mount skipped ${modPath}: ${e.message}`);
  }
}

// ===== (A) 메인 ?�우??(?�선)
mountAuto('/auth', './routers/auth');                 // ???�기???�동?�별
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
  console.log('??mounted(router) /notices: ./routers/noticeRouter');
} catch (e) {
  console.warn('?�️ /notices skipped:', e.message);
}

// ===== (B) subserver 기능 (?�순??
mountAuto(app, './routers/weatherRouters');      // (app)=>...
mountAuto(app, './routers/festivalRouter');
mountAuto(app, './routers/themeTravelRouter');
mountAuto('/api/travel-reviews', './routers/travelReviewRouter');
mountAuto('/api/travel-reviews', './routers/commentRouter');

app.get("/_envcheck", (req, res) => {
  const mask = (v) => (v ? `${String(v).slice(0,5)}??${String(v).length})` : null);
  res.json({
    KMA_KEY: process.env.KMA_SERVICE_KEY ? "??OK" : "???�음",
    KTO_KEY: process.env.KTO_SERVICE_KEY ? "??OK" : "???�음",
    NODE_ENV: process.env.NODE_ENV,
  });
});



const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('??MongoDB connected (localhost:27017)');

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

    // 벤더 데이터 없으면 자동 시딩
    try {
      const Vendor = require('./models/Vendor');
      const count = await Vendor.countDocuments();
      if (count === 0) {
        const { seedVendors } = require('./scripts/seedVendors');
        await seedVendors(true);
        console.log('[seed] 벤더 데이터 자동 시딩 완료');
      }
    } catch (e) {
      console.warn('[seed] 벤더 시딩 실패(무시):', e.message);
    }

    app.listen(PORT, () => {
      console.log(`?? Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('??MongoDB connect error:', err);
    process.exit(1);
  });
