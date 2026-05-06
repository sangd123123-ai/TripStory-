// addDummyStamps.js
const mongoose = require('mongoose');
require('dotenv').config();

require('./models/stampSchema');
const Stamp = mongoose.model('stampdbs');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tripstory');
  console.log('✅ DB connected');

  // 📌 더미 유저 아이디 (관리자페이지 리스트 기준)
  const users = [
    'google_1086069739',
    'kakao_4449170631',
    'id8558@gmail.com',
    '123',
    'id2332',
  ];

  // 📌 지역 더미 (원하면 수정 가능)
  const locations = ['서울', '부산', '대전', '광주', '제주'];

  const now = new Date();

  for (const userId of users) {
    const count = Math.floor(Math.random() * 20) + 1; // 유저당 1~20개 랜덤
    const docs = [];
    for (let i = 0; i < count; i++) {
      const loc = locations[Math.floor(Math.random() * locations.length)];
      const date = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      docs.push({ userId, location: loc, date });
    }
    await Stamp.insertMany(docs);
    console.log(`✅ ${userId} → ${count}개 추가됨`);
  }

  console.log('🎉 모든 더미 스탬프 삽입 완료!');
  process.exit();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});