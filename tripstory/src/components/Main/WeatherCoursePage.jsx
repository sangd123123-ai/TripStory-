import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || '';
import "./WeatherCoursePage.css";
import { useNavigate } from "react-router-dom";

const REGION_TO_COORDS = {
  seoul:   { lat: 37.5665, lon: 126.9780, label: "서울" },
  incheon: { lat: 37.4563, lon: 126.7052, label: "인천" },
  busan:   { lat: 35.1796, lon: 129.0756, label: "부산" },
  daegu:   { lat: 35.8714, lon: 128.6014, label: "대구" },
  gwangju: { lat: 35.1595, lon: 126.8526, label: "광주" },
  daejeon: { lat: 36.3504, lon: 127.3845, label: "대전" },
  ulsan:   { lat: 35.5384, lon: 129.3114, label: "울산" },
  jeju:    { lat: 33.4996, lon: 126.5312, label: "제주" },
  gangwon: { lat: 37.8813, lon: 127.7298, label: "강원" },
  jeonbuk: { lat: 35.8242, lon: 127.1480, label: "전북" },
  jeonnam: { lat: 34.8118, lon: 126.3922, label: "전남" },
  gyeongbuk:{lat: 36.5760, lon: 128.5050, label: "경북" },
  gyeongnam:{lat: 35.2370, lon: 128.6920, label: "경남" },
};

const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

export default function WeatherCoursePage({ region = "seoul", limit = 4 }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const coords = useMemo(
    () => REGION_TO_COORDS[region] || REGION_TO_COORDS.seoul,
    [region]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // 1) 서버 데이터 (라우터 그대로 사용)
        const { data } = await axios.get(`${API_BASE}/api/weather-course`, {
          params: { region, limit },
          withCredentials: true,
        });
        if (!alive) return;

        setCourses(Array.isArray(data?.list) ? data.list : []);
        setWeatherInfo(data?.weatherSummary || { sky: "정보 없음", temp: null, msg: "" });

        // 2) temp가 null이면 → 오픈웨더로 “기온만” 보강
        if (
          (data?.weatherSummary?.temp == null) &&
          process.env.REACT_APP_WEATHER_API_KEY
        ) {
          try {
            const ow = await axios.get(OPENWEATHER_URL, {
              params: {
                lat: coords.lat,
                lon: coords.lon,
                units: "metric",
                lang: "kr",
                appid: process.env.REACT_APP_WEATHER_API_KEY,
              },
            });
            if (!alive) return;
            const temp = Math.round(Number(ow.data?.main?.temp) * 10) / 10;
            const sky = ow.data?.weather?.[0]?.description || data?.weatherSummary?.sky || "정보 없음";

            if (Number.isFinite(temp)) {
              setWeatherInfo((prev) => ({
                ...prev,
                temp,
                sky: (prev?.sky && prev.sky !== "정보 없음") ? prev.sky : sky,
                msg: `${(prev?.sky && prev.sky !== "정보 없음") ? prev.sky : sky} / ${temp}℃`,
              }));
            }
          } catch (e) {
            // 폴백 실패는 조용히 무시 (디자인 유지)
          }
        }
      } catch (err) {
        setErrMsg("데이터를 불러오지 못했습니다.");
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [region, limit, coords.lat, coords.lon]);

  if (loading) return <main className="weathercourse-page"><p className="weathercourse-loading">불러오는 중…</p></main>;

  return (
    <main className="weathercourse-page">
      <header className="weathercourse-header">
        <h2 className="weathercourse-title">🌤 날씨 맞춤 여행 코스 추천</h2>
        <button className="weathercourse-back" onClick={() => navigate("/")}>메인으로</button>
      </header>

      {weatherInfo && (
        <section className="weathercourse-nowbox">
          <div className="nowbox-left">
            <div className="nowbox-sky">{weatherInfo.sky || "정보 없음"}</div>
            <div className="nowbox-temp">
              {weatherInfo.temp != null ? `${weatherInfo.temp}°C` : "--°C"}
            </div>
          </div>
          <div className="nowbox-right">
            <p className="nowbox-msg">
              {weatherInfo.msg || "현재 날씨에 맞는 코스를 추천해요"}
            </p>
          </div>
        </section>
      )}

      {!!errMsg && (
        <p className="weathercourse-empty" style={{ gridColumn: "1 / -1" }}>{errMsg}</p>
      )}

      <section className="weathercourse-list">
        {courses.length === 0 && !errMsg && (
          <p className="weathercourse-empty">지금 조건에 맞는 코스가 없습니다 😢</p>
        )}

        {courses.map((c) => (
          <article key={c.id} className="weathercourse-card">
            <a
              className="weathercourse-link"
              href={
                c.link ||
                (c.contentId
                  ? `https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=${c.contentId}`
                  : undefined)
              }
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${c.courseName} 상세 보기`}
            >
              <div className="weathercourse-thumb">
                <img src={c.imageUrl || "https://picsum.photos/600/400"} alt={c.courseName} />
                <div className="weathercourse-badge">
                  {(weatherInfo?.sky || "날씨") + " / " + ((weatherInfo?.temp != null ? weatherInfo.temp : "--") + "°C")}
                </div>
              </div>
              <div className="weathercourse-info">
                <h3 className="weathercourse-name">{c.courseName}</h3>
                <p className="weathercourse-area">📍 {c.areaName || coords.label}</p>
                <p className="weathercourse-desc">{c.comment || "이 코스는 현재 날씨와 잘 맞아요."}</p>
              </div>
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}