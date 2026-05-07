// scripts/fetchKakaoImages.js
// 카카오 이미지 검색 API로 장소 사진 가져와서 DB 업데이트
// 실행 전: Kakao Developers 콘솔에서 "다음 검색(DAUM_SEARCH)" 서비스 활성화 필요
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Trip = require('../models/tripSchema');

const KAKAO_REST_KEY = process.env.KAKAO_REST_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

if (!KAKAO_REST_KEY) {
  console.error('❌ KAKAO_REST_KEY 환경변수가 없습니다.');
  process.exit(1);
}

async function fetchImageUrl(name, region) {
  try {
    const query = `${region} ${name}`;
    const res = await axios.get('https://dapi.kakao.com/v2/search/image', {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
      params: { query, size: 1, sort: 'accuracy' },
    });
    const doc = res.data?.documents?.[0];
    return doc?.thumbnail_url || doc?.image_url || '';
  } catch (e) {
    if (e.response?.status === 401 || e.response?.status === 403) {
      console.error('❌ 인증 오류 - Kakao 개발자 콘솔에서 "다음 검색(DAUM_SEARCH)" 서비스를 활성화하세요.');
      process.exit(1);
    }
    return '';
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB 연결 성공');

  const places = await Trip.find({ image_url: { $in: ['', null] } }).lean();
  console.log(`🔍 이미지 없는 장소: ${places.length}개`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    const imageUrl = await fetchImageUrl(p.name, p.region);

    if (imageUrl) {
      await Trip.updateOne({ _id: p._id }, { $set: { image_url: imageUrl } });
      updated++;
    } else {
      failed++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`⏳ ${i + 1}/${places.length} 처리 중... (업데이트: ${updated}, 실패: ${failed})`);
    }

    await sleep(120); // 초당 약 8건, Kakao API 제한 여유있게
  }

  console.log(`\n🎉 완료! 업데이트: ${updated}개 / 실패(이미지 없음): ${failed}개`);
  await mongoose.connection.close();
})();
