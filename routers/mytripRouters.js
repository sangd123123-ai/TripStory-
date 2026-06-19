const express = require('express')
const mongoose = require('mongoose')

require('../models/mytripSchema')
// mytripdbs (table)
const mytrip = mongoose.model('mytripdbs')

// tripstory/src/services/mytripService 에서 조회
//authRequired 재사용 (auth.js에서 export 했으므로)
const { authRequired } = require('./auth')

const router = express.Router()

// 내 여행 목록 (로그인 필요, 내 것만)
router.get('/trip', authRequired, async (req, res) => {
  const trip = await mytrip.find({ userId: req.user.uid }).sort({ date: -1 })
  return res.status(200).send(trip)
})

// 내 여행 등록 (userId 강제)
router.post('/trip', authRequired, async (req, res) => {
  try {
    const payload = { ...req.body, userId: req.user.uid }
    const trip = await mytrip.create(payload)
    return res.status(200).send({ error: false, trip })
  } catch (err) {
    console.error('여행 기록 등록 실패:', err)
    return res.status(500).send({ error: true, message: '여행 기록 등록 실패' })
  }
})

// 내 여행 수정
router.put('/trip/:id', authRequired, async (req, res) => {
  const { id } = req.params
  const trip = await mytrip.findOneAndUpdate(
    { _id: id, userId: req.user.uid },//쿼리 조건
    req.body,//업데이트 할 내용
    { new: true }//업데이트 된 문서 반환
  )
  if (!trip) return res.status(404).send({ error: true, message: 'not found' })
  return res.status(200).send({ error: false, trip })
})

// 내 여행 삭제
router.delete('/trip/:id', authRequired, async (req, res) => {
  const { id } = req.params
  const trip = await mytrip.findOneAndDelete({ _id: id, userId: req.user.uid })
  if (!trip) return res.status(404).send({ error: true, message: 'not found' })
  return res.status(200).send({ error: false, trip })
})

module.exports = router

/*
GET    /mytrip/trip
POST   /mytrip/trip
PUT    /mytrip/trip/:id
DELETE /mytrip/trip/:id */
