/**
 * resetIndexesAndSeed.js
 * - tripstory.stampdbs 인덱스 전부 삭제( _id_ 제외 )
 * - userId+regionCode 유니크 인덱스 재생성
 * - 기존 데이터 전체 삭제 후, 강원도 더미 6건 삽입
 * 실행: node resetIndexesAndSeed.js
 */
const path = require('path');
const mongoose = require('mongoose');
const { StampModel } = require(path.join(__dirname, 'models', 'stampSchema'));

// ⚠️ 실제 사용 DB로 맞추세요 (tripstory로 보임)
const MONGO_URI = 'mongodb://localhost:27017/tripstory';

// 강원도 전용 더미
const stampDummyData = [
  { userId: '햄찌', location: '강원도', regionCode: 'GW001', date: '2025-07-12' },
  { userId: '햄찌', location: '강원도', regionCode: 'GW002', date: '2025-07-14' },
  { userId: '햄찌', location: '강원도', regionCode: 'GW003', date: '2025-07-16' },
  { userId: '햄찌', location: '강원도', regionCode: 'GW004', date: '2025-07-18' },
  { userId: '햄찌', location: '강원도', regionCode: 'GW005', date: '2025-07-20' },
  { userId: '햄찌', location: '강원도', regionCode: 'GW006', date: '2025-07-22' },
];

(async () => {
  try {
    console.log('🔌 connecting…', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('✅ connected');

    const col = mongoose.connection.collection('stampdbs');

    // 1) 모든 인덱스 드롭(_id_ 제외)
    const indexes = await col.indexes();
    for (const ix of indexes) {
      if (ix.name !== '_id_') {
        console.log('🧹 drop index:', ix.name, ix.key);
        await col.dropIndex(ix.name);
      }
    }

    // 2) 우리가 원하는 인덱스만 명시적으로 재생성
    //    유니크: userId + regionCode
    await col.createIndex({ userId: 1, regionCode: 1 }, { unique: true, name: 'userId_1_regionCode_1' });
    //    보조 인덱스(옵션): userId + location
    await col.createIndex({ userId: 1, location: 1 }, { name: 'userId_1_location_1_nonunique' });

    // 3) 기존 데이터 전체 삭제
    await StampModel.deleteMany({});
    console.log('🗑️ data cleared');

    // 4) 재삽입
    await StampModel.insertMany(stampDummyData, { ordered: true });
    console.log('🎉 seeded 6 docs');

    const total = await StampModel.countDocuments();
    console.log('📦 total =', total);
  } catch (err) {
    console.error('❌ error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔚 disconnected');
  }
})();
