// src/components/FestivalPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL || '';
import "./FestivalPage.css";

const FestivalPage = () => {
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 백엔드 프록시에서 가공된 축제정보 받아온다고 가정
        // 예: /api/festival?upcoming=true
        const { data } = await axios.get(`${API_BASE}/api/festival`, {
          params: { upcoming: true },
          withCredentials: true,
        });

        // data는 [{id, name, area, place, startDate, endDate, imageUrl, desc}, ...] 형태라고 가정
        if (alive) {
          setFestivals(data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <main className="festival-page">
        <h2 className="festival-title">🎉 전국 축제 추천</h2>
        <p className="festival-loading">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="festival-page">
      <header className="festival-header">
        <h2 className="festival-title">🎉 전국 축제 추천</h2>
        <button className="festival-back" onClick={() => navigate("/")}>
          메인으로
        </button>
      </header>

      <section className="festival-list">
        {festivals.length === 0 && (
          <p className="festival-empty">현재 표시할 축제가 없어요 😢</p>
        )}

        {festivals.map((f) => (
          <article className="festival-card" key={f.id}>
            <div className="festival-thumb">
              <img
                src={f.imageUrl || "https://picsum.photos/400/240"}
                alt={f.name}
              />
              <div className="festival-chip">
                {f.area || "지역 미상"}
              </div>
            </div>

            <div className="festival-info">
              <h3 className="festival-name">{f.name}</h3>
              <p className="festival-desc">{f.desc || "축제 소개가 준비중이에요."}</p>

              <p className="festival-meta">
                📍 {f.place || "장소 미상"}
              </p>
              <p className="festival-meta">
                📅 {f.startDate} ~ {f.endDate}
              </p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
};

export default FestivalPage;