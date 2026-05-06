// src/components/WeatherMap/weatherStyles.js
import styled from "styled-components";

/* 전체 페이지 래퍼 */
export const PageWrap = styled.div`
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 16px;
`;

/* 지도 카드 */
export const MapShell = styled.div`
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  background: #e9eef3;
  border: 1px solid rgba(0, 0, 0, 0.08);
`;

export const MapInner = styled.div`
  width: 100%;
  height: 500px;
`;

/* 아래 정보 카드 */
export const InfoCard = styled.div`
  margin-top: 24px;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 24px;
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
`;

export const PlaceName = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: #111;
  margin-bottom: 8px;
`;

export const DetailText = styled.div`
  font-size: 13px;
  color: #444;
  margin-bottom: 14px;
  line-height: 1.6;
`;

export const Tag = styled.div`
  font-size: 13px;
  color: #333;
  background: #f9fafc;
  border-radius: 8px;
  padding: 10px 12px;
  margin: 0 auto 8px;
  max-width: 320px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
`;

export const Hint = styled.div`
  font-size: 12px;
  color: #777;
  margin-top: 10px;
  line-height: 1.4;
`;

/* ===== 오른쪽 드로어 ===== */

export const DrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 999;
`;

export const DrawerPanel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  max-width: 90%;
  height: 100vh;
  background: #fff;
  box-shadow: -12px 0 32px rgba(0,0,0,0.2);
  border-radius: 12px 0 0 12px;
  padding: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
`;

export const DrawerHeader = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #111;
  margin-bottom: 16px;
`;

export const DrawerLoading = styled.div`
  flex: 1;
  font-size: 13px;
  color: #555;
  line-height: 1.5;
  white-space: pre-line;
`;

export const DrawerSectionTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #222;
  margin-bottom: 8px;
`;

export const PlaceListWrap = styled.div`
  flex: 1;
  max-height: 60vh;
  overflow-y: auto;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05);
  background: #fafbff;
`;

// weatherStyles.js 예시 일부

export const PlaceItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  cursor: pointer;
  &:hover {
    background: rgba(0,0,0,0.03);
  }
`;

export const PlaceThumb = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-color: #eee;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
`;

export const PlaceInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const PlaceNameTxt = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #111;
`;

export const PlaceCatTxt = styled.div`
  font-size: 12px;
  color: #555;
  line-height: 1.4;
  margin-top: 2px;
`;

export const PlaceAddrTxt = styled.div`
  font-size: 12px;
  color: #777;
  line-height: 1.4;
  margin-top: 4px;
`;

export const PlaceDistTxt = styled.div`
  font-size: 11px;
  color: #999;
  line-height: 1.4;
  margin-top: 4px;
`;

export const EmptyMsg = styled.div`
  font-size: 12px;
  color: #777;
  background: #fafbff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05);
`;

export const CloseBtn = styled.button`
  border: 0;
  background: linear-gradient(135deg, #00b4ff 0%, #0072ff 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  padding: 10px 14px;
  border-radius: 10px;
  margin-top: 16px;
  box-shadow: 0 10px 24px rgba(0,114,255,0.3),
              0 2px 4px rgba(0,0,0,0.08);
  cursor: pointer;
`;
