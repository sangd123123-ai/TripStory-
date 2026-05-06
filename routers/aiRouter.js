// ==============================
// 🧭 aiRouter.js - AI 여행 코스 추천 (RAG 기반)
// ==============================

require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const mongoose = require('mongoose');
const Trip = require('../models/tripSchema');
const router = express.Router();

// ==============================
// 🎯 AI 여행 코스 추천 API
// ==============================
router.post('/trip', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'AI 서비스가 설정되지 않았습니다.' });
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let { region, style, duration, people, budget, transport } = req.body;
  console.log('📦 req.body:', req.body);

  try {
    // ✅ 1️⃣ 지역명 정규화 (예: "부산시" → "부산")
    const normalizedRegion = region.replace(/시|도|광역시/g, '').trim();

    // ✅ 2️⃣ MongoDB에서 해당 지역 데이터 조회
    const regionData = await Trip.find({
      region: { $regex: normalizedRegion, $options: 'i' },
    })
      .limit(40)
      .lean();

    console.log(`🗺️ ${normalizedRegion} 지역 데이터 개수:`, regionData.length);

    if (!regionData || regionData.length === 0) {
      return res.status(404).json({ error: `${region} 관련 여행 데이터가 없습니다.` });
    }

    // ✅ 3️⃣ MongoDB 데이터 JSON 정리 (image_url 포함!)
    const context = regionData.map((place) => ({
      name: place.name,
      region: place.region,
      category: place.category || [],
      description: place.description || '',
      address: place.address || '',
      admission_fee: place.admission_fee || '',
      url: place.url || '', // ✅ 카카오 지도 링크
      image_url: place.image_url || '', // ✅ 이미지 URL 추가!
      best_season: place.best_season || [],
      suitable_people: place.suitable_people || [],
      budget_level: place.budget_level || [],
      transport: place.transport || [],
    }));

    // ==============================
    // 🧠 4️⃣ 프롬프트 생성 (RAG 핵심)
    // ==============================
    const userPrompt = `
당신은 한국 여행 큐레이터이며, 반드시 현실적인 여행 일정을 **JSON 형식으로만** 구성해야 합니다.
아래는 "${region}" 지역의 MongoDB에서 불러온 실제 데이터입니다.

${JSON.stringify(context, null, 2)}

💡 사용자 요구 조건:
- 지역: ${region}
- 여행 기간: ${duration || '2박 3일'}
- 여행 스타일: ${style || '일반 여행'}
- 인원수: ${people || '2명'}
- 예산 수준: ${budget || '보통'}
- 이동 수단: ${transport || '대중교통'}

📘 필터링 지침:
1. 여행 스타일(${style})과 **유사한 category**를 가진 장소만 선택하세요.
2. 이동 수단(${transport})으로 접근 가능한 장소만 포함하세요.
3. 예산 수준(${budget})과 맞는 **budget_level** 장소만 포함하세요.
4. 인원수(${people})에 맞는 **suitable_people** 장소만 포함하세요.
5. 하루 일정은 이동 거리와 체류 시간을 고려해 **2~5곳 내외**로 구성하세요.
+    - 근거리(이동시간 30분 이내) 장소는 4~5곳까지 가능.
+    - 원거리(이동시간 1시간 이상) 포함 시 2~3곳만 포함.
+    - 하루 일정의 총 소요시간은 6~10시간 내로 조정하세요.
+    - AI가 장소 간 거리와 체류 시간을 바탕으로 자연스러운 동선을 판단하세요.
6. **반드시 MongoDB에 존재하는 데이터만 사용**해야 합니다.
7. JSON 외의 텍스트는 절대 포함하지 마세요.

📤 출력 스키마 예시:
{
  "region": "부산",
  "duration": "2박 3일",
  "itinerary": [
    {
      "day": 1,
      "schedule": [
        {
          "time": "09:00",
          "place": {
            "name": "광안리해수욕장",
            "category": "해변",
            "description": "부산 대표 해수욕장",
            "transport": "대중교통",
            "duration_minutes": 120,
            "estimated_cost": "약 5,000원",
            "url": "http://place.map.kakao.com/123456789",
            "image_url": "https://t1.daumcdn.net/place/...",
            "reason": "해안가 산책과 휴식"
          }
        }
      ]
    }
  ],
  "total_cost_person": "약 25만원",
  "total_cost_group": "약 50만원",
  "cost_breakdown": {
    "accommodation": "1박 10만원 x 2박 = 20만원",
    "activities": "입장료·체험비 약 3만원",
    "transport": "대중교통 2만원/일 x 3일 = 6만원",
    "food": "1인당 2만원/일 x 3일 = 6만원"
  },
  "summary": "해변과 도심 감성을 함께 즐기는 부산 힐링 여행"
}

⚙️ 추가 요구사항:
- 각 장소의 place 객체에는 **"url"과 "image_url" 필드를 반드시 포함**하세요.
- MongoDB 데이터에 존재하는 url과 image_url을 그대로 사용하세요.
- **비용은 실제 계산이 불가능하므로, 합리적인 추정치로 임의 계산**하여 기입하세요.
- 예시처럼 "약 00원", "약 00만원" 형태로 표현하세요.
- 모든 금액은 현실적인 범위 내에서 구성하세요.
- **순수 JSON 하나만 반환**.
- 불필요한 설명, 문장, 코멘트 금지.
+ - 장소 간 이동시간을 30분~1시간 내로 유지하며, 같은 지역 내 인접 코스를 우선 추천하세요.
+ - 하루 일정의 첫 장소는 오전 9~10시경 시작, 마지막 장소는 오후 6~8시경 종료로 구성하세요.
+ - 여행 기간(${duration})에 따라 총 일정 길이를 자동 조정하세요.
+ - 장소가 부족할 경우 MongoDB 내 인접 지역 데이터를 함께 활용해 일정을 채우세요.



`;

    // ==============================
    // 💬 5️⃣ OpenAI 호출 (JSON 강제)
    // ==============================
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: '너는 한국 여행 큐레이터이며 JSON으로만 응답해야 한다.' },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    // ==============================
    // 🧾 6️⃣ 응답 처리
    // ==============================
    const raw = completion.choices[0].message.content;
    console.log('🧠 Raw AI Response:', raw);

    let planJson;
    try {
      planJson = JSON.parse(raw);
    } catch (err) {
      console.warn('⚠️ JSON Parse 실패 → 복구 시도 중...');
      const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      planJson = match ? JSON.parse(match[0]) : { error: 'AI 응답이 JSON 형식이 아닙니다.' };
    }

    // ✅ 최종 결과 반환
    res.json(planJson);
  } catch (err) {
    console.error('❌ AI 요청 실패:', err);
    res.status(500).json({ error: 'AI 요청 실패. 서버 로그 확인 필요.' });
  }
});

module.exports = router;