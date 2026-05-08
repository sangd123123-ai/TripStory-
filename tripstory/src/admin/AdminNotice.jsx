// src/admin/AdminNotice.jsx — 상단고정 제거 버전 (디자인 그대로 유지)
import React, { useEffect, useMemo, useState } from "react";
import AdminApi from "./AdminApi"; // default export
const api = AdminApi;

function useIsMobile() {
  const [v, setV] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setV(window.innerWidth <= 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return v;
}

// ---- 엔드포인트 래퍼 ----
const listNotices = (params) => api.get("/admin/notices", { params });
const createNotice = (body, cfg) => api.post("/admin/notices", body, cfg);
const patchNotice  = (id, body, cfg) => api.patch(`/admin/notices/${id}`, body, cfg);
const deleteNotice = (id) => api.delete(`/admin/notices/${id}`);

export default function AdminNotice() {
  const isMobile = useIsMobile();

  // 리스트
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / size)),
    [total, size]
  );

  // 폼
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState("");
  const [thumbnailTitle, setThumbnailTitle] = useState(""); // 썸네일용 짧은 제목만 새로 추가
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // 직접 URL 넣는 경우도 지원(파일 없을 때)

  const isEditing = !!editId;

  // 파일 드롭/선택 처리
  const onFilePicked = (f) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(f.type))
      return alert("이미지 파일만 가능해!");
    if (f.size > 5 * 1024 * 1024)
      return alert("이미지는 최대 5MB!");
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  // 초기화
  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setThumbnailTitle("");
    setContent("");
    setFile(null);
    setPreviewUrl("");
    setImageUrl("");
  };

  // 목록 불러오기
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await listNotices({ page, size, q });
      const items = Array.isArray(data?.items)
        ? data.items
        : data?.notices || [];
      setRows(items);
      setTotal(Number(data?.total || items.length) || 0);
    } catch (e) {
      const code = e?.response?.status;
      if (code === 401) alert("세션 만료! 관리자 로그인 다시 해줘.");
      else if (code === 403) alert("관리자 권한 필요!");
      else alert("목록 조회 실패");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [page, q]);

  // 저장
  const onSave = async () => {
    if (!title.trim() || !content.trim())
      return alert("제목/내용을 입력해줘!");

    // —— 서버에 보낼 body 구성 ——
    // 파일 있으면 multipart/form-data
    // 파일 없으면 json 형태
    const hasFile = !!file;
    const body = hasFile
      ? (() => {
          const fd = new FormData();
          fd.append("title", title.trim());
          if (thumbnailTitle.trim()) {
            fd.append("thumbnailTitle", thumbnailTitle.trim());
          }
          fd.append("content", content);
          fd.append("image", file); // multer.single('image')
          return fd;
        })()
      : {
          title: title.trim(),
          content,
          image_url: imageUrl.trim() || undefined,
          thumbnailTitle: thumbnailTitle.trim() || undefined,
        };

    const cfg = hasFile
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined;

    setLoading(true);
    try {
      if (isEditing) {
        await patchNotice(editId, body, cfg);
        alert("수정 완료!");
      } else {
        await createNotice(body, cfg);
        alert("등록 완료!");
        setPage(1);
      }
      resetForm();
      load();
    } catch (e) {
      const code = e?.response?.status;
      if (code === 400)
        alert(
          "요청 형식 확인 (title/content 필수, 파일 5MB 이하)"
        );
      else if (code === 401)
        alert("세션 만료. 다시 로그인해줘!");
      else if (code === 403)
        alert("관리자 권한이 필요해!");
      else alert("저장 실패");
    } finally {
      setLoading(false);
    }
  };

  // 수정 눌렀을 때 기존 값 세팅
  const onEdit = (row) => {
    setEditId(row._id);
    setTitle(row.title || "");
    setThumbnailTitle(row.thumbnailTitle || "");
    setContent(row.content || "");
    setImageUrl(row.image_url || "");
    setFile(null);
    setPreviewUrl(row.image_url || "");
  };

  // 삭제
  const onDelete = async (id) => {
    if (!window.confirm("정말 삭제할까요?")) return;
    setLoading(true);
    try {
      await deleteNotice(id);
      if (rows.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        load();
      }
    } catch {
      alert("삭제 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
        gap: 16,
      }}
    >
      {/* ─────────────────────────
          좌측: 공지 목록 테이블
         ───────────────────────── */}
      <section style={card}>
        <div style={{ ...listHead, flexWrap: "wrap", gap: 8 }}>
          <div>
            <strong>전체 공지</strong>
            <span style={muted}> {total}개</span>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <input
              placeholder="제목 검색"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              style={{ ...input, width: "100%", boxSizing: "border-box" }}
            />
          </div>
        </div>

        <div style={tableWrap}>
          <table
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th style={th}>제목</th>
                <th
                  style={{
                    ...th,
                    width: 180,
                    textAlign: "right",
                  }}
                >
                  액션
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td style={td}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* PIN 배지 삭제됨 */}

                      <span style={{ fontWeight: 600 }}>
                        {r.title}
                      </span>

                      {/* 썸네일용 짧은 제목 보여주기 (있을 때만) */}
                      {r.thumbnailTitle && (
                        <small
                          style={{
                            color: "#7d8ca3",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          ({r.thumbnailTitle})
                        </small>
                      )}

                      <span style={muted}>
                        ·{" "}
                        {new Date(
                          r.createdAt ||
                            r.updatedAt ||
                            Date.now()
                        ).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: "right",
                    }}
                  >
                    <button
                      onClick={() => onEdit(r)}
                      style={btn}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => onDelete(r._id)}
                      style={{ ...btn, ...btnDanger }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}

              {!rows.length && !loading && (
                <tr>
                  <td style={td} colSpan={2}>
                    <div
                      style={{
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      데이터가 없습니다
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={pager}>
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            style={btn}
          >
            이전
          </button>
          <span
            style={{
              minWidth: 72,
              textAlign: "center",
            }}
          >
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            style={btn}
          >
            다음
          </button>
        </div>
      </section>

      {/* ─────────────────────────
          우측: 공지 등록 / 수정 폼
         ───────────────────────── */}
      <section
        style={{
          ...card,
          ...(isMobile ? {} : { position: "sticky", top: 16, alignSelf: "start" }),
          padding: 18,
        }}
      >
        <div
          style={{
            ...listHead,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={pillTitle}>
              {isEditing ? "공지 수정" : "공지 등록"}
            </div>
            {isEditing && (
              <button
                onClick={resetForm}
                style={{ ...btn, ...btnGhostMini }}
              >
                새 글
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {/* 제목 (전체 제목) */}
          <div style={fieldWrap}>
            <label style={label}>제목</label>
            <input
              style={inputLg}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 10월 시스템 점검 안내"
              maxLength={120}
            />
            <div style={hintRow}>
              <small style={hint}>
                메인 카드에도 표시돼요
              </small>
              <small style={counter}>
                {title.length}/120
              </small>
            </div>
          </div>

          {/* 썸네일용 짧은 제목 */}
          <div style={fieldWrap}>
            <label style={label}>
              썸네일용 짧은 제목 (6자 이하)
            </label>
            <input
              style={inputLg}
              value={thumbnailTitle}
              onChange={(e) =>
                setThumbnailTitle(e.target.value)
              }
              placeholder="예) 점검안내"
              maxLength={6}
            />
            <div style={hintRow}>
              <small style={hint}>
                메인 첫 화면 카드가 접혀있을 때
                세로로 보이는 간판 텍스트야
              </small>
              <small style={counter}>
                {thumbnailTitle.length}/6
              </small>
            </div>
          </div>

          {/* 이미지 업로드 / URL */}
          <div style={fieldWrap}>
            <label style={label}>
              대표 이미지{" "}
              <span style={badgeOpt}>선택</span>
            </label>

            <label
              htmlFor="notice-image"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFilePicked(e.dataTransfer.files?.[0]);
              }}
              style={dropzone}
            >
              <div
                style={{
                  textAlign: "center",
                  color: "#6b7a90",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  이미지 끌어다 놓기
                </div>
                <div>
                  또는{" "}
                  <span
                    style={{
                      color: "#1a73e8",
                      fontWeight: 700,
                    }}
                  >
                    파일 선택
                  </span>{" "}
                  클릭
                </div>
              </div>
              <input
                id="notice-image"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  onFilePicked(e.target.files?.[0])
                }
                style={{ display: "none" }}
              />
            </label>
            <small
              style={{
                color: "#8a97ab",
                marginTop: 6,
                display: "block",
              }}
            >
              * 이미지는 최대 5MB, PNG/JPG/WEBP 권장
            </small>

            {previewUrl && (
              <div style={previewCard}>
                <img
                  src={previewUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: 160,
                    objectFit: "cover",
                    borderRadius: 12,
                  }}
                />
                <div style={previewBar}>
                  <span
                    style={{
                      color: "#4a5a73",
                      fontSize: 12,
                    }}
                  >
                    미리보기
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          previewUrl,
                          "_blank"
                        )
                      }
                      style={{
                        ...btn,
                        ...btnGhostMini,
                      }}
                    >
                      새 탭
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl("");
                      }}
                      style={{
                        ...btn,
                        ...btnDangerMini,
                      }}
                    >
                      제거
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 파일 안 쓰고 URL 직접 입력도 가능 */}
            <input
              style={inputLg}
              placeholder="파일 대신 이미지 URL을 직접 입력할 수도 있어요 (예: /uploads/notices/xxx.jpg)"
              value={imageUrl}
              onChange={(e) =>
                setImageUrl(e.target.value)
              }
            />
            <small style={{ color: "#8a97ab" }}>
              파일을 선택하면 URL 입력값은 무시되고
              업로드된 이미지가 저장돼요
            </small>
          </div>

          {/* 내용 */}
          <div style={fieldWrap}>
            <label style={label}>내용</label>
            <textarea
              style={{
                ...inputLg,
                minHeight: 200,
                resize: "vertical",
                lineHeight: 1.5,
              }}
              value={content}
              onChange={(e) =>
                setContent(e.target.value)
              }
              placeholder={`예)
- 10/31(목) 02:00~04:00 시스템 점검
- 점검 동안 로그인/업로드 제한
- 문의: support@tripstory.com`}
              maxLength={5000}
            />
            <div style={hintRow}>
              <small style={hint}>
                마크다운 일부 호환
              </small>
              <small style={counter}>
                {content.length}/5000
              </small>
            </div>
          </div>
        </div>

        <div style={actionBar}>
          <button
            type="button"
            onClick={resetForm}
            style={{ ...btn, ...btnGhostMini }}
          >
            초기화
          </button>
          <button
            type="button"
            onClick={onSave}
            style={cta}
            disabled={loading}
          >
            {loading
              ? "저장 중…"
              : isEditing
              ? "수정 저장"
              : "등록"}
          </button>
        </div>
      </section>
    </div>
  );
}

/* ---- 스타일 (원본 디자인 유지) ---- */
const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 16,
  border: "1px solid #e8eef6",
  boxShadow: "0 8px 22px rgba(31,64,135,.08)",
};
const listHead = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
};
const muted = { color: "#6b7280" };
const input = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e8eef6",
  outline: "none",
};
const tableWrap = {
  border: "1px solid #eef2f7",
  borderRadius: 12,
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
};
const th = {
  padding: ".75rem",
  borderBottom: "1px solid #eef2f7",
  textAlign: "left",
};
const td = {
  padding: ".75rem",
  borderBottom: "1px solid #f3f4f6",
};
const pager = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  justifyContent: "flex-end",
  marginTop: 8,
};
const btn = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e8eef6",
  background: "#fff",
  cursor: "pointer",
};
const btnDanger = {
  border: "1px solid #ffb4b4",
  color: "#c0392b",
};
const label = {
  fontWeight: 800,
  color: "#31455f",
  fontSize: 13,
  marginBottom: 6,
};
const fieldWrap = { display: "grid", gap: 6 };
const hintRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};
const hint = { color: "#8a97ab", fontSize: 12 };
const counter = { color: "#6b7a90", fontSize: 12 };
const inputLg = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e5edf7",
  outline: "none",
  background: "#f9fbff",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)",
};
const pillTitle = {
  padding: "6px 12px",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, #1a73e8 0%, #26d0ce 100%)",
  color: "#fff",
  fontWeight: 900,
  letterSpacing: 0.2,
  boxShadow: "0 6px 14px rgba(31,64,135,.18)",
};
const dropzone = {
  display: "grid",
  placeItems: "center",
  height: 120,
  borderRadius: 14,
  background:
    "linear-gradient(180deg, #f7fbff 0%, #f3f7fc 100%)",
  border: "1px dashed #cfe0f3",
  cursor: "pointer",
};
const previewCard = {
  border: "1px solid #e8eef6",
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 10px 22px rgba(31,64,135,.10)",
};
const previewBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  background: "#f7faff",
  borderTop: "1px solid #e8eef6",
};
const actionBar = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  position: "sticky",
  bottom: -4,
  marginTop: 14,
  paddingTop: 12,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0) 0%, #fff 40%)",
};
const btnGhostMini = {
  border: "1px solid #dfe8f4",
  padding: "6px 10px",
  borderRadius: 10,
  background: "#fff",
  color: "#375783",
  fontWeight: 700,
  cursor: "pointer",
};
const btnDangerMini = {
  border: "1px solid #ffb4b4",
  padding: "6px 10px",
  borderRadius: 10,
  background: "#fff",
  color: "#c0392b",
  fontWeight: 700,
  cursor: "pointer",
};
const cta = {
  padding: "10px 16px",
  borderRadius: 12,
  border: 0,
  fontWeight: 900,
  color: "#fff",
  background:
    "linear-gradient(90deg, #26d0ce 0%, #1a73e8 100%)",
  boxShadow:
    "0 10px 22px rgba(26,115,232,.25)",
};
const badgeOpt = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  background: "#e6f4ff",
  color: "#1a73e8",
  fontWeight: 700,
  fontSize: 12,
  marginLeft: 6,
};