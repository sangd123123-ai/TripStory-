const express = require('express')
const mongoose = require('mongoose')

require('../models/approvalSchema')
require('../models/mytripSchema')

const approvalTrip = mongoose.model('approvaldbs')
const mytrip = mongoose.model('mytripdbs')
const User = mongoose.model('userdbs')

// ✅ authRequired fallback 추가
const jwt = require('jsonwebtoken');
const auth = require('./auth');

// ✅ 유저 인증 미들웨어 그대로 유지
const authRequired = auth.authRequired || ((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: '로그인이 필요합니다.' });
  }
  next();
});

// ✅ 관리자 토큰(admin-auth 발급용) 직접 검증 추가
const adminRequired = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(403).json({ error: true, message: '관리자 토큰이 없습니다.' });
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // 여기 핵심
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: true, message: '관리자 권한이 필요합니다.' });
    }

    req.user = payload;
    next();
  } catch (err) {
    console.error('adminRequired 인증 실패:', err.message);
    return res.status(403).json({ error: true, message: '관리자 인증 실패' });
  }
};

console.log('adminRequired type: ', typeof adminRequired)
const router = express.Router()

// 사용자: 승인 대기 목록 조회 (승인 완료 포함)
router.get('/myPending', authRequired, async (req, res) => {
  try {
    const uid = req.user.uid || req.user.sub || req.user._id;

    // ✅ status가 completed가 아닌 것만 조회
    const pending = await approvalTrip
      .find({
        userId: uid,
        status: { $in: ['pending', 'approved', 'rejected'] }, // completed 제외
      })
      .sort({ createdAt: -1 });

    res.status(200).send(pending);
  } catch (err) {
    console.error('승인 대기 목록 조회 실패:', err);
    res.status(500).send({ error: true, message: '조회 실패' });
  }
});


// 사용자: 승인 요청 제출
router.post('/submit', authRequired, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      userId: req.user.uid || req.user.sub || req.user._id,
      status: 'pending',
    };
    const trip = await approvalTrip.create(payload);
    res.status(200).send({ error: false, trip });
  } catch (err) {
    console.error('승인 요청 제출 실패:', err);
    res.status(500).send({ error: true, message: '제출 실패' });
  }
});

// 관리자: 승인 대기 목록 조회
router.get('/pendingList', adminRequired, async (req, res) => {
  try {
    const pending = await approvalTrip.find({ status: 'pending' }).sort({ createdAt: -1 }).lean()

    // userId(ObjectId 문자열)로 닉네임 일괄 조회
    const userIds = [...new Set(pending.map(t => t.userId))]
    const users = await User.find({ _id: { $in: userIds } }).select('nickname name userId').lean()
    const userMap = {}
    users.forEach(u => {
      userMap[String(u._id)] = u.nickname || u.name || u.userId
    })

    const result = pending.map(t => ({ ...t, userNickname: userMap[t.userId] || t.userId }))
    res.status(200).send(result)
  } catch (err) {
    console.error('승인 대기 목록 조회 실패:', err)
    res.status(500).send({ error: true, message: '조회 실패' })
  }
})

// 관리자: 승인 처리
router.post('/approve/:id', adminRequired, async (req, res) => {
  try {
    const trip = await approvalTrip.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'approved' },
      { new: true }
    );
    if (!trip) return res.status(404).json({ error: '승인 요청을 찾을 수 없거나 이미 처리되었습니다.' });

    res.json({ success: true, message: '관리자 승인 완료 (사용자 확인 대기 중)' });
  } catch (err) {
    console.error('승인 처리 실패:', err);
    res.status(500).json({ error: '승인 처리 중 오류 발생' });
  }
});


// 관리자: 거부 처리
router.post('/reject/:id', adminRequired, async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const trip = await approvalTrip.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectReason: reason },
      { new: true }
    )

    if (!trip) {
      return res.status(404).send({ error: true, message: '데이터 없음' })
    }

    res.status(200).send({ error: false, message: '거부 완료' })
  } catch (err) {
    console.error('거부 처리 실패:', err)
    res.status(500).send({ error: true, message: '거부 처리 실패' })
  }
})

//사용자 - 승인 완료 확인 버튼을 눌렀을 때
router.post('/complete/:id', authRequired, async (req, res) => {
  const userId = req.user.uid  // 사용자 인증 필요
  const tripId = req.params.id

  try {
    const trip = await approvalTrip.findById(tripId)
    if (!trip) return res.status(404).json({ error: 'Trip not found' })

    // 해당 사용자의 승인 요청만 완료 처리 가능
    if (trip.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    trip.status = 'completed'
    await trip.save()
    res.json({ success: true })
  } catch (err) {
    console.error('승인 완료 처리 오류:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

//거부된 여행 삭제(재전송 시 사용)
router.delete('/rejected/:id', authRequired, async (req, res) => {
  try {
    const uid = req.user.uid || req.user.sub || req.user._id;
    const trip = await approvalTrip.findOneAndDelete({
      _id: req.params.id,
      userId: uid,
      status: 'rejected'
    });
    
    if (!trip) {
      return res.status(404).json({ error: true, message: '거부된 여행을 찾을 수 없습니다.' });
    }
    res.json({ error: false, success: true, message: '거부된 여행이 삭제되었습니다.' });
  } catch (error) {
    console.error('거부된 여행 삭제 실패:', error);
    res.status(500).json({ error: true, message: '삭제 실패' });
  }
});
module.exports = router
