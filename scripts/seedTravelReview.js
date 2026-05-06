// server/scripts/seedTravelReviews.js
// 사용법 예:
//   node server/scripts/seedTravelReviews.js \
//     --from client/src/sampleData/travelSampleData.js \
//     --uri mongodb://127.0.0.1:27017/tripstory \
//     --author 67123abc... (userdbs의 기존 사용자 _id)

const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const mongoose = require("mongoose");
require("dotenv").config();

// 모델 (스키마: images 1장 이상, author/authorName/type 등 필수)
const TravelReview = require("./models/TravelReview");

// -------- CLI args --------
const argv = process.argv.slice(2);
function getArg(name, fallback) {
  const ix = argv.findIndex(a => a === `--${name}`);
  return ix >= 0 ? argv[ix + 1] : fallback;
}

const FROM = getArg("from", "./sampleData/travelSampleData.js");
const MONGO_URI = getArg("uri", process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tripstory");
const AUTHOR_ID_CLI = getArg("author", process.env.SEED_AUTHOR_ID || null);
const AUTHOR_NAME = process.env.SEED_AUTHOR_NAME || "샘플작성자";
const PLACEHOLDER_IMG = process.env.SEED_PLACEHOLDER_IMG || "https://via.placeholder.com/1200x800?text=Travel";

// -------- helpers --------
async function loadSamples(modulePath) {
  const abs = path.resolve(modulePath);

  // 1) .js(ESM) 파일에서 export된 travelSamples 불러오기 (프론트 파일 그대로 사용)
  //    Node CommonJS에서도 dynamic import 가능
  try {
    const mod = await import(pathToFileURL(abs).href);
    if (mod && mod.travelSamples) return mod.travelSamples;
  } catch (e) {
    // fall-through
  }

  // 2) JSON 파일이라면 그대로 파싱
  if (abs.endsWith(".json")) {
    const raw = fs.readFileSync(abs, "utf-8");
    return JSON.parse(raw);
  }

  throw new Error(`샘플 데이터를 읽지 못했습니다. --from 경로를 확인하세요: ${abs}`);
}

function toDoc(sample, authorId) {
  return {
    title: sample.title || "",
    content: (sample.content || "").trim(),
    hashtags: Array.isArray(sample.hashtags) ? sample.hashtags : [],
    recommendLinks: Array.isArray(sample.recommendLinks) ? sample.recommendLinks : [],
    type: sample.type === "국내" || sample.type === "국외" ? sample.type : "국내", // enum 강제
    images: Array.isArray(sample.images) && sample.images.length > 0 ? sample.images : [PLACEHOLDER_IMG], // 최소 1장
    author: authorId,                            // 필수(ObjectId)
    authorName: sample.authorName || AUTHOR_NAME, // 필수(String)
    likeCount: 0,
    viewCount: 0,
    commentCount: Array.isArray(sample.comments) ? sample.comments.length : 0,
  };
}

async function pickAuthorIdIfMissing() {
  if (AUTHOR_ID_CLI) return AUTHOR_ID_CLI;

  // userdbs 컬렉션에서 1명 가져오기 (모델 모름 → native로 조회)
  const user = await mongoose.connection.db.collection("userdbs").findOne({});
  if (!user || !user._id) {
    throw new Error("SEED_AUTHOR_ID 미지정 & userdbs에 사용자가 없습니다. --author 또는 SEED_AUTHOR_ID를 지정하세요.");
  }
  return user._id;
}

async function main() {
  console.log("➡️  Mongo 연결:", MONGO_URI);
  await mongoose.connect(MONGO_URI);

  const authorId = await pickAuthorIdIfMissing();

  console.log("➡️  샘플 로드:", FROM);
  const samples = await loadSamples(FROM);

  // 중복 삽입 방지(원하면 제거)
  const exist = await TravelReview.countDocuments();
  const FORCE = argv.includes("--force");
    if (exist > 0 && !FORCE) {
    console.log(`ℹ️ 기존 문서 ${exist}건이 있어 시드를 건너뜁니다. (--force 옵션으로 덮어쓰기 가능)`);
    await mongoose.disconnect();
    return;
    }

    if (exist > 0 && FORCE) {
    console.log("⚠️ 기존 travelreviews 데이터를 모두 삭제합니다...");
    await TravelReview.deleteMany({});
    }

  const docs = samples.map(s => toDoc(s, authorId));
  const result = await TravelReview.insertMany(docs);
  console.log(`✅ 삽입 완료: ${result.length}건`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("❌ 시드 실패:", err);
  process.exit(1);
});
