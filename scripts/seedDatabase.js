// seedDatabase.js (replacement)
const path = require('path');
const mongoose = require('mongoose');
const TravelReview = require('./models/TravelReview');
const Comment = require('./models/Comment');

// ===== 샘플 데이터 로드 (루트 경로의 JSON 사용) =====
const travelSamples = require(path.join(__dirname, 'travel_review_samples_europe.json'));
const commentSamples = require(path.join(__dirname, 'comment_samples_europe.json'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tripstory';

// 더미 authorId (userdbs는 그대로 두기 위함)
const DUMMY_AUTHOR_ID = new mongoose.Types.ObjectId('66f000000000000000000001');

// TravelReview.type 스키마: '국내' | '국외' 만 허용됨
function normalizeType(t) {
  if (!t) return '국외';
  const v = String(t).trim().toLowerCase();
  if (v === '국내' || v === 'domestic') return '국내';
  if (v === '국외' || v === 'international') return '국외';
  return '국외';
}

// 제목 → 댓글 배열 매핑 생성 (comment_samples_europe.json 기반)
function buildCommentMap(rawComments) {
  const map = new Map();
  for (const item of rawComments || []) {
    const key = String(item.reviewTitle || '').trim();
    if (!key) continue;
    map.set(key, Array.isArray(item.comments) ? item.comments : []);
  }
  return map;
}

async function seedDatabase() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB 연결 성공');

  try {
    // 기존 데이터 삭제 (후기/댓글만)
    await Comment.deleteMany({});
    console.log('🗑️ 기존 Comment 데이터 삭제 완료');
    await TravelReview.deleteMany({});
    console.log('🗑️ 기존 TravelReview 데이터 삭제 완료');

    const cMap = buildCommentMap(commentSamples);
    const inserted = [];

    // 1) TravelReview 생성
    for (const raw of travelSamples) {
      const images =
        Array.isArray(raw.images) && raw.images.length > 0
          ? raw.images
          : ['https://via.placeholder.com/1200x800?text=Travel+Photo'];

      const doc = {
        title: raw.title || '',
        content: raw.content || '',
        type: normalizeType(raw.type),
        hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : [],
        recommendLinks: Array.isArray(raw.recommendLinks) ? raw.recommendLinks : [],
        author: DUMMY_AUTHOR_ID, // ref: 'userdbs'
        authorName: raw.authorName || '익명',
        images,
        likeCount: typeof raw.likeCount === 'number' ? raw.likeCount : 0,
        viewCount: typeof raw.viewCount === 'number' ? raw.viewCount : 0,
        // commentCount는 2단계에서 실제 생성된 댓글 수로 재계산하여 업데이트
        commentCount: 0,
      };

      const saved = await TravelReview.create(doc);
      inserted.push(saved);
      console.log(`✅ Inserted Review: ${saved.title}`);
    }

    // 2) Comment 생성 + commentCount 동기화
    for (const review of inserted) {
      const title = String(review.title || '').trim();
      const commentsForReview = cMap.get(title) || [];

      let createdCount = 0;
      for (const c of commentsForReview) {
        // user/username은 샘플이므로 더미 user, 표시명은 샘플 authorName 사용
        await Comment.create({
          content: c.content || '',
          user: DUMMY_AUTHOR_ID, // ref: 'userdbs' (더미)
          username: c.authorName || '익명',
          travelReview: review._id,
          parent: null,
        });
        createdCount += 1;
      }

      if (createdCount > 0) {
        await TravelReview.findByIdAndUpdate(
          review._id,
          { $set: { commentCount: createdCount } },
          { new: true }
        );
        console.log(`🗨️  Set commentCount=${createdCount} for "${title}"`);
      }
    }

    console.log(`\n🎉 완료: 새로 삽입된 게시글 ${inserted.length}건`);
    console.log('✅ 시드 작업 완료');
    process.exit(0);
  } catch (err) {
    console.error('❌ 시드 작업 중 오류 발생:', err);
    process.exit(1);
  }
}

seedDatabase();
