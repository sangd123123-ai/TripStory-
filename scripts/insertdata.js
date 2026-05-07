// ✅ importTripData.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const Trip = require('../models/tripSchema');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB 연결 성공'))
.catch((err) => console.error('❌ MongoDB 연결 실패:', err));

const rawData = require('fs').readFileSync(require('path').join(__dirname, '../popularPlaces_kakao.json'), 'utf-8');
const jsonData = JSON.parse(rawData);

const tripData = [];
for (const region in jsonData) {
  for (const category in jsonData[region]) {
    const places = jsonData[region][category];
    places.forEach((p) => {
      tripData.push({
        id:p.id,
        name: p.name,
        region: region,
        category: category,
        address: p.address || '',
        phone: p.phone || '',
        url: p.url || '',
        x: p.x || '',
        y: p.y || '',
      });
    });
  }
}

(async () => {
  try {

    // ✅ 기존 tripdbs 컬렉션 전부 삭제
    // await Trip.deleteMany({});
    console.log('🗑️ 기존 데이터 모두 삭제 완료');
    
    await Trip.insertMany(tripData);
    console.log(`🎉 총 ${tripData.length}개 장소가 DB에 저장되었습니다.`);
  } catch (err) {
    console.error('❌ Insert 실패:', err);
  } finally {
    mongoose.connection.close();
  }
})();
