/**
 * 행사 장소(고양 내일꿈제작소)의 좌표와 거리 계산.
 *
 * 게임 화면과 진단 화면이 같은 기준을 쓰도록 한 곳에서 정의한다.
 * 좌표나 반경을 바꿀 일이 생기면 이 파일만 수정하면 된다.
 */

export const DREAM_WORKSHOP = {
  lat: 37.6370663,
  lon: 126.8357919,
  /** AR 탐색을 허용하는 반경(미터). 이 밖에서는 카메라를 열지 않는다. */
  radiusM: 180,
};

const EARTH_RADIUS_M = 6371000;

/** 주어진 좌표에서 꿈제작소까지의 대권 거리(미터). */
export const distanceMeters = (lat: number, lon: number) => {
  const a =
    Math.sin(((lat - DREAM_WORKSHOP.lat) * Math.PI) / 360) ** 2 +
    Math.cos((DREAM_WORKSHOP.lat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(((lon - DREAM_WORKSHOP.lon) * Math.PI) / 360) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
};

/** 주어진 좌표에서 꿈제작소를 향하는 방위각(도, 0=북). */
export const bearingToVenue = (lat: number, lon: number) => {
  const lat1 = (lat * Math.PI) / 180;
  const lat2 = (DREAM_WORKSHOP.lat * Math.PI) / 180;
  const dLon = ((DREAM_WORKSHOP.lon - lon) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (((Math.atan2(y, x) * 180) / Math.PI) % 360 + 360) % 360;
};
