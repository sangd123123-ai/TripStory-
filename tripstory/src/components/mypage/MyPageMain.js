// src/components/mypage/MyPageMain.js (또는 MyPageMain.jsx 경로 기준)
import React, { useEffect, useState } from 'react';
import userService from '../../services/userService';
import MyProfile from './MyProfile';
import TravelStamp from './TravelStamp';
import MyTrip from './MyTrip';
import './MyPage.css';
import api from '../../assets/api/index'; // 공용 axios 인스턴스 (admin 토큰도 sync됨)
import MyCoupons from './MyCoupons';

const MyPageMain = ({ user }) => {
  // ✅ 1) 초기값을 props로 받은 user로 시작한다.
  //    이렇게 하면 관리자 로그인으로 진입했을 때도 최소한 헤더에 쓰인 정보 수준은 바로 출력 가능.
  const [login, setLogin] = useState(user || null);

  // 에러 메시지 관리
  const [error, setError] = useState('');
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 만약 이미 AppShell에서 user 정보를 넘겨줬으면,
      // 그걸 그냥 신뢰하고 추가 호출 안 해도 되지만,
      // 기존 기능을 최대한 유지하기 위해 기존처럼 백엔드도 한 번 불러본다.
      try {
        // 1) 일반 유저용 (/auth/me)
        const me = await userService.getUser(); // 기존 코드 유지
        if (!cancelled) {
          setLogin(me);
          setError('');
        }
      } catch (err1) {
        console.error('[MyPageMain] /auth/me 실패', err1);
        try {
          // 2) 관리자 세션 fallback (/admin-auth/me)
          const res2 = await api.get('/admin-auth/me', { withCredentials: true });

          // 응답 형태 유연 대응
          const adminMe = res2.data?.user || res2.data || null;

          if (!cancelled) {
            if (adminMe) {
              setLogin(adminMe);
              setError('');
            } else if (!user) {
              // props로도 없고 API에서도 못 받으면 에러
              setError('현재 정보를 불러올 수 없습니다.😢');
            }
          }
        } catch (err2) {
          console.error('[MyPageMain] /admin-auth/me 도 실패', err2);
          if (!cancelled) {
            if (!user) {
              // 진짜 아무 정보도 없을 때만 에러 띄우자
              setError('현재 정보를 불러올 수 없습니다.😢');
            }
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // 주의: user가 바뀔 수 있으므로 의존성에 user도 넣어줘.
  }, [user]);

  // ---------- 렌더링 분기 ----------

  // 로그인/프로필 정보 전혀 없고 에러까지 있으면 에러 출력
  if (!login && error) {
    return (
      <div style={{ color: '#fff', padding: '1rem' }}>
        {error}
      </div>
    );
  }

  // 아직 login이 설정 안 됐고 에러도 없으면 로딩
  if (!login && !error) {
    return (
      <div style={{ color: '#fff', padding: '1rem' }}>
        로딩 중...
      </div>
    );
  }

  // 여기까지 왔으면 login은 뭔가 있는 상태야
  return (
    <div className="body">
      <div className="mypage-content-wrapper">
        {/* 내 프로필 카드 */}
        <MyProfile login={login} />

        <div className="right-content-wrapper">
          {/* 스탬프 요약 카드 */}
          <div className="mypage-section-card">
            <TravelStamp
              mode="summary"
              initialStamps={login.stamps}
              refetchKey={refetchKey}
              onStampUdate={() => setRefetchKey((k) => k + 1)}
            />
          </div>

          {/* 여행 요약 카드 */}
          <div className="mypage-section-card">
            <MyTrip
              mode="summary"
              onTripUpdate={() => setRefetchKey((prev) => prev + 1)}
            />
          </div>

          {/* [추가] 내 쿠폰함 카드 */}
          <div className="mypage-section-card">
            <MyCoupons />
          </div>

        </div>
      </div>
    </div>
  );
};

export default MyPageMain;
