// ✅ models/tripSchema.js
const mongoose = require('mongoose');

// ✅ 카카오 popularPlaces_kakao.json 구조 기반 스키마
const tripSchema = new mongoose.Schema({
  id: { type: String, required: true },         // 카카오 place id
  name: { type: String, required: true },       // 장소명
  category: { type: String, required: true },   // ex) 음식점 > 분식 > 신포우리만두
  address: { type: String, default: '' },       // 주소
  phone: { type: String, default: '' },         // 전화번호
  url: { type: String, default: '' },           // 카카오 지도 링크
  x: { type: String, default: '' },             // 경도 (longitude)
  y: { type: String, default: '' },             // 위도 (latitude)
  region: { type: String, required: true },     // 지역명 (부산, 여수 등)
  image_url: { type: String, default: '' },
  description: { type: String, required: false }, // 나중에 공공데이터용
  source: { type: String, default: 'Kakao' },   // 데이터 출처
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

console.log('✅ tripSchema 정의 완료');

// ✅ tripdbs 컬렉션 등록
module.exports = mongoose.model('tripdbs', tripSchema);

console.log('✅ tripdbs 모델 등록 완료');
