// ✅ AiTripResult.js (TripStory + NaverMap Direct5 통합 버전)
import React, { useState } from "react";
import {
  TimelineDay,
  DayHeader,
  TripTimelineItem,
  TimeBadge,
  TripImage,
  TripContent,
  ResultContainer,
  CostBox,
  ActionButtons,
  ActionButton
} from "./AiTripResultCss";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { FaCalendarAlt } from "react-icons/fa";
import TripRouteMapNaver from "../root/TripRouteMapNaver"; // ✅ 추가

const getCategoryImage = (category) => {
  const categoryImages = {
    food: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&q=80",
    cafe: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80",
    stay: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&q=80",
    nature: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80",
    mountain: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80",
    beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
    tour: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=400&q=80",
    default: "https://images.unsplash.com/photo-1534294668821-28a3054f4256?w=400&q=80",
  };
  if (!category) return categoryImages.default;
  const lower = category.toLowerCase();
  if (lower === "food" || lower.includes("맛집") || lower.includes("음식") || lower.includes("식당") || lower.includes("분식")) return categoryImages.food;
  if (lower === "stay" || lower.includes("숙박") || lower.includes("호텔") || lower.includes("펜션") || lower.includes("게스트하우스")) return categoryImages.stay;
  if (lower === "tour" || lower.includes("관광") || lower.includes("명소") || lower.includes("여행지")) return categoryImages.tour;
  if (lower.includes("카페") || lower.includes("디저트")) return categoryImages.cafe;
  if (lower.includes("산") || lower.includes("등산") || lower.includes("트레킹")) return categoryImages.mountain;
  if (lower.includes("바다") || lower.includes("해변") || lower.includes("해수욕")) return categoryImages.beach;
  return categoryImages.default;
};

function AiTripResult({ result, onReset }) {
  const [showMap, setShowMap] = useState(false); // ✅ 지도 보기 토글 상태

  const handleDownloadPDF = async () => {
    const el = document.getElementById("trip-result");
    if (!el) return alert("PDF 생성 실패: 요소를 찾을 수 없습니다.");

    const canvas = await html2canvas(el, { scale: 3, useCORS: true });
    const pdf = new jsPDF("p", "mm", "a4");
    const img = canvas.toDataURL("image/png");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, width, height);
    pdf.save(`TripStory_여행일정_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (!result) return <p>추천 결과가 없습니다.</p>;

  return (
    <ResultContainer id="trip-result">
      <h2 style={{ color: "#2563eb", display: "flex", alignItems: "center", gap: 8 }}>
        <FaCalendarAlt /> 추천 여행 코스
      </h2>

      {/* ✅ 지도 토글 */}
      {!showMap && (
        <>
          {result.itinerary?.map((day, i) => (
            <TimelineDay key={i}>
              <DayHeader>🗓️ Day {day.day}</DayHeader>

              {day.schedule.map((item, j) => (
                <TripTimelineItem key={j}>
                  <TimeBadge>{item.time}</TimeBadge>

                  {/* 이미지 */}
                  {item.place.url ? (
                    <a
                      href={item.place.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flexShrink: 0 }}
                    >
                      <TripImage
                        src={item.place.image_url || getCategoryImage(item.place.category)}
                        alt={item.place.name}
                        onError={(e) =>
                          (e.target.src = getCategoryImage(item.place.category))
                        }
                        style={{
                          cursor: "pointer",
                          borderRadius: "10px",
                          transition: "transform 0.25s ease, box-shadow 0.25s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.05)";
                          e.currentTarget.style.boxShadow =
                            "0 6px 15px rgba(0,0,0,0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </a>
                  ) : (
                    <TripImage
                      src={item.place.image_url || getCategoryImage(item.place.category)}
                      alt={item.place.name}
                      onError={(e) =>
                        (e.target.src = getCategoryImage(item.place.category))
                      }
                    />
                  )}

                  {/* 상세 내용 */}
                  <TripContent>
                    <h3>{item.place.name}</h3>
                    <p>
                      <strong>이동 수단:</strong> {item.place.transport || "-"}
                    </p>
                    <p>
                      <strong>예상 비용:</strong> {item.place.estimated_cost || "정보 없음"}
                    </p>
                    <p>
                      <strong>소요 시간:</strong>{" "}
                      {item.place.duration_minutes
                        ? `${item.place.duration_minutes}분`
                        : "-"}
                    </p>
                    <p>
                      <strong>추천 이유:</strong> {item.place.reason || "-"}
                    </p>
                  </TripContent>
                </TripTimelineItem>
              ))}
            </TimelineDay>
          ))}

          {/* ✅ 비용 박스 */}
          {(result.total_cost_person || result.cost_breakdown) && (
            <CostBox>
              <h4>💰 1인 예상 비용: {result.total_cost_person || "약 3~5만원"}</h4>
              {result.cost_breakdown && (
                <ul>
                  {result.cost_breakdown.transport && (
                    <li>🚗 교통: {result.cost_breakdown.transport}</li>
                  )}
                  {result.cost_breakdown.food && (
                    <li>🍜 식비: {result.cost_breakdown.food}</li>
                  )}
                  {result.cost_breakdown.activities && (
                    <li>🎟️ 체험/입장료: {result.cost_breakdown.activities}</li>
                  )}
                  {result.cost_breakdown.accommodation && (
                    <li>🏨 숙박: {result.cost_breakdown.accommodation}</li>
                  )}
                </ul>
              )}
            </CostBox>
          )}

          {/* ✅ 액션 버튼 */}
          <ActionButtons>
            <ActionButton onClick={onReset}>🔄 새로 생성</ActionButton>
            <ActionButton onClick={() => setShowMap(true)}>🗺 지도 보기</ActionButton>
            <ActionButton onClick={handleDownloadPDF}>📄 PDF로 저장</ActionButton>
          </ActionButtons>
        </>
      )}

      {/* ✅ 지도 보기 모드 */}
      {showMap && (
        <TripRouteMapNaver
          result={result}        // ✅ 전체 result 통째로 넘겨
          onClose={() => setShowMap(false)}
        />
      )}
    </ResultContainer>
  );
}

export default AiTripResult;