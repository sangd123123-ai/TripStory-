// src/components/weather/WeatherDrawer.jsx
import React, { useEffect, useState } from "react";
import {
  DrawerOverlay,
  DrawerPanel,
  DrawerHeader,
  DrawerSectionTitle,
  PlaceListWrap,
  PlaceItem,
  PlaceThumb,
  PlaceInfo,
  PlaceNameTxt,
  PlaceCatTxt,
  PlaceAddrTxt,
  PlaceDistTxt,
  EmptyMsg,
  CloseBtn,
  DrawerLoading,
} from "./weatherStyles";

import { getThumbForCategory } from "./categoryThumbs";

// 드로어 상단 카테고리 버튼 목록
const CATEGORIES = [
  { code: "FD6", label: "🍔 음식" },
  { code: "CE7", label: "☕ 카페" },
  { code: "AT4", label: "📸 명소" },
];

function PlaceRow({ place }) {
  const handleClick = () => {
    if (place.link) {
      window.open(place.link, "_blank", "noopener,noreferrer");
    }
  };

  const thumbUrl = getThumbForCategory(place.category);

  return (
    <PlaceItem onClick={handleClick} role="button">
      <PlaceThumb
        style={{
          backgroundImage: `url(${thumbUrl})`,
        }}
      />
      <PlaceInfo>
        <PlaceNameTxt>{place.name}</PlaceNameTxt>
        <PlaceCatTxt>{place.category || "장소"}</PlaceCatTxt>
        <PlaceAddrTxt>{place.address}</PlaceAddrTxt>
        <PlaceDistTxt>
          {place.distanceM ? `${place.distanceM}m 거리` : ""}
        </PlaceDistTxt>
      </PlaceInfo>
    </PlaceItem>
  );
}

export default function WeatherDrawer({
  open,
  onClose,
  headerText,
  coords, // { lat, lon }
}) {
  const [category, setCategory] = useState("FD6"); // 기본: 음식
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState([]);

  // coords나 category 바뀔 때마다 장소 새로 fetch
  useEffect(() => {
    async function loadPlaces() {
      if (!coords?.lat || !coords?.lon) return;

      setLoading(true);
      setPlaces([]);

      try {
        // 서버 라우터: /api/places/near?lat=..&lon=..&category=FD6
        const res = await fetch(
          `/api/places/near?lat=${coords.lat}&lon=${coords.lon}&category=${category}`
        );
        const data = await res.json();

        setPlaces(data.places || []);
      } catch (err) {
        console.error("[WeatherDrawer] fetch 실패", err);
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    }

    loadPlaces();
  }, [coords, category]);

  if (!open) return null;

  return (
    <>
      <DrawerOverlay onClick={onClose} />

      <DrawerPanel>
        <DrawerHeader>{headerText}</DrawerHeader>

        {/* 카테고리 선택 버튼 */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setCategory(c.code)}
              style={{
                border: 0,
                borderRadius: "18px",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                background:
                  category === c.code
                    ? "linear-gradient(135deg,#00b4ff 0%,#0072ff 100%)"
                    : "#eef6ff",
                color: category === c.code ? "#fff" : "#333",
                boxShadow:
                  category === c.code
                    ? "0 8px 18px rgba(0,114,255,0.35)"
                    : "inset 0 0 0 1px rgba(0,0,0,0.06)",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 본문 리스트 */}
        {loading ? (
          <DrawerLoading>
            주변 스팟 불러오는 중이에요… 😌{"\n"}
            잠깐만 기다려 주세요.
          </DrawerLoading>
        ) : (
          <>
            <DrawerSectionTitle>
              {category === "FD6"
                ? "근처 음식점 🍔"
                : category === "CE7"
                ? "근처 카페 ☕"
                : "근처 명소 📸"}
            </DrawerSectionTitle>

            {places && places.length > 0 ? (
              <PlaceListWrap>
                {places.map((p) => (
                  <PlaceRow key={p.id || p.name} place={p} />
                ))}
              </PlaceListWrap>
            ) : (
              <EmptyMsg>주변에 해당 카테고리가 아직 없어요 😭</EmptyMsg>
            )}
          </>
        )}

        <CloseBtn onClick={onClose}>닫기</CloseBtn>
      </DrawerPanel>
    </>
  );
}