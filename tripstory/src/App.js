// src/App.js
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import axios from "axios";
import { Auth } from "./assets/api/index";
import Header from "./components/Main/Header";
import Footer from "./components/Main/Footer";
import { GlobalStyle } from "./components/Main/MainStyled";

const API_BASE = process.env.REACT_APP_API_URL || '';

// 페이지 컴포넌트 (lazy load)
const Main           = lazy(() => import("./components/Main/Main"));
const Login          = lazy(() => import("./components/Main/Login"));
const Register       = lazy(() => import("./components/Main/Register"));
const MyPageMain     = lazy(() => import("./components/mypage/MyPageMain"));
const MyTrip         = lazy(() => import("./components/mypage/MyTrip"));
const TravelStamp    = lazy(() => import("./components/mypage/TravelStamp"));
const EditProfile    = lazy(() => import("./components/mypage/EditProfile"));
const FestivalList   = lazy(() => import("./components/Festival/FestivalList"));
const ThemeTravelList    = lazy(() => import("./components/ThemeTravel/ThemeTravelList"));
const TravelReviewList   = lazy(() => import("./components/TravelReview/TravelReviewList"));
const TravelReviewDetail = lazy(() => import("./components/TravelReview/TravelReviewDetail"));
const TravelReviewForm   = lazy(() => import("./components/TravelReview/TravelReviewForm"));
const AITripCourse   = lazy(() => import("./components/aitrips/AiTripCourse"));
const TravelSiteList = lazy(() => import("./components/TravelSite/TravelSiteList"));
const WeatherMap     = lazy(() => import("./components/weather/WeatherMap"));
const TripStoryFeed   = lazy(() => import("./components/tripStory/TripStoryFeed"));
const TripStoryDetail = lazy(() => import("./components/tripStory/TripStoryDetail"));
const TripStorySearch = lazy(() => import("./components/tripStory/TripStorySearch"));
const TripStoryWrite  = lazy(() => import("./components/tripStory/TripStoryWrite"));
const LocalMarket    = lazy(() => import("./components/LocalMarket/LocalMarket"));
const AdminLayout    = lazy(() => import("./admin/AdminLayout"));
const AdminHome      = lazy(() => import("./admin/AdminHome"));
const AdminNotice    = lazy(() => import("./admin/AdminNotice"));
const AdminUsers     = lazy(() => import("./admin/AdminUsers"));
const AdminLogin     = lazy(() => import("./admin/AdminAuth"));
const AdminApproval  = lazy(() => import("./admin/AdminApproval"));

// ──────────────────────────────
// 관리자 refresh fallback (adminAuth 전용 세션 복구용)
async function tryAdminRefreshFallback() {
  try {
    const { AdminAuth } = await import("./admin/AdminApi");
    if (AdminAuth.manualRefresh) {
      await AdminAuth.manualRefresh();
    } else if (AdminAuth.refresh) {
      await AdminAuth.refresh();
    }
  } catch {
    // 실패해도 조용히 무시
  }
}

// ──────────────────────────────
// 로그인 필요한 라우트 (일반 유저 또는 관리자여야 함)
function RequireAuth({ user, admin, children }) {
  const allowed = !!(user || admin);
  return allowed ? children : <Navigate to="/login" replace />;
}

// 관리자 전용 라우트
function ProtectedAdminRoute({ admin, children }) {
  const isAdmin =
    !!(
      admin &&
      (admin.role === "admin" ||
        (Array.isArray(admin?.roles) && admin.roles.includes("admin")))
    );
  return isAdmin ? children : <Navigate to="/" replace />;
}

// ──────────────────────────────
// 메인 앱
function AppShell() {
  const [booting, setBooting] = useState(true);

  // 화면 전역에서 쓰는 현재 로그인 사용자
  // - 일반 유저 로그인 시: 그 유저
  // - 일반 유저는 없는데 관리자만 로그인되어 있으면: 관리자 객체
  const [user, setUser] = useState(null);

  // 관리자 정보 (권한 체크용)
  const [admin, setAdmin] = useState(null);

  // 마이페이지 리프레시 트리거
  const [stampRefetchKey, setStampRefetchKey] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();

  // OAuth 콜백 (?token=...) 처리
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get("token");
    if (!t) return;

    if (Auth.setAccessToken) {
      Auth.setAccessToken(t);
    }

    (async () => {
      try {
        const me = await Auth.me();
        setUser(me);

        // 관리자면 admin에도 같이 심어준다
        if (
          me &&
          (me.role === "admin" ||
            (Array.isArray(me.roles) && me.roles.includes("admin")))
        ) {
          setAdmin(me);
        }


      } catch (err) {
        console.error("❌ OAuth 유저 정보 실패:", err);
      } finally {
        navigate("/", { replace: true });
      }
    })();
  }, [location.search, navigate]);

  // 앱 부팅 시 세션 복구
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1) 일반 유저 세션 복원
        let currentUser = null;
        try {
          currentUser = await Auth.me();
        } catch {
          try {
            // accessToken 만료 시 재발급 로직 (Auth.bootRestore 비슷한 역할)
            if (Auth.bootRestore) {
              await Auth.bootRestore();
            } else if (Auth.refresh) {
              await Auth.refresh();
            }
            currentUser = await Auth.me();
          } catch {
            currentUser = null;
          }
        }

        // 2) 관리자 세션 복원
        let currentAdmin = null;

        // 먼저 currentUser가 이미 admin인지 확인
        if (
          currentUser &&
          (currentUser.role === "admin" ||
            (Array.isArray(currentUser?.roles) &&
              currentUser.roles.includes("admin")))
        ) {
          currentAdmin = currentUser;
        } else {
          // 별도의 admin-auth 세션 있는지 확인
          try {
            const { AdminAuth } = await import("./admin/AdminApi");
            currentAdmin = await AdminAuth.me();
          } catch {
            await tryAdminRefreshFallback();
            try {
              const { AdminAuth } = await import("./admin/AdminApi");
              currentAdmin = await AdminAuth.me();
            } catch {
              currentAdmin = null;
            }
          }
        }

        // 화면용 user 결정
        // - 일반 유저가 있으면 그걸 user로
        // - 아니면 관리자만 있으면 관리자를 user로
        let mergedUser = null;
        if (currentUser) {
          mergedUser = currentUser;
        } else if (currentAdmin) {
          mergedUser = currentAdmin;
        }

        if (!cancelled) {
          setUser(mergedUser);
          setAdmin(currentAdmin);
        }
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 로그아웃 (일반+관리자 둘 다 끊기)
  const handleLogout = async () => {
    try {
      await Promise.allSettled([
        axios.post(`${API_BASE}/auth/logout`, null, { withCredentials: true }),
        axios.post(`${API_BASE}/admin-auth/logout`, null, { withCredentials: true }),
      ]);
    } catch {
      // 무시해도 됨
    }

    if (Auth.setAccessToken) {
      Auth.setAccessToken(null);
    }

    setUser(null);
    setAdmin(null);
    setStampRefetchKey((k) => k + 1);

    navigate("/", { replace: true });
  };

  // 부팅 중이면 임시 로딩 UI
  if (booting) {
    return (
      <>
        <GlobalStyle />
        <Header
          onLogout={handleLogout}
          user={null}
          loading={true}
          reload={() => {}}
        />
        <main style={{ minHeight: "calc(100vh - 140px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", color: "#64748b" }}>
            <div style={{
              width: "40px", height: "40px",
              border: "3px solid #e2e8f0",
              borderTop: "3px solid #0fb9c9",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: "14px" }}>로딩 중...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <GlobalStyle />

      <Header
        onLogout={handleLogout}
        user={user}
        loading={false}
        reload={() => setStampRefetchKey((k) => k + 1)}
      />

      <main style={{ minHeight: "calc(100vh - 140px)" }}>
        <Suspense fallback={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px", gap: "12px", color: "#64748b" }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid #e2e8f0", borderTop: "3px solid #0fb9c9", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: "14px" }}>로딩 중...</span>
          </div>
        }>
        <Routes>
          {/* 홈 */}
          <Route path="/" element={<Main user={user} />} />

          {/* 일반 로그인 / 회원가입 */}
          <Route path="/login" element={<Login onAuthed={setUser} />} />
          <Route path="/join" element={<Register />} />

          {/* 관리자 로그인 */}
          <Route path="/admin/login" element={<AdminLogin onAuthed={setAdmin} />} />

          {/* 🎒 TripStory */}
          <Route
            path="/tripstory/feed"
            element={
              <RequireAuth user={user} admin={admin}>
                <TripStoryFeed user={user || admin} />
              </RequireAuth>
            }
          />
          <Route
            path="/tripstory/search"
            element={
              <RequireAuth user={user} admin={admin}>
                <TripStorySearch user={user || admin} />
              </RequireAuth>
            }
          />
          <Route
            path="/tripstory/write"
            element={
              <RequireAuth user={user} admin={admin}>
                <TripStoryWrite user={user || admin} />
              </RequireAuth>
            }
          />
          <Route
            path="/tripstory/:id"
            element={
              <RequireAuth user={user} admin={admin}>
                <TripStoryDetail user={user || admin} />
              </RequireAuth>
            }
          />

          {/* 여행추천 정보 계열 */}
          <Route path="/theme" element={<ThemeTravelList />} />
          <Route path="/festival" element={<FestivalList />} />
          <Route path="/site" element={<TravelSiteList />} /> {/* ✅ 새로 추가 */}
          <Route path="/market" element={<LocalMarket />} /> {/* ✅ 새로 추가 */}

          <Route path="/weather" element={<WeatherMap />} />

          <Route
            path="/reviews"
            element={
              <RequireAuth user={user} admin={admin}>
                <TravelReviewList user={user}/>
              </RequireAuth>
            }
          />
          <Route
            path="/reviews/:id"
            element={
              <RequireAuth user={user} admin={admin}><TravelReviewDetail user={user} /></RequireAuth>
            }
          />
          <Route
            path="/reviews/write"
            element={
              <RequireAuth user={user} admin={admin}><TravelReviewForm user={user} /></RequireAuth>
            }
          />
          <Route
            path="/reviews/:id/edit"
            element={
              <RequireAuth user={user} admin={admin}>
                <TravelReviewForm  user={user} />
              </RequireAuth>
            }
          />

          {/* 마이페이지 (로그인 필요) */}
          <Route
            path="/mypage/main"
            element={
              <RequireAuth user={user} admin={admin}>
                <MyPageMain user={user} key={stampRefetchKey} />
              </RequireAuth>
            }
          />
          <Route
            path="/mypage/mytrip"
            element={
              <RequireAuth user={user} admin={admin}>
                <MyTrip />
              </RequireAuth>
            }
          />
          <Route
            path="/mypage/stamp"
            element={
              <RequireAuth user={user} admin={admin}>
                <TravelStamp />
              </RequireAuth>
            }
          />
          <Route
            path="/mypage/edit"
            element={
              <RequireAuth user={user} admin={admin}>
                <EditProfile />
              </RequireAuth>
            }
          />

          {/* AI 여행 추천 (로그인 필요) */}
          <Route
            path="/aitrip"
            element={
              <RequireAuth user={user} admin={admin}>
                <AITripCourse />
              </RequireAuth>
            }
          />

          {/* 관리자 전용 대시보드 */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute admin={admin}>
                <AdminLayout onLogout={handleLogout} />
              </ProtectedAdminRoute>
            }
          >
            <Route index element={<AdminHome />} />
            <Route path="notice" element={<AdminNotice />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="approval" element={<AdminApproval onTripUpdate={()=>setStampRefetchKey((k) => k+1)} />} />
            {/* 민아 - 알림 이동 경로 */}
          </Route>

          {/* 잘못된 경로는 홈으로 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>

      <Footer />
    </>
  );
}

export default AppShell;