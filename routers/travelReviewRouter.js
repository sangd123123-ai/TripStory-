// travelReviewRouter.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
// ⬇️ 메인의 인증 미들웨어 (서버가 CJS이므로 require로 통일)
const { authRequired } = require('./auth');

// ⬇️ 모델: 라우터 폴더 기준 상대경로 혼동 방지 위해 mongoose.model 사용
//    (이미 어딘가에서 스키마가 등록되어 있다고 가정)
const TravelReview = mongoose.model('TravelReview');
const User = mongoose.model('userdbs');

/**
 * 목록
 * GET /api/travel-reviews?type=&hashtag=&page=&size=
 * - 프론트에서 클라 필터/페이징도 하므로 서버는 가능한 한 유연하게 응답
 */
router.get('/', async (req, res) => {
  try {
    const { type, hashtag, page = 1, size = 9 } = req.query;

    const q = {};
    if (type === '국내' || type === '국외') q.type = type;
    if (hashtag) q.hashtags = hashtag;

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const sz = Math.max(1, parseInt(size, 10) || 9);

    const [items, total] = await Promise.all([
      TravelReview.find(q)
        .sort({ createdAt: -1 })
        .skip((pg - 1) * sz)
        .limit(sz)
        .select('title type hashtags coverUrl images authorName likeCount commentCount viewCount createdAt')
        .lean(),
      TravelReview.countDocuments(q),
    ]);

    return res.json({
      success: true,
      data: items,
      meta: {
        page: pg,
        size: sz,
        total,
        totalPages: Math.max(1, Math.ceil(total / sz)),
      },
    });
  } catch (e) {
    console.error('후기 목록 실패:', e);
    return res.status(500).json({ success: false, message: '후기 목록 실패' });
  }
});

/**
 * 상세
 * GET /api/travel-reviews/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const r = await TravelReview.findByIdAndUpdate(
  req.params.id,
  { $inc: { viewCount: 1 } },
  { new: true }
).lean();
    if (!r) return res.status(404).json({ success: false, message: '게시물을 찾을 수 없습니다.' });
    return res.json({ success: true, data: r });
  } catch (e) {
    console.error('후기 상세 실패:', e);
    return res.status(500).json({ success: false, message: '후기 상세 실패' });
  }
});

/**
 * 작성
 * POST /api/travel-reviews
 */
router.post('/', authRequired, async (req, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const me = await User.findById(req.user.uid);
    if (!me) return res.status(401).json({ success: false, message: '유저 정보를 찾을 수 없습니다.' });

    // ✅ location 필드만 제외
    const { location, ...safeBody } = req.body || {};

    const doc = new TravelReview({
      ...safeBody,
      author: me._id,
      authorName: me.nickname || me.name || '익명',
    });

    await doc.save();
    return res.status(201).json({ success: true, data: doc });
  } catch (e) {
    console.error('후기 작성 실패:', e);
    return res.status(500).json({ success: false, message: '후기 작성 실패' });
  }
});

/**
 * 수정
 * PUT /api/travel-reviews/:id
 */
router.put('/:id', authRequired, async (req, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const r = await TravelReview.findById(req.params.id);
    if (!r) return res.status(404).json({ success: false, message: '게시물을 찾을 수 없습니다.' });

    if (String(r.author) !== String(req.user.uid)) {
      return res.status(403).json({ success: false, message: '수정 권한이 없습니다.' });
    }

    // ✅ location 필드만 제외하고 업데이트
    const { location, ...safeUpdates } = req.body || {};
    Object.assign(r, safeUpdates);

    await r.save();

    return res.json({ success: true, data: r });
  } catch (e) {
    console.error('후기 수정 실패:', e);
    return res.status(500).json({ success: false, message: '후기 수정 실패' });
  }
});

/**
 * 삭제
 * DELETE /api/travel-reviews/:id
 */
router.delete('/:id', authRequired, async (req, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const r = await TravelReview.findById(req.params.id);
    if (!r) return res.status(404).json({ success: false, message: '게시물을 찾을 수 없습니다.' });

    if (String(r.author) !== String(req.user.uid)) {
      return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
    }

    await r.deleteOne();
    return res.json({ success: true });
  } catch (e) {
    console.error('후기 삭제 실패:', e);
    return res.status(500).json({ success: false, message: '후기 삭제 실패' });
  }
});

/**
 * 좋아요 토글
 * POST /api/travel-reviews/:id/like
 */
router.post('/:id/like', authRequired, async (req, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const r = await TravelReview.findById(req.params.id);
    if (!r) return res.status(404).json({ success: false, message: '게시물을 찾을 수 없습니다.' });

    const me = String(req.user.uid);
    const has = (r.likes || []).some((x) => String(x) === me);

    if (has) {
      r.likes = (r.likes || []).filter((x) => String(x) !== me);
    } else {
      r.likes = [...(r.likes || []), req.user.uid];
    }
    r.likeCount = (r.likes || []).length;

    await r.save();
    return res.json({ success: true, liked: !has, likeCount: r.likeCount });
  } catch (e) {
    console.error('좋아요 실패:', e);
    return res.status(500).json({ success: false, message: '좋아요 처리 실패' });
  }
});

module.exports = router;
