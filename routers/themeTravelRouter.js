// routers/themeTravelRouter.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
// 🔧 공공 API 사용 시 필요한 패키지
// const axios = require('axios');

module.exports = (app) => {
  const router = express.Router();

  // 🔧 공공 API 설정 (사용 시 주석 해제)
  // const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY || 'YOUR_API_KEY';
  // const PUBLIC_API_URL = 'http://apis.data.go.kr/B551011/KorService1';

  // 카테고리별 파일 매핑 (현재 JSON 파일 사용)
  const categoryFileMap = {
    '인생샷 감성 여행': 'instaspot.json',
    '반려견과 함께하는 여행': 'petfriendly.json',
    '힐링 자연여행': 'healing.json',
    '바다 감성 여행': 'ocean.json',
    '캠핑 & 차박 여행': 'camping.json',
    '로컬 맛집 탐방 여행': 'foodie.json',
    '섬 여행': 'island.json',
    '감성 숙소 여행': 'accommodation.json',
    '액티브 어드벤처 여행': 'adventure.json',
    '도심 속 감성 여행': 'urban.json'
  };

  // 🔧 공공 API용 카테고리 코드 매핑 (사용 시 주석 해제)
  // const categoryCodeMap = {
  //   '인생샷 감성 여행': 'A01',
  //   '반려견과 함께하는 여행': 'A02',
  //   '힐링 자연여행': 'A01011200',
  //   '바다 감성 여행': 'A01011400',
  //   '캠핑 & 차박 여행': 'A03020900',
  //   '로컬 맛집 탐방 여행': 'A05020900',
  //   '섬 여행': 'A01',
  //   '감성 숙소 여행': 'A02',
  //   '액티브 어드벤처 여행': 'A03',
  //   '도심 속 감성 여행': 'A01'
  // };

  // 🔧 공공 API 호출 함수 (사용 시 주석 해제)
  // const fetchFromPublicAPI = async (category) => {
  //   try {
  //     const categoryCode = categoryCodeMap[category];
  //     if (!categoryCode) {
  //       throw new Error('유효하지 않은 카테고리');
  //     }
  //
  //     const response = await axios.get(PUBLIC_API_URL + '/areaBasedList1', {
  //       params: {
  //         serviceKey: PUBLIC_API_KEY,
  //         numOfRows: 50,
  //         pageNo: 1,
  //         MobileOS: 'ETC',
  //         MobileApp: 'TripStory',
  //         _type: 'json',
  //         listYN: 'Y',
  //         arrange: 'O',
  //         contentTypeId: categoryCode
  //       }
  //     });
  //
  //     const items = response.data.response.body.items.item || [];
  //     return items.map(item => ({
  //       title: item.title,
  //       location: item.addr1 || '정보 없음',
  //       description: item.overview || '상세 정보가 없습니다.',
  //       category: category,
  //       imageUrl: item.firstimage || 'https://via.placeholder.com/400x250/e3f2fd/1976d2?text=Travel',
  //       contact: item.tel || '정보 없음',
  //       website: item.homepage ? item.homepage.replace(/<[^>]*>/g, '') : null,
  //       tags: []
  //     }));
  //   } catch (error) {
  //     console.error('공공 API 호출 오류:', error);
  //     throw error;
  //   }
  // };

  // 카테고리별 조회
  router.get('/category/:category', async (req, res) => {
    try {
      const category = decodeURIComponent(req.params.category);
      
      // 🔧 === 방법 1: 공공 API 사용 (주석 해제) ===
      // const data = await fetchFromPublicAPI(category);
      // return res.json({
      //   success: true,
      //   count: data.length,
      //   data: data,
      //   source: 'public_api'
      // });

      // ✅ === 방법 2: JSON 파일 사용 (현재 사용 중) ===
      const fileName = categoryFileMap[category];

      if (!fileName) {
        return res.status(400).json({
          success: false,
          message: '유효하지 않은 카테고리입니다.'
        });
      }

      const filePath = path.join(__dirname, '../tripstory/src/assets/api/theme', fileName);
      
      
      // 파일 존재 확인
      try {
        await fs.access(filePath);
      } catch {
        console.error('❌ 파일을 찾을 수 없음:', filePath);
        return res.status(404).json({
          success: false,
          message: '해당 카테고리의 데이터 파일을 찾을 수 없습니다.'
        });
      }

      // JSON 파일 읽기
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      res.json({
        success: true,
        count: data.length,
        data: data,
        source: 'json_file'
      });

    } catch (error) {
      console.error('카테고리별 테마여행 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '테마여행 데이터를 불러오는데 실패했습니다.',
        error: error.message
      });
    }
  });

  // 전체 조회
  router.get('/', async (req, res) => {
    try {
      // 🔧 === 방법 1: 공공 API 사용 (주석 해제) ===
      // const allThemeTravels = [];
      // for (const category of Object.keys(categoryCodeMap)) {
      //   try {
      //     const data = await fetchFromPublicAPI(category);
      //     allThemeTravels.push(...data);
      //   } catch (err) {
      //     console.warn(`${category} 카테고리 조회 실패:`, err.message);
      //   }
      // }
      // return res.json({
      //   success: true,
      //   count: allThemeTravels.length,
      //   data: allThemeTravels,
      //   source: 'public_api'
      // });

      // ✅ === 방법 2: JSON 파일 사용 (현재 사용 중) ===
      const allThemeTravels = [];
      
      for (const fileName of Object.values(categoryFileMap)) {
        const filePath = path.join(__dirname, '../tripstory/src/assets/api/theme', fileName);
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(fileContent);
          allThemeTravels.push(...data);
        } catch (err) {
          console.warn(`${fileName} 파일을 읽을 수 없습니다:`, err.message);
        }
      }

      res.json({
        success: true,
        count: allThemeTravels.length,
        data: allThemeTravels,
        source: 'json_file'
      });

    } catch (error) {
      console.error('전체 테마여행 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '테마여행 목록 조회 실패',
        error: error.message
      });
    }
  });

  // 🔧 태그별 조회 (선택사항 - 필요시 주석 해제)
  // router.get('/tag/:tag', async (req, res) => {
  //   try {
  //     const tag = decodeURIComponent(req.params.tag);
  //     const allThemeTravels = [];
  //     
  //     for (const fileName of Object.values(categoryFileMap)) {
  //       const filePath = path.join(__dirname, '../tripstory/src/assets/api/theme', fileName);
  //       try {
  //         const fileContent = await fs.readFile(filePath, 'utf-8');
  //         const data = JSON.parse(fileContent);
  //         const filtered = data.filter(item => 
  //           item.tags && item.tags.includes(tag)
  //         );
  //         allThemeTravels.push(...filtered);
  //       } catch (err) {
  //         console.warn(`${fileName} 파일을 읽을 수 없습니다:`, err.message);
  //       }
  //     }
  //
  //     res.json({
  //       success: true,
  //       count: allThemeTravels.length,
  //       data: allThemeTravels
  //     });
  //   } catch (error) {
  //     console.error('태그별 조회 오류:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: '태그별 조회 실패',
  //       error: error.message
  //     });
  //   }
  // });

  app.use('/api/theme-travel', router);
};
