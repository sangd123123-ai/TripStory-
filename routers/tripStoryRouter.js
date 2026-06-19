// 📁 routers/tripStoryRouter.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { authRequired } = require('./auth');

// ✅ 스키마 불러오기
require('../models/storySchema');
const Story = mongoose.model('storydbs');

// ✅ 여행기록 스키마 불러오기
require('../models/mytripSchema');
const Mytrip = mongoose.model('mytripdbs');

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===================================
// 📂 uploads 폴더 자동 생성
// ===================================
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ===================================
// 🎯 계절 자동 감지 헬퍼 함수
// ===================================
function getSeasonFromDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const month = date.getMonth() + 1; // 1-12
  
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

// ===================================
// 🔍 검색 API
// ===================================
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || !q.trim()) {
      return res.json([]);
    }

    // 제목, 내용, 지역, 분위기, 키워드에서 검색
    const stories = await Story.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { region: { $regex: q, $options: 'i' } },
        { mood: { $regex: q, $options: 'i' } },
        { keywords: { $in: [new RegExp(q, 'i')] } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

    res.json(stories);
  } catch (err) {
    console.error('🔍 [검색 실패]', err);
    res.status(500).json({ error: '검색 실패' });
  }
});

// ===================================
// 💬 댓글 CRUD (대댓글 포함)
// ===================================

// 댓글 등록
router.post('/:id/comment', authRequired, async (req, res) => {
  const { text, parentId } = req.body;

  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: '스토리를 찾을 수 없습니다' });

    const newComment = {
      user: new mongoose.Types.ObjectId(req.user.uid),
      authorName: req.user?.nickname || req.user?.name || '익명',
      text,
      parentId: parentId || null,
      createdAt: new Date(),
    };

    story.comments.push(newComment);
    await story.save();

    // 새로 추가된 댓글 반환
    const added = story.comments[story.comments.length - 1];
    res.json(added);
  } catch (err) {
    console.error('💬 [댓글 등록 실패]', err);
    res.status(500).json({ error: '댓글 등록 실패' });
  }
});

// 댓글 목록 조회
router.get('/:id/comments', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('comments.user', 'nickname name email')
      .select('comments')
      .lean();

    if (!story) return res.status(404).json({ error: '스토리를 찾을 수 없습니다' });
    res.json(story.comments);
  } catch (err) {
    console.error('💬 [댓글 조회 실패]', err);
    res.status(500).json({ error: '댓글 조회 실패' });
  }
});

// 댓글 수정
router.put('/:storyId/comment/:commentId', authRequired, async (req, res) => {
  const { storyId, commentId } = req.params;
  const { text } = req.body;

  try {
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ error: '스토리를 찾을 수 없습니다' });

    const comment = story.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
    if (String(comment.user) !== String(req.user.uid))
      return res.status(403).json({ error: '수정 권한이 없습니다' });

    comment.text = text;
    await story.save();
    res.json(comment);
  } catch (err) {
    console.error('✏️ [댓글 수정 실패]', err);
    res.status(500).json({ error: '댓글 수정 실패' });
  }
});

// 댓글 삭제
router.delete('/:storyId/comment/:commentId', authRequired, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);
    if (!story) return res.status(404).json({ error: '스토리를 찾을 수 없습니다' });

    const comment = story.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
    if (String(comment.user) !== String(req.user.uid))
      return res.status(403).json({ error: '삭제 권한이 없습니다' });

    comment.remove();
    await story.save();

    res.json({ success: true });
  } catch (err) {
    console.error('🗑️ [댓글 삭제 실패]', err);
    res.status(500).json({ error: '댓글 삭제 실패' });
  }
});

// ===================================
// 🎨 여행기록 기반 AI 웹툰 이미지 생성 (수정)
// ===================================
const Stamp = mongoose.model('stampdbs');

// ===================================
// 🎨 여행기록 기반 AI 웹툰 이미지 생성 (수정)
// ===================================
router.post('/ai/preview-webtoon-from-mytrip/:mytripId', authRequired, async (req, res) => {
  const { mytripId } = req.params;
  const userId = req.user.uid;

  try {
    // 사용량 체크 (미리보기에도 적용)
    const webtoonCreationCount = await Story.countDocuments({ author: userId, mood: '웹툰' });
    const stampCount = await Stamp.countDocuments({ userId: userId });
    const totalAllowedCreations = 3 + (stampCount * 5);

    if (webtoonCreationCount >= totalAllowedCreations) {
      return res.status(403).json({ error: '웹툰 생성 횟수를 모두 사용했습니다. 여행 기록을 더 작성하여 스탬프를 모아보세요!' });
    }

    const mytrip = await Mytrip.findById(mytripId).lean();
    if (!mytrip) {
      return res.status(404).json({ error: '여행기록을 찾을 수 없습니다.' });
    }

    const { location, title, date, content, hashtags } = mytrip;
    const season = getSeasonFromDate(date);

    const webtoonImageUrls = [];
    const numCuts = Math.min(Math.max(4, Math.ceil(mytrip.content.length / 100)), 5);

    for (let i = 0; i < numCuts; i++) {
      let imagePrompt = `${location} 여행의 한 장면, 컷 #${i + 1}.\n`;
      imagePrompt += `전체 스토리: ${title}.\n`;
      if (content) {
        const contentSnippet = content.substring(0, 150);
        imagePrompt += `내용: ${contentSnippet}...\n`;
      }
      if (season) imagePrompt += `계절: ${season}.\n`;
      if (hashtags && hashtags.length > 0) imagePrompt += `키워드: ${hashtags.join(', ')}.\n`;
      imagePrompt += '스타일: 한국 웹툰, 밝고 감성적인 색감, 애니메이션, 일러스트. 말풍선 없음, 글자 없음, 텍스트 없음.';


      const imageRes = await client.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        size: "1024x1024",
      });

      const tempImageUrl = imageRes.data[0].url;
      let savedImageUrl = '';

      try {
        const imgRes = await axios.get(tempImageUrl, { responseType: 'arraybuffer' });
        const filename = `webtoon-${mytripId}-${Date.now()}-cut${i + 1}.png`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, imgRes.data);
        savedImageUrl = `/uploads/${filename}`;
      } catch (imgErr) {
        console.error(`⚠️ [웹툰 컷 #${i + 1} 다운로드 실패]`, imgErr.message);
        savedImageUrl = tempImageUrl; // fallback
      }
      webtoonImageUrls.push(savedImageUrl);
    }

    // 데이터베이스에 저장하지 않고 미리보기 데이터만 반환
    res.json({
      title,
      region: location,
      mood: '웹툰',
      keywords: hashtags,
      content,
      imageUrls: webtoonImageUrls,
      travelDate: date || '',
      author: userId,
    });
  } catch (err) {
    console.error("❌ [웹툰 미리보기 생성 실패]", err.message);
    res.status(500).json({ error: "웹툰 미리보기 생성에 실패했습니다." });
  }
});

// ===================================
// ✅ 트립스토리 저장 API
// ===================================
router.post('/', authRequired, async (req, res) => {
  const userId = req.user.uid;
  const { title, region, mood, keywords, content, imageUrls, travelDate } = req.body;

  try {
    const newStory = new Story({
      title,
      region,
      mood,
      keywords,
      content,
      imageUrls,
      travelDate,
      author: userId,
      createdAt: new Date(),
    });

    await newStory.save();
    res.status(201).json(newStory);
  } catch (err) {
    console.error("❌ [트립스토리 저장 실패]", err.message);
    res.status(500).json({ error: "트립스토리 저장에 실패했습니다." });
  }
});


// ===================================
// ❤️ 좋아요, 조회, 수정, 삭제
// ===================================

// 좋아요
router.post('/:id/like', authRequired, async (req, res) => {
  const userId = req.user.uid;
  const story = await Story.findById(req.params.id);

  if (!story) return res.status(404).json({ error: '스토리를 찾을 수 없습니다.' });

  const index = story.likes.findIndex(id => id.toString() === userId.toString());
  if (index === -1) story.likes.push(userId);
  else story.likes.splice(index, 1);

  await story.save();
  res.json({ liked: index === -1, likeCount: story.likes.length });
});

// 전체 목록
router.get('/all', async (req, res) => {
  const stories = await Story.find().sort({ createdAt: -1 }).lean();
  res.json(stories);
});

// 단일 조회
router.get('/:id', async (req, res) => {
  const story = await Story.findById(req.params.id).lean();
  if (!story) return res.status(404).json({ error: '스토리를 찾을 수 없습니다.' });
  res.json(story);
});

// ✅ 스토리 수정 API 추가
router.put('/:id', authRequired, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: '스토리를 찾을 수 없습니다.' });
    
    // 작성자 확인
    if (String(story.author) !== String(req.user.uid)) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    // 수정 가능한 필드만 업데이트
    const { title, region, mood, keywords, content, travelDate } = req.body;
    
    if (title) story.title = title;
    if (region) story.region = region;
    if (mood) story.mood = mood;
    if (keywords) story.keywords = keywords;
    if (content) story.content = content;
    if (travelDate !== undefined) story.travelDate = travelDate;

    await story.save();
    res.json(story);
  } catch (err) {
    console.error('✏️ [스토리 수정 실패]', err);
    res.status(500).json({ error: '스토리 수정 실패' });
  }
});

// ✅ 스토리 삭제 API 추가
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: '스토리를 찾을 수 없습니다.' });
    
    // 작성자 확인
    if (String(story.author) !== String(req.user.uid)) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await story.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('🗑️ [스토리 삭제 실패]', err);
    res.status(500).json({ error: '스토리 삭제 실패' });
  }
});

module.exports = router;
