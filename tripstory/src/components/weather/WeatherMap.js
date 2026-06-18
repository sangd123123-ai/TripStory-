// src/components/weather/WeatherMap.js
import React, { useEffect, useRef, useState } from "react";
import {
  PageWrap,
  MapShell,
  MapInner,
  InfoCard,
  PlaceName,
  DetailText,
  Tag,
  Hint,
} from "./weatherStyles";

import WeatherDrawer from "./WeatherDrawer";
import {
  loadNaverSDKFixed,
  fetchCurrentWeather,
  reverseGeocode,
} from "./weatherUtils";

const NAVER_CLIENT_ID = process.env.REACT_APP_NAVER_CLIENT_ID;
const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_API_KEY;

export default function WeatherMap() {
  const mapRef = useRef(null);       // div ref
  const mapObjRef = useRef(null);    // naver.maps.Map
  const markerRef = useRef(null);    // naver.maps.Marker
  const infoRef = useRef(null);      // naver.maps.InfoWindow

  // 사용자가 마지막으로 찍은 좌표
  const [position, setPosition] = useState({
    lat: 37.5665,
    lon: 126.9780,
  });

  // 날씨 정보 { temp, rain, clouds, placeName }
  const [weather, setWeather] = useState(null);

  // 한글 주소 (우리가 화면에 보여줄 메인 주소)
  const [addressKo, setAddressKo] = useState("");

  // 오른쪽 추천 드로어 상태
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 드로어가 참고할 좌표 (클릭한 지점)
  const [clickedPos, setClickedPos] = useState(null);

  // 네이버 SDK 준비 여부
  const [naverReady, setNaverReady] = useState(false);

  // 1) 네이버 SDK 로드
  useEffect(() => {
    loadNaverSDKFixed(NAVER_CLIENT_ID)
      .then(() => setNaverReady(true))
      .catch((err) => console.error("[SDK load error]", err));
  }, []);

  // 2) 지도 초기화
  useEffect(() => {
    if (!naverReady || !mapRef.current || !window.naver?.maps) return;
    const { maps } = window.naver;

    // 지도 생성
    const map = new maps.Map(mapRef.current, {
      center: new maps.LatLng(position.lat, position.lon),
      zoom: 10,
    });
    mapObjRef.current = map;

    // 초기 한번: 현재 좌표 기준으로 날씨+주소 세팅
    updateWeatherAndAddress(position.lat, position.lon);

    // 지도 클릭 시: 좌표 갱신 + 날씨/주소 갱신 + 드로어 열기
    maps.Event.addListener(map, "click", async (e) => {
      if (!e.coord) return;
      const nextLat = e.coord.y;
      const nextLon = e.coord.x;

      setPosition({ lat: nextLat, lon: nextLon });
      setClickedPos({ lat: nextLat, lon: nextLon });

      await updateWeatherAndAddress(nextLat, nextLon);

      setDrawerOpen(true);
    });
  // 지도 객체는 SDK 준비 직후 한 번만 만들고, 이후 좌표 변경은 별도 effect에서 처리한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naverReady]);

  // 3) position 바뀌면 지도 센터 이동
  useEffect(() => {
    if (!mapObjRef.current || !window.naver?.maps) return;
    const { maps } = window.naver;
    mapObjRef.current.setCenter(
      new maps.LatLng(position.lat, position.lon)
    );
  }, [position.lat, position.lon]);

  // 4) 좌표 기준으로 날씨/주소 갱신 + 마커/인포윈도우 갱신
  async function updateWeatherAndAddress(lat, lon) {
    const [w, addrFromReverse] = await Promise.all([
      fetchCurrentWeather({ lat, lon, apiKey: WEATHER_API_KEY }).catch(
        (err) => {
          console.error("[fetchCurrentWeather 실패]", err);
          return null;
        }
      ),
      reverseGeocode(lat, lon).catch((err) => {
        console.error("[reverseGeocode 실패]", err);
        return "";
      }),
    ]);

    if (w) setWeather(w);
    setAddressKo(addrFromReverse || "");

    // 지도 위 마커/말풍선
    if (mapObjRef.current && window.naver?.maps) {
      const { maps } = window.naver;
      const latLng = new maps.LatLng(lat, lon);

      if (!markerRef.current) {
        markerRef.current = new maps.Marker({
          position: latLng,
          map: mapObjRef.current,
        });
      } else {
        markerRef.current.setPosition(latLng);
      }

      // 인포윈도우에 찍을 라벨은 아래 safeKoreanLabel 로직과 거의 동일하게 만든다
      const placeLabel = safeKoreanLabel(
        addrFromReverse,
        w?.placeName
      );

      const html = `
        <div style="padding:8px 12px;font-size:13px;line-height:1.5;">
          <strong>${placeLabel} 날씨</strong><br/>
          🌡 ${w ? w.temp : "-"}℃ · 🌧 ${w ? w.rain : 0}mm · ☁️ ${
        w ? w.clouds : "-"
      }%
        </div>
      `;

      if (!infoRef.current) {
        infoRef.current = new maps.InfoWindow({
          content: html,
          disableAnchor: false,
          borderColor: "#1976d2",
          borderWidth: 2,
          backgroundColor: "#fff",
        });
      } else {
        infoRef.current.setContent(html);
      }
      infoRef.current.open(mapObjRef.current, markerRef.current);
    }
  }

  // 영어 로마자 주소 막기 위한 필터
  function safeKoreanLabel(addrKoMaybe, weatherPlaceName) {
    const cleanAddr = addrKoMaybe && addrKoMaybe.trim();
    if (cleanAddr) {
      // reverseGeocode가 한글 행정구역으로 만들어준 문자열
      return cleanAddr;
    }

    const alt = weatherPlaceName && weatherPlaceName.trim();
    if (alt) {
      // alt 가 완전 영문/숫자/하이픈만으로 구성돼 있으면 버려
      const looksEnglish = /^[A-Za-z0-9 .'-]+$/.test(alt);
      if (!looksEnglish) {
        return alt; // alt 안에 한글이나 혼합이 있으면 그냥 써
      }
    }

    return "선택된 위치";
  }

  // 카드/드로어 헤더 등에 쓸 화면용 라벨
  const displayLabel = safeKoreanLabel(addressKo, weather?.placeName);

  // 아래 3개는 그냥 사용자한테 보여주는 코멘트
  function getWeatherComment(temp, rain, clouds) {
    const t = Number(temp);
    const r = Number(rain);
    const c = Number(clouds);

    if (!Number.isNaN(r) && r > 0) {
      return "비(또는 눈)가 조금 와요. 실내 활동이 좋아요 ☔";
    }
    if (!Number.isNaN(t) && t >= 26) {
      return "꽤 덥네요. 시원한 실내 위주로 추천할 날 🧊";
    }
    if (!Number.isNaN(t) && t <= 5) {
      return "꽤 추워요. 따뜻하게 입고 따끈한 곳 찾자 🧣";
    }
    if (!Number.isNaN(c) && c <= 20) {
      return "하늘 맑음 ☀️ 사진 찍기 최고!";
    }
    if (!Number.isNaN(c) && c >= 70) {
      return "하늘이 흐려요. 실내+근거리 위주로 다니자 ☁";
    }
    return "날씨 무난~ 산책도 좋고 근처 구경도 좋아요 🙂";
  }

  function getPhotoTip(clouds) {
    const c = Number(clouds);
    if (Number.isNaN(c)) return "";
    if (c <= 20) return "파란 하늘이라 인생샷 찬스! 📸";
    if (c <= 60) return "은은한 구름 덕분에 사진 톤이 부드러워요 ☁";
    return "흐린 톤이라 감성샷 분위기 제대로 나와요 🌫";
  }

  function getTransportHint(label) {
    if (!label) return "";
    if (label.includes("제주")) {
      return "제주는 차 이동이 편해요. 렌트카 체크 ✨";
    }
    if (label.includes("강릉") || label.includes("속초")) {
      return "동해안은 걸어서/택시로 충분히 즐길 수 있어요 🚕";
    }
    return "보통 2km 안에 볼 곳이 모여있어요. 천천히 걸어도 괜찮아요 🚶";
  }

  const weatherSummaryText = weather
    ? getWeatherComment(weather.temp, weather.rain, weather.clouds)
    : "";
  const photoTipText = weather ? getPhotoTip(weather.clouds) : "";
  const transportHintText = getTransportHint(displayLabel);

  return (
    <>
      {/* 지도 + 현재 선택지역 카드 */}
      <PageWrap>
        <MapShell>
          <MapInner ref={mapRef} />
        </MapShell>

        <InfoCard>
          <PlaceName>{displayLabel}</PlaceName>

          {weather && (
            <>
              <DetailText>
                위도 {position.lat.toFixed(5)}, 경도 {position.lon.toFixed(5)}
                <br />
                🌡 {weather.temp}℃ · 🌧 {weather.rain}mm · ☁️ {weather.clouds}%
              </DetailText>

              {weatherSummaryText && <Tag>{weatherSummaryText}</Tag>}
              {photoTipText && <Tag>{photoTipText}</Tag>}
              {transportHintText && <Tag>{transportHintText}</Tag>}

              <Hint>
                지도를 클릭하면 이 지역 근처 스팟을 오른쪽에서 볼 수 있어요 🙌
              </Hint>
            </>
          )}
        </InfoCard>
      </PageWrap>

      {/* 오른쪽 드로어 */}
      <WeatherDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        coords={clickedPos} // { lat, lon }
        headerText={`${displayLabel} 근처 스팟`}
      />
    </>
  );
}
