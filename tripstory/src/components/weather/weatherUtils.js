// src/components/weather/weatherUtils.js

// ✅ 네이버 SDK 로드 (한국어 강제)
export function loadNaverSDKFixed(clientId) {
  return new Promise((resolve, reject) => {
    if (window.naver?.maps) {
      resolve(window.naver.maps);
      return;
    }

    if (!clientId) {
      reject(new Error("NAVER CLIENT ID 누락"));
      return;
    }

    // 혹시 중복 script 있으면 제거
    const prior = document.querySelector("script[data-naver-sdk]");
    if (prior) prior.remove();

    // ❗ 핵심 수정:
    //    ncpKeyId -> ncpClientId 로 변경
    //    language=ko 로 한글 고정
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    s.dataset.naverSdk = "true";
    s.src =
      `https://openapi.map.naver.com/openapi/v3/maps.js?` +
      `ncpKeyId=${clientId}&submodules=geocoder&language=ko`;

    s.onload = () => {
      setTimeout(() => {
        if (window.naver?.maps) {
          resolve(window.naver.maps);
        } else {
          reject(new Error("Naver SDK 로드 후 window.naver.maps 없음"));
        }
      }, 0);
    };

    s.onerror = () => reject(new Error("Naver SDK 로드 실패"));
    document.head.appendChild(s);
  });
}

// ✅ 현재 날씨(OpenWeather)
export async function fetchCurrentWeather({ lat, lon, apiKey }) {
  if (!apiKey) throw new Error("WEATHER_API_KEY 누락");

  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${lat}&lon=${lon}` +
    `&appid=${apiKey}` +
    `&units=metric`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("OpenWeather 응답 에러 status=" + res.status);

  const json = await res.json();
  const temp = json?.main?.temp ?? "-";
  const rain1h = json?.rain?.["1h"] ?? 0;
  const snow1h = json?.snow?.["1h"] ?? 0;
  const rain = (rain1h || 0) + (snow1h || 0);
  const clouds = json?.clouds?.all ?? "-";
  const placeName = json?.name || "현재 위치";

  return { temp, rain, clouds, placeName };
}

// ✅ reverse geocoding (좌표 -> 한글 주소)
// 1순위: 네이버 geocoder (language=ko 강제된 상태)
// 2순위: 카카오 좌표→주소 API (REACT_APP_KAKAO_REST_KEY 필요)
export async function reverseGeocode(lat, lon) {
  const kakaoKey = process.env.REACT_APP_KAKAO_REST_KEY;

  // ⬇ 네이버 시도
  const naverPromise = new Promise((resolve, reject) => {
    if (!window.naver?.maps?.Service) {
      reject(new Error("Geocoder 사용 불가 (Service 없음)"));
      return;
    }

    window.naver.maps.Service.reverseGeocode(
      {
        coords: new window.naver.maps.LatLng(lat, lon),
        orders: "addr,roadaddr",
        lang: "ko",
        encoding: "utf-8",
      },
      (status, response) => {
        if (status !== window.naver.maps.Service.Status.OK || !response) {
          reject(new Error("reverseGeocode 실패 status=" + status));
          return;
        }

        let pretty = "";

        if (
          response.v2 &&
          Array.isArray(response.v2.addresses) &&
          response.v2.addresses.length > 0
        ) {
          const adr = response.v2.addresses[0];
          const siDo = adr.region_1depth_name || "";
          const siGunGu = adr.region_2depth_name || "";
          const town = adr.region_3depth_name || "";

          pretty =
            (adr.roadAddress && adr.roadAddress.trim()) ||
            (adr.jibunAddress && adr.jibunAddress.trim()) ||
            [siDo, siGunGu, town].filter(Boolean).join(" ");
        }

        resolve(pretty || "");
      }
    );
  });

  try {
    const addr = await naverPromise;
    // 한글(가-힣)이 포함돼 있으면 바로 사용
    if (addr && /[가-힣]/.test(addr)) {
      return addr;
    }
    // 아니면 카카오로 폴백 시도
    throw new Error("네이버 주소가 영어만 포함됨");
  } catch {
    // ⬇ 카카오 폴백
    if (!kakaoKey) return "";

    try {
      const kakaoRes = await fetch(
        `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lon}&y=${lat}`,
        {
          headers: {
            Authorization: `KakaoAK ${kakaoKey}`,
          },
        }
      );

      const json = await kakaoRes.json();
      const addrObj = json.documents?.[0]?.address;
      if (addrObj) {
        const full =
          `${addrObj.region_1depth_name} ` +
          `${addrObj.region_2depth_name} ` +
          `${addrObj.region_3depth_name}`;
        return full;
      }
    } catch (err) {
      console.error("카카오 reverseGeocode 실패", err);
    }

    return "";
  }
}