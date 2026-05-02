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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(helmet({ crossOriginResourcePolicy: false }));
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
mountAuto('/admin/notice', './routers/adminNoticeRouter');
mountAuto('/admin/notices', './routers/adminNoticeRouter');
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


// ====== React ?�적 빌드 ?�빙 (?�을 ?�만) ======
try {
  const buildDir = path.join(__dirname, 'tripstory', 'build');
  app.use(express.static(buildDir));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(buildDir, 'index.html')));
  console.log('??static build served from /tripstory/build');
} catch (e) {
  console.warn('?�️ build serve skipped:', e.message);
}

console.log("ENV CHECK:", process.env.MONGODB_URI); const MONGODB_URI = "mongodb+srv://sangd123123_db_user:L5xzTtKfnyTpWKsu@cluster0.mf4xhgw.mongodb.net/tripstory?appName=Cluster0";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('??MongoDB connected (localhost:27017)');
    app.listen(PORT, () => {
      console.log(`?? Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('??MongoDB connect error:', err);
    process.exit(1);
  });
