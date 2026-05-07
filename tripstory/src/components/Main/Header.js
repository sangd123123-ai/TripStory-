import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeaderWrap, Logo, Nav, LoginBtn, RightArea, HamburgerBtn, MobileNav, LogoImg } from "./MainStyled";
import logo from "../../assets/image/Logo.png";
import { AuthContext } from "../../context/AuthContext";
import { AdminContext } from "../../context/AdminContext";
import { Auth } from "../../assets/api/index";
import AdminApi from "../../assets/api/admin";

const Header = () => {
  const navigate = useNavigate();

  const { user, loading: userLoading, reload: userReload } =
    useContext(AuthContext) || {};
  const { admin, loading: adminLoading, reload: adminReload } =
    useContext(AdminContext) || {};

  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // 관리자 판별(상단엔 관리자 메뉴 1개만)
  const isAdmin =
    (user && user.role === "admin") || (admin && admin.role === "admin");

  // ✅ 로그아웃: 관리자/일반 모두 종료 + 하드 리다이렉트
  const onLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    closeMobile();
    try {
      await Promise.allSettled([AdminApi.logout(), Auth.logout()]);
      try { localStorage.removeItem("adminAccess"); } catch {}
      try { localStorage.removeItem("accessToken"); } catch {}
      window.location.replace("/");
    } finally {
      setLoggingOut(false);
    }
  };

  if (userLoading || adminLoading) return null;

  // ✅ 이름/아이디 길이 제한 — 관리자일 때는 admin 컨텍스트 우선
  const displayNameRaw = isAdmin
    ? (admin?.nickname || admin?.name || "관리자")
    : (user?.nickname || user?.name || user?.userId || "사용자");

  // 12자 이상이면 ... 처리
  const displayName =
    displayNameRaw.length > 12
      ? displayNameRaw.slice(0, 9) + "..."
      : displayNameRaw;

  const goTo = (path) => { navigate(path); closeMobile(); };

  return (
    <>
      <HeaderWrap>
        <Logo>
          <LogoImg
            src={logo}
            alt="TripStory"
            onClick={() => { navigate("/"); closeMobile(); }}
          />
        </Logo>

        <Nav>
          <ul>
            <li className="dropdown">
              여행 가이드
              <ul className="dropdown-menu">
                <li onClick={() => navigate("/theme")}>Trip Theme</li>
                <li onClick={() => navigate("/festival")}>Trip Festival</li>
                <li onClick={() => navigate("/site")}>Trip Site</li>
                <li onClick={() => navigate("/weather")}>Trip Map</li>
              </ul>
            </li>
            <li onClick={() => navigate("/aitrip")}>AI 추천 여행</li>
            <li onClick={() => navigate("/tripstory/feed")}>TripStory</li>
            <li onClick={() => navigate("/reviews")}>여행 후기</li>
            <li onClick={() => navigate("/market")}>여행자 혜택관</li>
          </ul>
        </Nav>

        <RightArea>
          {user || admin ? (
            <>
              <span
                style={{
                  marginRight: 8,
                  maxWidth: 120,
                  display: "inline-block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  verticalAlign: "middle",
                }}
                title={displayNameRaw + " 님"}
              >
                {displayName} 님
              </span>
              <LoginBtn onClick={() => navigate("/mypage/main")}>내정보</LoginBtn>
              <LoginBtn onClick={onLogout} disabled={loggingOut}>
                {loggingOut ? "로그아웃 중..." : "로그아웃"}
              </LoginBtn>
            </>
          ) : (
            <LoginBtn onClick={() => navigate("/login")}>로그인</LoginBtn>
          )}
        </RightArea>

        <HamburgerBtn
          className={mobileOpen ? "open" : ""}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          <span />
          <span />
          <span />
        </HamburgerBtn>
      </HeaderWrap>

      <MobileNav $open={mobileOpen}>
        <div className="mobile-nav-item" onClick={() => goTo("/")}>🏠 홈</div>

        <div className="mobile-nav-item" style={{ cursor: "default", opacity: 0.7, fontSize: "0.85rem", paddingBottom: 8 }}>
          📍 여행 가이드
        </div>
        <div className="mobile-nav-sub" onClick={() => goTo("/theme")}>Trip Theme</div>
        <div className="mobile-nav-sub" onClick={() => goTo("/festival")}>Trip Festival</div>
        <div className="mobile-nav-sub" onClick={() => goTo("/site")}>Trip Site</div>
        <div className="mobile-nav-sub" onClick={() => goTo("/weather")}>Trip Map</div>

        <div className="mobile-nav-item" onClick={() => goTo("/aitrip")}>🤖 AI 추천 여행</div>
        <div className="mobile-nav-item" onClick={() => goTo("/tripstory/feed")}>✈️ TripStory</div>
        <div className="mobile-nav-item" onClick={() => goTo("/reviews")}>📝 여행 후기</div>
        <div className="mobile-nav-item" onClick={() => goTo("/market")}>🎁 여행자 혜택관</div>

        <div className="mobile-user-section">
          {user || admin ? (
            <>
              <span className="mobile-username">{displayName} 님</span>
              <div className="mobile-btn-row">
                <LoginBtn onClick={() => goTo("/mypage/main")}>내정보</LoginBtn>
                <LoginBtn onClick={onLogout} disabled={loggingOut}>
                  {loggingOut ? "로그아웃 중..." : "로그아웃"}
                </LoginBtn>
              </div>
            </>
          ) : (
            <LoginBtn onClick={() => goTo("/login")}>로그인</LoginBtn>
          )}
        </div>
      </MobileNav>
    </>
  );
};

export default Header;