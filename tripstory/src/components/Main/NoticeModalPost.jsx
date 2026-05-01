import React, { useEffect, useState, useContext } from "react";
import "./NoticeModalPost.css";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import AdminBadge from "../common/AdminBadge"; // 경로는 프로젝트 구조에 맞게 유지해

/* ================================
   유틸 / 헬퍼
   ================================ */

// API base (상대경로 대비용)
const API_BASE = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

// 상대경로 이미지를 절대경로로 바꿔주는 보정 함수
const abs = (src) =>
  !src
    ? ""
    : /^https?:\/\//i.test(src)
    ? src
    : `${API_BASE}/${String(src).replace(/^\.?\/*/, "")}`;

// 관리자 여부 판별 (user 객체 안에 role/roles/isAdmin 있는 경우)
const isAdminUser = (u) => {
  if (!u) return false;
  if (u.role && String(u.role).toLowerCase() === "admin") return true;
  if (Array.isArray(u.roles) && u.roles.map(String).includes("admin")) return true;
  return !!u.isAdmin;
};

// 토큰 후보 가져오기 (일반/관리자 전부 커버)
const pickStoredToken = (contextUser) => {
  const c = [
    contextUser?.accessToken,
    contextUser?.token,
    contextUser?.adminAccessToken,
    localStorage.getItem("accessToken"),
    localStorage.getItem("token"),
    localStorage.getItem("adminAccess"),
    sessionStorage.getItem("accessToken"),
    sessionStorage.getItem("token"),
  ].filter(Boolean);

  return c.length ? c[0] : null;
};

// Authorization 헤더 구성
const authHeader = (t) => (t ? { Authorization: `Bearer ${t}` } : {});

// 401 났을 때 accessToken 재발급 시도
async function ensureAccessToken(contextUser) {
  const existing = pickStoredToken(contextUser);
  if (existing) return existing;

  // 일반 유저 refresh
  try {
    const r = await axios.post("/auth/refresh", {}, { withCredentials: true });
    const t = r?.data?.accessToken || r?.data?.token;
    if (t) {
      localStorage.setItem("accessToken", t);
      return t;
    }
  } catch {
    /* ignore */
  }

  // 관리자 refresh
  try {
    const r2 = await axios.post("/admin-auth/refresh", {}, { withCredentials: true });
    const t2 = r2?.data?.accessToken || r2?.data?.token || r2?.data?.adminAccessToken;
    if (t2) {
      localStorage.setItem("accessToken", t2);
      return t2;
    }
  } catch {
    /* ignore */
  }

  return null;
}

// 자동 재시도 래퍼 (401이면 refresh 한 번 더 시도)
async function withAuth(doRequest, contextUser) {
  try {
    return await doRequest(pickStoredToken(contextUser));
  } catch (e) {
    const s = e?.response?.status || e?.status;
    if (s === 401) {
      const nt = await ensureAccessToken(contextUser);
      if (nt) return await doRequest(nt);
    }
    throw e;
  }
}

// 내 로그인 정보 (일반 → 실패하면 관리자)
async function fetchMeEither() {
  try {
    const r = await fetch("/auth/me", { credentials: "include" });
    if (r.ok) {
      const j = await r.json();
      return j?.user ?? j;
    }
  } catch {
    /* ignore */
  }

  try {
    const r2 = await fetch("/admin-auth/me", { credentials: "include" });
    if (r2.ok) {
      const j2 = await r2.json();
      return j2?.user ?? j2;
    }
  } catch {
    /* ignore */
  }

  return null;
}

// 공지 상세 불러오기
async function fetchDetail(id) {
  const r = await fetch(`/notices/${id}`, { credentials: "include" });
  const j = await r.json();
  // 어떤 서버는 { ok:true, notice:{...} } 형태, 어떤 서버는 바로 notice 객체만 줌
  if (j && j.ok && j.notice) {
    return j.notice;
  }
  return j;
}

/* ================================
   컴포넌트
   ================================ */

export default function NoticeModalPost({ openId, onClose }) {
  const { user: contextUser } = useContext(AuthContext) || {};

  const [detail, setDetail] = useState(null);      // 공지 상세
  const [comment, setComment] = useState("");      // 댓글 작성 중 내용
  const [sending, setSending] = useState(false);   // 좋아요/댓글 전송 상태
  const [me, setMe] = useState(null);              // 현재 로그인 유저(일반 or 관리자)
  const [liked, setLiked] = useState(false);       // ❤️ 좋아요 눌렀는지 상태 (버튼 색 토글용)

  /* 로그인 정보 세팅 */
  useEffect(() => {
    let alive = true;

    if (contextUser) {
      // AuthContext에서 이미 로그인 정보가 있으면 그대로 사용
      setMe(contextUser);
    } else {
      // 없으면 /auth/me → 안되면 /admin-auth/me 시도
      (async () => {
        const u = await fetchMeEither();
        if (alive) setMe(u || null);
      })();
    }

    return () => {
      alive = false;
    };
  }, [contextUser]);

  /* 공지 상세 로드 (모달 열릴 때마다) */
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!openId) return;
      try {
        const d = await fetchDetail(openId);
        if (!alive) return;

        // 이미지 경로 보정 + 본문 이미지 src 보정
        const imgFixed = abs(d?.image || d?.image_url || d?.imageUrl || "");
        const safeContent =
          typeof d?.content === "string"
            ? d.content.replace(
                /(<img[^>]+src=["'])([^"']+)(["'][^>]*>)/gi,
                (_, p1, src, p3) => `${p1}${abs(src)}${p3}`
              )
            : d?.content;

        setDetail({
          ...(d || {}),
          image: imgFixed,
          image_url: imgFixed,
          content: safeContent,
        });

        // 서버에서 "내가 이미 좋아요 눌렀는지" 정보를 주면 여기서 liked 초기화 가능
        // 예: d.liked === true 이런 거. 없으면 기본 false
        if (d && typeof d.liked === "boolean") {
          setLiked(d.liked);
        } else {
          setLiked(false);
        }
      } catch (e) {
        console.error("[NoticeModalPost] fetchDetail error:", e);
        if (alive) setDetail(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [openId]);

  /* 모달 자체는 openId 없으면 렌더 안 함 */
  if (!openId) return null;

  // detail 로딩 전/실패여도 모달 껍데기는 떠야 하니까
  const imgSrc = detail?.image || detail?.image_url || "";

  // 좋아요 수 안전 처리 (likes 배열이든 likesCount 숫자든 다 지원)
  const likeCount = detail
    ? Array.isArray(detail.likes)
      ? detail.likes.length
      : typeof detail.likesCount === "number"
      ? detail.likesCount
      : 0
    : 0;

  // 댓글 배열 안전 처리
  const commentList = Array.isArray(detail?.comments)
    ? detail.comments
    : [];

  /* 좋아요 클릭 */
  const onLike = async () => {
    if (!detail?._id) return;
    setSending(true);
    try {
      const r = await withAuth(
        (tok) =>
          axios.post(
            `/notices/${detail._id}/like`,
            {},
            { withCredentials: true, headers: authHeader(tok) }
          ),
        me || contextUser
      );

      // 서버 응답에서 최신 좋아요 수 추출
      const newLikesCount =
        typeof r?.data?.likesCount === "number"
          ? r.data.likesCount
          : (Array.isArray(r?.data?.likes)
              ? r.data.likes.length
              : likeCount);

      // detail.likes를 "길이만 맞는 가짜 배열"로 업데이트 → 화면 숫자 유지
      setDetail((d) => ({
        ...(d || {}),
        likes: Array(newLikesCount).fill(0),
      }));

      // 버튼 스타일 토글
      setLiked((prev) => !prev);
    } catch (e) {
      console.error("[NoticeModalPost] onLike error:", e);
      alert("좋아요는 로그인 후 이용해줘!");
    } finally {
      setSending(false);
    }
  };

  /* 댓글 등록 */
  const onAddComment = async (e) => {
    e.preventDefault();
    const val = comment.trim();
    if (!detail?._id || !val) return;

    setSending(true);
    try {
      const r = await withAuth(
        (tok) =>
          axios.post(
            `/notices/${detail._id}/comments`,
            { content: val },
            { withCredentials: true, headers: authHeader(tok) }
          ),
        me || contextUser
      );

      const newComments = r?.data?.comments;
      setDetail((d) => ({
        ...(d || {}),
        comments: Array.isArray(newComments)
          ? newComments
          : d?.comments || [],
      }));

      setComment("");
    } catch (e2) {
      console.error("[NoticeModalPost] onAddComment error:", e2);
      alert("댓글은 로그인 후 이용해줘!");
    } finally {
      setSending(false);
    }
  };

  // 댓글 작성자가 관리자(운영자)인지 판별
  const isCommentAdmin = (c) => {
    const u = c?.user;
    if (!u) return false;

    // 닉네임 기반 관리자 강제 인식 (GM, GM탁, 관리자OO 등)
    const nickname = u.nickname || u.username || u.name || "";
    if (
      nickname === "GM" ||
      nickname.startsWith("GM") ||
      nickname.startsWith("관리자")
    ) {
      return true;
    }

    // 정식 role/roles/isAdmin
    if (
      (u.role && String(u.role).toLowerCase() === "admin") ||
      (Array.isArray(u.roles) && u.roles.map(String).includes("admin")) ||
      u.isAdmin === true
    ) {
      return true;
    }

    // 댓글 자체에 _isAdmin 플래그
    if (c?._isAdmin) {
      return true;
    }

    // 공지 작성자(author)와 동일 인물
    if (detail?.author) {
      const a = detail.author;
      const auid = (a._id || a.id || a.userId || a.user_id || "").toString();
      const cuid = (u._id || u.id || u.userId || u.user_id || "").toString();
      if (auid && cuid && auid === cuid) {
        return true;
      }
    }

    // 지금 로그인한 me가 admin이고, 그 me가 쓴 댓글이면 admin
    if (me) {
      const meIsAdmin =
        (me.role && String(me.role).toLowerCase() === "admin") ||
        (Array.isArray(me.roles) && me.roles.map(String).includes("admin")) ||
        me.isAdmin === true;

      if (meIsAdmin) {
        const muid = (me._id || me.id || me.userId || me.user_id || "").toString();
        const cuid2 = (u._id || u.id || u.userId || u.user_id || "").toString();
        if (muid && cuid2 && muid === cuid2) {
          return true;
        }
      }
    }

    return false;
  };

  return (
    <div
      className="noticepost__backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="noticepost__panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 파란-민트 그라데 헤더 */}
        <div className="noticepost__header">
          <span>Notice</span>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* 본문 전체 */}
        <div className="noticepost__content">
          {detail ? (
            <>
              {/* 제목 */}
              <h2 className="noticepost__title">
                {detail.title || "제목 없음"}
              </h2>

              {/* 대표 이미지 */}
              {imgSrc && (
                <div className="noticepost__image">
                  <img
                    src={imgSrc}
                    alt={detail.title || "notice"}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/1200x600?text=Notice";
                    }}
                  />
                </div>
              )}

              {/* 본문 내용 (HTML 가능) */}
              <div className="noticepost__body">
                {detail.content ? (
                  <article
                    className="noticepost__body-html"
                    dangerouslySetInnerHTML={{
                      __html: detail.content,
                    }}
                  />
                ) : (
                  <p>내용이 없습니다.</p>
                )}
              </div>

              {/* 좋아요 영역 */}
              <div className="noticepost__like">
                <button
                  onClick={onLike}
                  aria-label="좋아요"
                  disabled={sending}
                  title="좋아요"
                  className={liked ? "liked" : ""}
                >
                  <span role="img" aria-label="thumbs up">
                    👍
                  </span>{" "}
                  좋아요
                </button>

                <span className="noticepost__meta">
                  좋아요: {likeCount} / 댓글: {commentList.length}
                </span>
              </div>

              {/* 댓글 영역 */}
              <div className="noticepost__comments">
                <h4>댓글</h4>

                {/* 댓글 리스트 */}
                <ul>
                  {commentList.map((c, i) => {
                    const displayName =
                      c?.user?.nickname ||
                      c?.user?.username ||
                      "익명";

                    // 이 댓글이 관리자 계정에서 온 건지 판정
                    const forceAdmin = isCommentAdmin(c);

                    return (
                      <li
                        key={c._id || c.id || i}
                        className="comment-item"
                      >
                        <div className="comment-head">
                          <b className="comment-name">
                            {displayName}
                          </b>

                          {/* 관리자 뱃지 (검은 반투명 라벨 + 왕관 or 노란포인트) */}
                          <AdminBadge
                            user={c.user}
                            forceAdmin={forceAdmin}
                          />
                        </div>

                        <div className="comment-body">
                          {c.content}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* 댓글 작성 폼 */}
                <form
                  className="comment-form"
                  onSubmit={onAddComment}
                >
                  <input
                    value={comment}
                    onChange={(e) =>
                      setComment(e.target.value)
                    }
                    placeholder="댓글을 입력해줘"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!comment.trim() || sending}
                  >
                    등록
                  </button>
                </form>
              </div>
            </>
          ) : (
            <p className="noticepost__p">로딩 실패…</p>
          )}
        </div>
      </div>
    </div>
  );
}