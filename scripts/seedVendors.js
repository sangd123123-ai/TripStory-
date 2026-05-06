// seed/seedVendors.js — Local Market 시드 (실제 주소/URL, 지역별 치환 시드)
// 실행: node seedVendors.js
require('dotenv').config();
const mongoose = require('mongoose');

// 프로젝트 구조에 맞춰 경로 확인하세요 (예: ./models/Vendor)
const Vendor = require('./models/Vendor');

const MONGO = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/tripstory';

// 간단 로고 플레이스홀더
const img = (w, h) => `https://via.placeholder.com/${w}x${h}?text=Local+Market`;

// 벤더 헬퍼
const v = (name, region, description, products, address, url = '', rating = 4.6) => ({
  name,
  region,               // 모델에서 표준화 훅을 쓴다면 그대로 맡깁니다.
  description,
  logoUrl: img(96, 96),
  rating,
  products,
  contact: { address, url },
  verified: true,
});

// ===== 실제 주소/URL 샘플 =====
// 지역명은 표준 행정명: 서울특별시, 인천광역시, 경기도, 강원도, 충청남도, 충청북도, 전라북도, 전라남도, 경상북도, 울산광역시, 제주특별자치도 …
const vendors = [
  // 서울


  v(
    '가락시장 로컬푸드관',
    '서울특별시',
    '서울 대표 공영도매시장 로컬푸드/농축수산 직거래.',
    [
      { name: '서울 제철 채소 꾸러미', price: 19000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fimgnews.naver.net%2Fimage%2F5663%2F2022%2F07%2F14%2F0000006957_001_20220714175002834.jpg&type=sc960_832', tags: ['농산물','로컬'] },
      { name: '한우 정육(시가)', price: 0, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2F20161006_235%2Fohjh6108_14757247940250M4a6_JPEG%2FIMG_2224.JPG&type=sc960_832', tags: ['축산물'] },
    ],
    '서울특별시 송파구 양재대로 932',
    'https://www.garak.co.kr',
    4.7
  ),

  // 인천·강화
  v(
  '강화 석모도 연미도 도자기 공방',
  '인천광역시',
  '강화군 석모도 지역 도예 공방.',
  [
    { name: '백자 찻잔 세트', price: 35000, imageUrl: '', tags: ['공예'] },
    { name: '로컬 머그컵', price: 18000, imageUrl: '', tags: ['공예'] },
  ],
  '인천광역시 강화군 삼산면 삼산남로 823',
  'https://www.ganghwa.go.kr',
  4.6
),
  v(
    '강화명품(주) — 강화순무',
    '인천광역시',
    '강화 순무 가공·유통. 강화군 대표 특산 브랜드.',
    [
      { name: '강화 순무 김치 1kg', price: 12000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyMzA5MDRfMTA0%2FMDAxNjkzODE0Mjc2OTY3.uKflQhB7A-G1jmJZlG2TsL5esdcptAl7xB8fzQ2oK0wg.90V3aqdVaRa0YpFyI-76BRPhB-gB79DuuWcKMmv3hvwg.PNG.ninenice1%2F%25BC%25F8%25B9%25AB%25B1%25E8%25C4%25A1.png&type=sc960_832', tags: ['가공식품','강화순무'] },
      { name: '강화 유황순무 2kg', price: 18000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2F20161007_250%2F82hanjjang_1475799498581v1NV0_JPEG%2F1475799255541.jpeg&type=sc960_832', tags: ['농산물'] },
    ],
    '인천광역시 강화군 선원면 연동로 212-10',
    'https://www.soonmoo.com',
    4.6
  ),

  // 경기
  v(
    '포천 한우 직판장',
    '경기도',
    '경기 북부 한우 전문 직판.',
    [
      { name: '1+ 등심 500g', price: 38000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyMDAxMTFfMTA5%2FMDAxNTc4NzM4NDI1NDIx.ETARBDJSka641r4fgFYV9wPF5-8OxuSdLNE6RzJkUtcg.kHoPGip-9jW16aYGoJSbsG0IojYdqSK7RtWxmrGiY3Mg.JPEG.damy78%2F74e5131bf1973827557d3fe957b174e7c42f725608374b.jpg&type=sc960_832', tags: ['축산물'] },
      { name: '불고기 500g', price: 17000, imageUrl: 'https://search.pstatic.net/sunny/?src=http%3A%2F%2Fproduct-image.prod-nsmall.com%2Fitemimg%2F9%2F29%2F529%2F29783529_U.jpg&type=sc960_832', tags: ['축산물'] },
    ],
    '경기도 포천시 소흘읍 호국로 456',
    'https://www.gg.go.kr/contents/contents.do?ciIdx=503&menuId=2451', // 경기도 축산물/브랜드 안내 레퍼런스
    4.6
  ),

  // 강원
  v(
    '평창 메미리',
    '강원도',
    '평창 진부면 감자 가공 전문.',
    [
      { name: '수제 감자전병(4개)', price: 9000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyMDA5MTRfNzYg%2FMDAxNjAwMDkyMjU4Mzgz.LN9fcnxk1UIA7t_z-Kd48RjDMR1eC3GwGBjnvqdu-awg.g-9ZFQBtStu233ioD5lWSCj_DqdFm5Z3oOoedkAMtz8g.JPEG.amelblue%2FIMG_3007.JPG&type=sc960_832', tags: ['가공식품','감자'] },
      { name: '감자칩 100g', price: 4500, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyMzExMjVfMjU3%2FMDAxNzAwOTA5NjI3Mjk1.CLK8VsRMPXK0n_vOkGzQCzCmDgOUfl3JA8AATPHbF4Mg.4CUXLSWm9W7giZcCsmx9T5qgpYhTWiLpkREw6nJD5f8g.JPEG.gahee_y%2F%25C6%25F7%25C6%25C4%25C4%25A8%25B8%25AE%25C6%25D0%25C5%25B0%25C2%25A1%252805%2529.jpg&type=sc960_832', tags: ['가공식품'] },
    ],
    '강원도 평창군 진부면 진부중앙로 34-15',
    'https://gwdmall.kr/goods/view?no=103020',
    4.6
  ),

  // 충남
  v(
    '농업회사법인 아이파머스(주)',
    '충청남도',
    '예산 사과 착즙·주스. 지역 6차산업 인증 등재.',
    [
      { name: '예산 사과생즙 ', price: 7000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fshop1.phinf.naver.net%2F20201215_93%2F1607960068856Q4TRr_JPEG%2F9095852560507951_642857509.jpg&type=sc960_832', tags: ['가공식품','사과'] },
      { name: 'ABC 주스 1L', price: 8000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fshop1.phinf.naver.net%2F20240813_211%2F1723512133353L6b0k_JPEG%2F56985002159067102_1071805737.jpg&type=sc960_832', tags: ['가공식품'] },
    ],
    '충청남도 예산군 응봉면 예당로 1430',
    'https://www.ysapple.co.kr',
    4.6
  ),

  // 충북
  v(
    '옥천포도한과',
    '충청북도',
    '옥천 특산 포도 한과/강정.',
    [
      { name: '포도 한과 400g', price: 12000, imageUrl: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fshop-phinf.pstatic.net%2F20250521_65%2F1747835984098FPpwL_PNG%2F12638583219683741_1470270758.png&type=sc960_832', tags: ['가공식품','전통'] },
      { name: '깨강정 300g', price: 9000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyMDEwMzBfOCAg%2FMDAxNjA0MDQ3MTQzMDQ5.uuV-QXrKhJuNobtcBBXjm8qVJdSTZamLcH3EehFgi4Eg.DunqQ5zKRnGGDKIIuiOByJXD0XJoZjEoknDC4wWgGukg.JPEG.lyjdoll%2F20201030_171115.jpg&type=sc960_832', tags: ['가공식품'] },
    ],
    '충청북도 옥천군 이원면 신흥5길 21',
    'https://smartstore.naver.com/okfoodshop', // 입점몰
    4.5
  ),

  // 전북
  v(
    '순창 전통고추장 민속마을',
    '전라북도',
    '장류산업특구 내 전통 고추장·된장·간장 특화.',
    [
      { name: '전통 고추장 1kg', price: 16000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fshop1.phinf.naver.net%2F20200219_245%2F15820805175150rXL6_JPEG%2F19443906039207755_192365952.jpg&type=sc960_832', tags: ['가공식품','전통장'] },
      { name: '재래 된장 1kg', price: 14000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyMTA1MTRfMjEz%2FMDAxNjIwOTUyMjY3NDM3.qUYaCUhu9vEwYENXs6Wx5cXxlhnML4OnqDvD7MRnToIg.PPrA2GcF3O_sNL3D1tR74zgMwMhNmHblgV-ET5XF6Log.PNG.you26534%2Fimage.png&type=sc960_832', tags: ['가공식품'] },
    ],
    '전북특별자치도 순창군 순창읍 민속마을길 5-13',
    'https://www.sunchang.go.kr',
    4.7
  ),

  // 전남
  v(
    '신안녹색영농조합',
    '전라남도',
    '신안 천일염·간수 생산자 협동조합.',
    [
      { name: '신안 천일염 5kg', price: 14000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2F20120910_278%2F4001shinan_1347264684340MmoGt_JPEG%2F%25BD%25C5%25BE%25C8_%25C3%25B5%25C0%25CF%25BF%25B0%25B8%25B8%25B5%25E9%25B1%25E2_1.jpg&type=sc960_832', tags: ['수산가공','천일염'] },
      { name: '천일염 간수 2L', price: 9000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fshop1.phinf.naver.net%2F20200611_155%2F1591841178646CXSO8_JPEG%2F29202721253663645_1812438363.jpg&type=sc960_832', tags: ['가공식품'] },
    ],
    '전라남도 신안군 팔금면 오림진고길 284-5',
    'https://saltfarm.kr',
    4.7
  ),

  // 경북
  v(
  '민속주 안동소주(안동소주·전통음식박물관)',
  '경상북도',
  '안동 전통소주 브랜드(전통식품 계열)·박물관 운영.',
  [
    { name: '안동소주 45도 375ml', price: 19000, imageUrl: 'https://www.andongsoju.com/web/product/small/202509/ee52cd2ed72621572ece47151fd41ec4.jpg', tags: ['전통식품'] },
  ],
  '경상북도 안동시 강남로 71-1',
  'http://www.andongsoju.net/',
  4.7
),
  v(
    '문경오미자 밸리 영농조합법인',
    '경상북도',
    '문경 오미자 원료 음료·청.',
    [
      { name: '오미자 원액 900ml', price: 18000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fshop1.phinf.naver.net%2F20221102_14%2F1667378783202HKuPD_JPEG%2F68514671897044473_768560030.jpg&type=sc960_832', tags: ['가공식품','오미자'] },
      { name: '오미자 스파클링 350ml', price: 2500, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fimgnews.naver.net%2Fimage%2F5002%2F2020%2F05%2F19%2F0001535856_001_20200519143203395.jpg&type=sc960_832', tags: ['가공식품'] },
    ],
    '경상북도 문경시 동로면 여우목로 2265',
    'https://www.omijamall.co.kr',
    4.7
  ),

  // 울산
  v(
    '울산수협 방어진 위판장',
    '울산광역시',
    '지역 수산물 위판·직판.',
    [
      { name: '활어 선도회(시가)', price: 0, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyMjAzMzBfMTIy%2FMDAxNjQ4NTY4NjIyMjk4.5c8s6tj2gQVyYZqPSUfp5Bjfsdbq9r533x1jT7HmaWAg.9bI2u6y6sX6U5YrORBApxdRPWAiqT8tUym12CLXej98g.JPEG.ssarra1234%2FIMG_3291.JPG&type=sc960_832', tags: ['수산'] },
      { name: '손질 수산물(시가)', price: 0, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTA5MTFfMjMg%2FMDAxNzU3NTc2OTQ4ODIw.im3w6981eSbFTtm6XEbdnyj9wMOsB6Z-1xxbvKdyUf0g.EYYeQbI0XexOkFmO5qFN7d-K2zTCsjZVhtskvRu7JCog.GIF%2F20250911_image_001.gif&type=sc960_832_gif', tags: ['수산'] },
    ],
    '울산광역시 동구 성끝길 2',
    'https://www.us-suhyup.co.kr',
    4.5
  ),

  // 제주
  v(
    '제주감귤농협 유통사업단(APC)',
    '제주특별자치도',
    '감귤 산지유통·선별·가공.',
    [
      { name: '제주 감귤 5kg', price: 19000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTAxMTRfMjY1%2FMDAxNzM2ODMyNTA1ODk0.ef0aadSnc51cfatMts1Us0dM8X5ESKUqjjaBBiy2ElUg.baWP2Y5zp5XzSew5q9mIXG8lIJiStYnwN_yL7JLiqTQg.JPEG%2F900%25A3%25DF20241201%25A3%25DF095752.jpg&type=sc960_832', tags: ['농산물','감귤'] },
      { name: '감귤 말랭이 200g', price: 6000, imageUrl: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyMjEyMDdfNzYg%2FMDAxNjcwMzY2MjAyODA0.iqRsbTIJQDF4ZiE4iXS17tY4X5qxmfiloCh0MDqs9Fwg.owELX0CAh8Doj4fyE8sMlYOYFGDyRZ9rZmQpIdgMDKMg.JPEG.sunsun1890%2F20221206%25A3%25DF222443.jpg&type=sc960_832', tags: ['가공식품'] },
    ],
    '제주특별자치도 서귀포시 신중로 28',
    'https://jejudream.org',
    4.7
  )];

// ===== 유효성 검사: 주소 비어있으면 스킵 =====
function isValidVendorAddress(vendor) {
  const addr = vendor?.contact?.address?.trim();
  return !!addr && addr.length >= 6; // 군·구 수준 이상
}

async function main() {
  await mongoose.connect(MONGO);
  console.log('[seed] connected:', MONGO);

  // 1) 유효 데이터 선별
  const valid = vendors.filter(isValidVendorAddress);
  const skipped = vendors.length - valid.length;

  // 2) 지역 리스트 수집 후 기존 데이터 제거
  const regions = [...new Set(valid.map(v => v.region))];
  if (regions.length) {
    const del = await Vendor.deleteMany({ region: { $in: regions } });
    console.log(`[seed] removed ${del.deletedCount} docs in regions: ${regions.join(', ')}`);
  } else {
    console.log('[seed] no valid regions to seed — abort');
    await mongoose.disconnect();
    return;
  }

  // 3) 신규 삽입
  const inserted = await Vendor.insertMany(valid, { ordered: true });
  console.log(`[seed] inserted ${inserted.length} docs`);

  // 4) 지역별 카운트 요약
  const summary = await Vendor.aggregate([
    { $match: { region: { $in: regions } } },
    { $group: { _id: '$region', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log('[seed] summary per region:', summary);

  // 5) 샘플 조회(서울 1개 출력)
  const sample = await Vendor.findOne({ region: '서울특별시' }).lean();
  if (sample) {
    console.log('[seed] sample(서울특별시):', {
      name: sample.name,
      region: sample.region,
      products: sample.products?.map(p => p.name),
      address: sample?.contact?.address,
      url: sample?.contact?.url,
    });
  }

  await mongoose.disconnect();
  console.log('[seed] done. skipped:', skipped);
}

main().catch((e) => {
  console.error('[seed] error', e);
  mongoose.disconnect().finally(() => process.exit(1));
});
