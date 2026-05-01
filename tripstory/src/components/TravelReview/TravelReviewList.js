import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { BiCommentDetail } from 'react-icons/bi';
import { IoEyeOutline } from 'react-icons/io5';
import api from '../../assets/api/index';
import './TravelReview.css';

const API_BASE = process.env.REACT_APP_API_URL?.trim() || "";
const PAGE_SIZE_DEFAULT = 9; // 3x3

export default function TravelReviewList() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();

  // --- URL 파라미터 ---
  const hashtag = sp.get("hashtag") || "";
  const typeFilter = (sp.get("type") || "all"); // all | domestic | international
  const pageFromUrl = parseInt(sp.get("page") || "1", 10);
  const sizeFromUrl = parseInt(sp.get("size") || `${PAGE_SIZE_DEFAULT}`, 10);

  // --- 상태 ---
  const [loading, setLoading] = useState(true);
  const [rawItems, setRawItems] = useState([]);
  const [pagedItems, setPagedItems] = useState([]);
  const [error, setError] = useState(null);

  const [meta, setMeta] = useState({
    page: pageFromUrl,
    size: sizeFromUrl,
    total: 0,
    totalPages: 0,
    serverPaging: false,
  });

 const page = pageFromUrl;
 const size = sizeFromUrl;

  // --- 서버 URL 구성 (서버가 지원하면 type/hashtag를 함께 전달) ---
  const buildListUrl = () => {
    const qs = new URLSearchParams();
    if (hashtag) qs.set("hashtag", hashtag);
    if (typeFilter && typeFilter !== "all") qs.set("type", typeFilter);
    qs.set("page", String(page));
    qs.set("size", String(size));
    return `${API_BASE}/api/travel-reviews?${qs.toString()}`;
  };

  // ---------- 공통 정규화 유틸 (서버 응답 통일) ----------
  const normalizeList = (arr) => {
    return (arr || []).map((r) => {
      const viewCount = Number(r.viewCount ?? r.views ?? 0);
      const commentCount = Number(
        r.commentCount ??
        (Array.isArray(r.comments) ? r.comments.length : r.comments ?? 0)
      );
      const likeCount = Number(r.likeCount ?? r.likes ?? 0);
      const liked = Boolean(r.liked);
      const type =
        r.type === '국내' ? 'domestic'
        : r.type === '국외' ? 'international'
        : r.type;

      return {
        ...r,
        viewCount,
        commentCount,
        likeCount,
        liked,
        type,
      };
    });
  };

  // ---------- 클라이언트 필터 (서버 미지원 대비 안전망) ----------
  const applyClientFilters = (list) => {
    let filtered = list;

    // type 필터
    if (typeFilter !== "all") {
      filtered = filtered.filter((it) => it.type === typeFilter);
    }

    // hashtag 필터 (서버가 해시태그 미지원일 수 있으므로 안전망)
    if (hashtag) {
      filtered = filtered.filter((it) => {
        const tags = Array.isArray(it.hashtags) ? it.hashtags : [];
        return tags.includes(hashtag);
      });
    }

    return filtered;
  };

  // ---------- Fetch & Normalize ----------
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(buildListUrl(), { credentials: "include" });
        if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);
        const json = await res.json();

        const base = Array.isArray(json?.data) ? json.data : [];
        const norm = normalizeList(base);

        // 서버가 필터/페이지네이션을 지원해도, 클라에서 한 번 더 필터(안전망)
        const clientFiltered = applyClientFilters(norm);

        // 서버 페이지네이션 메타가 오면 그대로 신뢰(페이지/전체카운트 등)
        if (json?.meta && Number.isFinite(json.meta.total)) {
          setPagedItems(clientFiltered);
          setRawItems(norm); // 참고용 보관
          setMeta({
            page: json.meta.page ?? pageFromUrl,
            size: json.meta.size ?? sizeFromUrl,
            total: json.meta.total ?? clientFiltered.length,
            totalPages:
              json.meta.totalPages ??
              Math.max(1, Math.ceil((json.meta.total ?? clientFiltered.length) / (json.meta.size ?? sizeFromUrl))),
            serverPaging: true,
          });
        } else {
          // 클라이언트 페이지네이션
          const total = clientFiltered.length;
          const totalPages = Math.max(1, Math.ceil(total / sizeFromUrl));
          const cur = Math.min(Math.max(1, pageFromUrl), totalPages);
          const start = (cur - 1) * sizeFromUrl;

          setRawItems(norm); // 원본
          setPagedItems(clientFiltered.slice(start, start + sizeFromUrl));
          setMeta({ page: cur, size: sizeFromUrl, total, totalPages, serverPaging: false });

          // URL 정규화
          const next = new URLSearchParams(sp);
          next.set("page", String(cur));
          next.set("size", String(sizeFromUrl));
          if (hashtag) next.set("hashtag", hashtag); else next.delete("hashtag");
          if (typeFilter) next.set("type", typeFilter); else next.delete("type");
          setSp(next, { replace: true });
        }
      } catch (e) {
        setError(e.message || '목록 조회 실패');
        setRawItems([]);
        setPagedItems([]);
        setMeta({ page: 1, size: sizeFromUrl, total: 0, totalPages: 0, serverPaging: false });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashtag, typeFilter, pageFromUrl, sizeFromUrl]);

  const goPage = (pNext) => {
    const p = Math.min(Math.max(1, pNext), Math.max(1, meta.totalPages));
    const next = new URLSearchParams(sp);
    next.set("page", String(p));
    next.set("size", String(size));
    if (hashtag) next.set("hashtag", hashtag); else next.delete("hashtag");
    if (typeFilter) next.set("type", typeFilter); else next.delete("type");
    setSp(next);

    if (!meta.serverPaging) {
      // 클라이언트 페이징 시에만 슬라이스
      const clientFiltered = applyClientFilters(rawItems);
      const start = (p - 1) * size;
      setPagedItems(clientFiltered.slice(start, start + size));
      setMeta((m) => ({ ...m, page: p }));
    }
  };

  const pageNumbers = useMemo(() => {
    const pages = [];
    const cur = meta.page;
    const total = meta.totalPages;
    const span = 5;
    const start = Math.max(1, cur - Math.floor(span / 2));
    const end = Math.min(total, start + span - 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [meta.page, meta.totalPages]);

  // ---------- Like Toggle (axios api 사용으로 통일) ----------
  const toggleLike = async (id) => {
    const upd = (list, f) => list.map((x) => (x._id === id ? f(x) : x));
    const before = pagedItems.find((x) => x._id === id);
    if (!before) return;

    const optimisticLiked = !before.liked;
    const optimisticLikeCount = Math.max(
      0,
      Number(before.likeCount || 0) + (optimisticLiked ? 1 : -1)
    );

    // Optimistic UI
    setPagedItems((l) => upd(l, (x) => ({ ...x, liked: optimisticLiked, likeCount: optimisticLikeCount })));
    setRawItems((l) => upd(l, (x) => (x._id === id ? { ...x, liked: optimisticLiked, likeCount: optimisticLikeCount } : x)));

    try {
      const { data: js } = await api.post(`/api/travel-reviews/${id}/like`, null, {
        withCredentials: true,
      });

      const svLiked =
        typeof js?.liked === 'boolean'
          ? js.liked
          : (typeof js?.data?.liked === 'boolean' ? js.data.liked : optimisticLiked);

      const svLikeCount = Number(
        js?.likeCount ?? js?.data?.likeCount ?? js?.data?.likes ?? optimisticLikeCount
      );

      setPagedItems((l) => upd(l, (x) => ({ ...x, liked: svLiked, likeCount: svLikeCount })));
      setRawItems((l) => upd(l, (x) => (x._id === id ? { ...x, liked: svLiked, likeCount: svLikeCount } : x)));
    } catch (e) {
      // 실패 시 원복
      setPagedItems((l) => upd(l, (x) => (x._id === id ? before : x)));
      setRawItems((l) => upd(l, (x) => (x._id === id ? before : x)));
      const msg = e?.response?.data?.message || e?.message || '좋아요 실패';
      alert(msg);
    }
  };

  if (loading) return <div className="travel-review-container loading">불러오는 중…</div>;
  if (error) return (
    <div className="travel-review-container empty-state">
      <p>⚠️ {error}</p>
    </div>
  );

  // --- 렌더 ---
  return (
    <div className="travel-review-container">
      {/* 헤더 */}
      <div className="review-header">
        <h2 className="review-title">여행 후기</h2>
        <button className="write-btn" onClick={() => nav("/reviews/write")}>
          + 후기 작성
        </button>
      </div>

      {/* 필터 섹션 */}
      <div className="filter-section">
        {/* 타입 필터 */}
        <div className="filter-buttons" style={{ marginBottom: 10 }}>
          <button
            className={`filter-btn${typeFilter === "all" ? " active" : ""}`}
            onClick={() => {
              const next = new URLSearchParams(sp);
              next.set("page", "1");
              next.set("size", String(size));
              if (hashtag) next.set("hashtag", hashtag); else next.delete("hashtag");
              next.set("type", "all");
              setSp(next);
            }}
          >
            전체
          </button>
          <button
            className={`filter-btn${typeFilter === "domestic" ? " active" : ""}`}
            onClick={() => {
              const next = new URLSearchParams(sp);
              next.set("page", "1");
              next.set("size", String(size));
              if (hashtag) next.set("hashtag", hashtag); else next.delete("hashtag");
              next.set("type", "domestic");
              setSp(next);
            }}
          >
            국내여행
          </button>
          <button
            className={`filter-btn${typeFilter === "international" ? " active" : ""}`}
            onClick={() => {
              const next = new URLSearchParams(sp);
              next.set("page", "1");
              next.set("size", String(size));
              if (hashtag) next.set("hashtag", hashtag); else next.delete("hashtag");
              next.set("type", "international");
              setSp(next);
            }}
          >
            국외여행
          </button>
        </div>

        

        {(hashtag || (typeFilter && typeFilter !== "all")) && (
          <div className="active-filter">
            {typeFilter && typeFilter !== "all" && (
              <span className="filter-tag">
                {typeFilter === "domestic" ? "국내여행" : "국외여행"}
              </span>
            )}
            {hashtag && <span className="filter-tag">#{hashtag}</span>}
            <button
              className="reset-filter"
              onClick={() => {
                const next = new URLSearchParams();
                next.set("page", "1");
                next.set("size", String(size));
                next.set("type", "all");
                setSp(next);
              }}
            >
              필터 리셋
            </button>
          </div>
        )}
      </div>

      {/* 카드 그리드 */}
      {pagedItems.length === 0 ? (
        <div className="empty-state">
          <p>조건에 맞는 후기가 없어요.</p>
          <button className="write-btn-empty" onClick={() => nav("/reviews/write")}>
            지금 바로 첫 후기 쓰기
          </button>
        </div>
      ) : (
        <div className="review-grid">
          {pagedItems.map((r) => (
            <div className="review-card" key={r._id} onClick={() => nav(`/reviews/${r._id}`)}>
              <div className="card-image">
                <img
                  src={r.coverUrl || r.images?.[0] || "https://via.placeholder.com/600x400?text=Review"}
                  alt={r.title}
                  loading="lazy"
                />
                {Array.isArray(r.images) && r.images.length > 1 && (
                  <span className="image-count">{r.images.length}장</span>
                )}
                {r.type && (
                  <span className={`type-badge ${r.type === "domestic" ? "domestic" : "international"}`}>
                    {r.type === "domestic" ? "국내" : "해외"}
                  </span>
                )}
              </div>

              <div className="card-content">
                <h3 className="card-title">{r.title}</h3>
                <p className="card-text">
                  {(r.excerpt || r.content || "").replace(/<[^>]+>/g, "").slice(0, 140)}
                </p>

                <div className="card-hashtags">
                  {(r.hashtags || []).slice(0, 3).map((tag) => (
                    <button
                      key={tag}
                      className="hashtag"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = new URLSearchParams();
                        next.set("hashtag", tag);
                        next.set("page", "1");
                        next.set("size", String(size));
                        next.set("type", typeFilter || "all");
                        setSp(next);
                      }}
                    >
                      #{tag}
                    </button>
                  ))}
                  {Array.isArray(r.hashtags) && r.hashtags.length > 3 && (
                    <span className="hashtag-more">+{r.hashtags.length - 3}</span>
                  )}
                </div>

                <div className="card-footer">
                  <div className="author-info">
                    <span className="author-name">{r.authorName || r.authorNickname || '익명'}</span>
                    <span className="date">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR') : ''}
                    </span>
                  </div>
                  <div className="card-stats">
  <span className={`stat ${r.liked ? 'liked' : ''}`}>
    {r.liked
      ? <AiFillHeart size={18} className="heart-icon" />
      : <AiOutlineHeart size={18} className="heart-icon" />
    } {r.likeCount}
  </span>
                    <span className="stat">
                      <BiCommentDetail size={18} className="icon-comment" /> {r.commentCount}
                    </span>
                    <span className="stat">
                      <IoEyeOutline size={18} className="icon-view" /> {r.viewCount}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {meta.totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-arrow"
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
          >
            ‹
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              className={`pagination-btn${n === page ? " active" : ""}`}
              onClick={() => goPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="pagination-arrow"
            disabled={page >= meta.totalPages}
            onClick={() => goPage(page + 1)}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
