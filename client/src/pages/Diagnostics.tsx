/**
 * 현장 진단 화면 (/diag)
 *
 * 목적: 실제 기기에서 AR에 필요한 세 가지 — 카메라·GPS·나침반 — 가 작동하는지
 * 눈으로 확인하고, 결과를 텍스트로 복사해 전달할 수 있게 한다.
 * 휴대폰에서는 개발자도구를 열 수 없어서, 화면에 직접 값을 띄우는 방식이 필요하다.
 *
 * 게임 진행에는 아무 영향이 없다(카드·세이브를 읽거나 쓰지 않는다).
 * 그래서 프로덕션 빌드에서도 접근할 수 있게 열어 둔다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DREAM_WORKSHOP, bearingToVenue, distanceMeters } from "@/lib/venue";

/** iOS 13+ 는 방향 센서 사용 전에 사용자 제스처 안에서 권한을 요청해야 한다. */
type OrientationPermissionApi = {
  requestPermission?: () => Promise<string>;
};

/** iOS Safari 만 제공하는 진북 기준 방위각. */
type CompassEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

type Status = "idle" | "pending" | "ok" | "fail";

type GeoState = {
  lat: number;
  lon: number;
  accuracyM: number | null;
  altitude: number | null;
  speed: number | null;
  updates: number;
  at: string;
};

type OrientState = {
  /** iOS webkitCompassHeading 값 */
  webkitHeading: number | null;
  webkitAccuracy: number | null;
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  /** true 면 진북 기준. Android 의 deviceorientation 은 보통 false 다. */
  absolute: boolean | null;
  /** 어떤 이벤트에서 값이 왔는지 */
  source: "deviceorientation" | "deviceorientationabsolute" | null;
  events: number;
  absoluteEvents: number;
};

const label: React.CSSProperties = {
  color: "#75afa7",
  fontSize: 11,
  letterSpacing: 0.4,
  textTransform: "uppercase",
};

const value: React.CSSProperties = {
  color: "#f6f2e6",
  fontSize: 15,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  wordBreak: "break-all",
};

const card: React.CSSProperties = {
  background: "#16394733",
  border: "1px solid #2c5a68",
  borderRadius: 10,
  padding: "14px 16px",
  marginBottom: 12,
};

const button: React.CSSProperties = {
  appearance: "none",
  width: "100%",
  padding: "13px 16px",
  marginTop: 10,
  fontSize: 15,
  fontWeight: 700,
  color: "#0d2b33",
  background: "#32e5c1",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0" }}>
      <span style={label}>{k}</span>
      <span style={{ ...value, textAlign: "right" }}>{v}</span>
    </div>
  );
}

function Badge({ status }: { status: Status }) {
  const map: Record<Status, { text: string; bg: string; fg: string }> = {
    idle: { text: "대기", bg: "#2c5a68", fg: "#cfe9e4" },
    pending: { text: "확인 중", bg: "#c9905f", fg: "#2b1a0e" },
    ok: { text: "정상", bg: "#32e5c1", fg: "#0d2b33" },
    fail: { text: "실패", bg: "#e2725b", fg: "#2b0f0a" },
  };
  const s = map[status];
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {s.text}
    </span>
  );
}

export default function Diagnostics() {
  const [cameraStatus, setCameraStatus] = useState<Status>("idle");
  const [cameraInfo, setCameraInfo] = useState<string>("-");
  const [cameraError, setCameraError] = useState<string>("");

  const [geoStatus, setGeoStatus] = useState<Status>("idle");
  const [geo, setGeo] = useState<GeoState | null>(null);
  const [geoError, setGeoError] = useState<string>("");
  const [geoPermission, setGeoPermission] = useState<string>("확인 안 함");

  const [orientStatus, setOrientStatus] = useState<Status>("idle");
  const [orient, setOrient] = useState<OrientState>({
    webkitHeading: null,
    webkitAccuracy: null,
    alpha: null,
    beta: null,
    gamma: null,
    absolute: null,
    source: null,
    events: 0,
    absoluteEvents: 0,
  });
  const [orientError, setOrientError] = useState<string>("");

  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchRef = useRef<number | null>(null);

  // 언마운트 시 카메라와 위치 추적을 정리한다.
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (watchRef.current !== null) navigator.geolocation?.clearWatch(watchRef.current);
    },
    []
  );

  // 위치 권한 상태를 미리 조회한다(지원하는 브라우저만).
  useEffect(() => {
    if (!navigator.permissions?.query) {
      setGeoPermission("Permissions API 미지원");
      return;
    }
    navigator.permissions
      .query({ name: "geolocation" })
      .then(res => setGeoPermission(res.state))
      .catch(() => setGeoPermission("조회 실패"));
  }, []);

  const startCamera = useCallback(async () => {
    setCameraStatus("pending");
    setCameraError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("이 브라우저는 getUserMedia를 지원하지 않습니다");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      const track = stream.getVideoTracks()[0];
      const s = track?.getSettings() ?? {};
      setCameraInfo(
        `${s.width ?? "?"}x${s.height ?? "?"} / facingMode=${s.facingMode ?? "미보고"} / ${track?.label || "라벨 없음"}`
      );
      setCameraStatus("ok");
    } catch (err) {
      setCameraError(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
      setCameraStatus("fail");
    }
  }, []);

  const startGeo = useCallback(() => {
    setGeoStatus("pending");
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("이 브라우저는 Geolocation을 지원하지 않습니다");
      setGeoStatus("fail");
      return;
    }
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        setGeo(prev => ({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: pos.coords.accuracy ?? null,
          altitude: pos.coords.altitude ?? null,
          speed: pos.coords.speed ?? null,
          updates: (prev?.updates ?? 0) + 1,
          at: new Date().toLocaleTimeString("ko-KR"),
        }));
        setGeoStatus("ok");
      },
      err => {
        setGeoError(`code=${err.code} ${err.message}`);
        setGeoStatus("fail");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, []);

  const startOrientation = useCallback(async () => {
    setOrientStatus("pending");
    setOrientError("");
    try {
      const ctor = DeviceOrientationEvent as unknown as OrientationPermissionApi;
      if (typeof ctor.requestPermission === "function") {
        const res = await ctor.requestPermission();
        if (res !== "granted") {
          setOrientError(`권한 거부됨 (${res})`);
          setOrientStatus("fail");
          return;
        }
      }

      const onRelative = (event: DeviceOrientationEvent) => {
        const e = event as CompassEvent;
        setOrient(prev => ({
          ...prev,
          webkitHeading: typeof e.webkitCompassHeading === "number" ? e.webkitCompassHeading : prev.webkitHeading,
          webkitAccuracy: typeof e.webkitCompassAccuracy === "number" ? e.webkitCompassAccuracy : prev.webkitAccuracy,
          alpha: e.alpha,
          beta: e.beta,
          gamma: e.gamma,
          absolute: e.absolute,
          source: prev.source === "deviceorientationabsolute" ? prev.source : "deviceorientation",
          events: prev.events + 1,
        }));
        setOrientStatus("ok");
      };

      // Android Chrome 은 진북 기준 값을 이 이벤트로만 제공한다.
      // 이 이벤트가 들어오는지가 안드로이드 방위 정확도 문제의 해결 가능성을 판단하는 핵심 단서다.
      const onAbsolute = (event: Event) => {
        const e = event as DeviceOrientationEvent;
        setOrient(prev => ({
          ...prev,
          alpha: e.alpha,
          beta: e.beta,
          gamma: e.gamma,
          absolute: true,
          source: "deviceorientationabsolute",
          absoluteEvents: prev.absoluteEvents + 1,
        }));
        setOrientStatus("ok");
      };

      window.addEventListener("deviceorientation", onRelative);
      window.addEventListener("deviceorientationabsolute", onAbsolute);

      // 5초 안에 아무 이벤트도 오지 않으면 센서가 없는 환경으로 본다.
      window.setTimeout(() => {
        setOrient(prev => {
          if (prev.events === 0 && prev.absoluteEvents === 0) {
            setOrientError("5초 동안 방향 이벤트가 오지 않았습니다 (센서 없음 또는 미지원)");
            setOrientStatus("fail");
          }
          return prev;
        });
      }, 5000);
    } catch (err) {
      setOrientError(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
      setOrientStatus("fail");
    }
  }, []);

  const dist = geo ? distanceMeters(geo.lat, geo.lon) : null;
  const inRange = dist !== null && dist <= DREAM_WORKSHOP.radiusM;
  const venueBearing = geo ? bearingToVenue(geo.lat, geo.lon) : null;

  const effectiveHeading = useMemo(() => {
    if (typeof orient.webkitHeading === "number") return orient.webkitHeading;
    if (typeof orient.alpha === "number") return ((360 - orient.alpha) % 360 + 360) % 360;
    return null;
  }, [orient.webkitHeading, orient.alpha]);

  const report = useMemo(() => {
    const lines = [
      "=== YOUTH ECHO 현장 진단 결과 ===",
      `시각: ${new Date().toISOString()}`,
      `주소: ${window.location.href}`,
      `보안 컨텍스트(HTTPS): ${window.isSecureContext ? "예" : "아니오 ← AR 불가"}`,
      `화면: ${window.innerWidth}x${window.innerHeight} / DPR ${window.devicePixelRatio}`,
      `UserAgent: ${navigator.userAgent}`,
      `기기 플랫폼: ${navigator.platform ?? "-"} / 터치포인트 ${navigator.maxTouchPoints ?? "-"}`,
      "",
      `[카메라] ${cameraStatus}`,
      `  정보: ${cameraInfo}`,
      `  오류: ${cameraError || "없음"}`,
      "",
      `[GPS] ${geoStatus}`,
      `  권한 상태: ${geoPermission}`,
      geo
        ? `  좌표: ${geo.lat.toFixed(7)}, ${geo.lon.toFixed(7)}`
        : "  좌표: 미수신",
      geo ? `  정확도: ${geo.accuracyM === null ? "-" : `${Math.round(geo.accuracyM)}m`}` : "",
      geo ? `  갱신 횟수: ${geo.updates} (마지막 ${geo.at})` : "",
      dist !== null ? `  꿈제작소까지 거리: ${Math.round(dist)}m (반경 ${DREAM_WORKSHOP.radiusM}m)` : "",
      dist !== null ? `  반경 안: ${inRange ? "예" : "아니오"}` : "",
      venueBearing !== null ? `  꿈제작소 방위: ${Math.round(venueBearing)}도` : "",
      `  오류: ${geoError || "없음"}`,
      "",
      `[나침반] ${orientStatus}`,
      `  값 출처: ${orient.source ?? "없음"}`,
      `  deviceorientation 이벤트 수: ${orient.events}`,
      `  deviceorientationabsolute 이벤트 수: ${orient.absoluteEvents}`,
      `  absolute 플래그: ${orient.absolute === null ? "-" : orient.absolute ? "true" : "false"}`,
      `  webkitCompassHeading: ${orient.webkitHeading === null ? "없음 (iOS 전용)" : orient.webkitHeading.toFixed(1)}`,
      `  webkitCompassAccuracy: ${orient.webkitAccuracy === null ? "-" : orient.webkitAccuracy}`,
      `  alpha: ${orient.alpha === null ? "-" : orient.alpha.toFixed(1)}`,
      `  beta: ${orient.beta === null ? "-" : orient.beta.toFixed(1)}`,
      `  gamma: ${orient.gamma === null ? "-" : orient.gamma.toFixed(1)}`,
      `  계산된 방위: ${effectiveHeading === null ? "-" : `${effectiveHeading.toFixed(1)}도`}`,
      `  iOS 권한 API 존재: ${typeof (DeviceOrientationEvent as unknown as OrientationPermissionApi).requestPermission === "function" ? "예" : "아니오"}`,
      `  오류: ${orientError || "없음"}`,
    ];
    return lines.filter(l => l !== "").join("\n");
  }, [
    cameraStatus, cameraInfo, cameraError,
    geoStatus, geoPermission, geo, geoError, dist, inRange, venueBearing,
    orientStatus, orient, orientError, effectiveHeading,
  ]);

  const copyReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [report]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d2b33",
        color: "#f6f2e6",
        padding: "20px 16px 40px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>현장 진단</h1>
      <p style={{ color: "#a7cfc9", fontSize: 13, lineHeight: 1.6, margin: "0 0 18px" }}>
        아래 세 버튼을 <b>순서대로</b> 누르고, 마지막에 결과를 복사해 전달해 주세요. 게임 진행에는
        영향이 없습니다.
      </p>

      {!window.isSecureContext && (
        <div
          style={{
            ...card,
            background: "#e2725b22",
            borderColor: "#e2725b",
            color: "#ffd9d1",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <b>HTTPS가 아닙니다.</b> 카메라·위치·나침반은 HTTPS에서만 동작합니다. 배포된 https 주소로
          다시 접속해 주세요.
        </div>
      )}

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b style={{ fontSize: 15 }}>1. 카메라</b>
          <Badge status={cameraStatus} />
        </div>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            width: "100%",
            height: 150,
            objectFit: "cover",
            background: "#163947",
            borderRadius: 8,
            margin: "10px 0 0",
            display: cameraStatus === "ok" ? "block" : "none",
          }}
        />
        <div style={{ marginTop: 8 }}>
          <Row k="정보" v={cameraInfo} />
          {cameraError && <Row k="오류" v={<span style={{ color: "#ff9b88" }}>{cameraError}</span>} />}
        </div>
        <button style={button} onClick={startCamera}>
          카메라 켜기
        </button>
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b style={{ fontSize: 15 }}>2. 위치(GPS)</b>
          <Badge status={geoStatus} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Row k="권한" v={geoPermission} />
          <Row k="좌표" v={geo ? `${geo.lat.toFixed(6)}, ${geo.lon.toFixed(6)}` : "미수신"} />
          <Row k="정확도" v={geo?.accuracyM != null ? `${Math.round(geo.accuracyM)}m` : "-"} />
          <Row k="갱신" v={geo ? `${geo.updates}회 (${geo.at})` : "-"} />
          <Row
            k="꿈제작소까지"
            v={
              dist === null ? (
                "-"
              ) : (
                <span style={{ color: inRange ? "#32e5c1" : "#ffb08f" }}>
                  {Math.round(dist)}m {inRange ? "· 반경 안" : `· 반경 밖(${DREAM_WORKSHOP.radiusM}m)`}
                </span>
              )
            }
          />
          <Row k="꿈제작소 방위" v={venueBearing === null ? "-" : `${Math.round(venueBearing)}°`} />
          {geoError && <Row k="오류" v={<span style={{ color: "#ff9b88" }}>{geoError}</span>} />}
        </div>
        <button style={button} onClick={startGeo}>
          위치 확인 시작
        </button>
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b style={{ fontSize: 15 }}>3. 나침반(방향)</b>
          <Badge status={orientStatus} />
        </div>
        <p style={{ color: "#a7cfc9", fontSize: 12, lineHeight: 1.6, margin: "8px 0 0" }}>
          버튼을 누른 뒤 <b>폰을 제자리에서 한 바퀴 천천히 돌려</b> 주세요. 숫자가 바뀌어야 정상입니다.
        </p>
        <div style={{ marginTop: 8 }}>
          <Row k="값 출처" v={orient.source ?? "없음"} />
          <Row k="이벤트 수" v={`상대 ${orient.events} / 절대 ${orient.absoluteEvents}`} />
          <Row
            k="absolute"
            v={orient.absolute === null ? "-" : orient.absolute ? "true (진북 기준)" : "false (상대값)"}
          />
          <Row
            k="webkitCompass"
            v={orient.webkitHeading === null ? "없음 (iOS 전용)" : `${orient.webkitHeading.toFixed(1)}°`}
          />
          <Row k="alpha" v={orient.alpha === null ? "-" : `${orient.alpha.toFixed(1)}°`} />
          <Row
            k="계산된 방위"
            v={
              effectiveHeading === null ? (
                "-"
              ) : (
                <b style={{ color: "#32e5c1", fontSize: 20 }}>{effectiveHeading.toFixed(0)}°</b>
              )
            }
          />
          {orientError && <Row k="오류" v={<span style={{ color: "#ff9b88" }}>{orientError}</span>} />}
        </div>
        <button style={button} onClick={startOrientation}>
          나침반 확인 시작
        </button>
      </div>

      <div style={card}>
        <b style={{ fontSize: 15 }}>4. 결과 전달</b>
        <p style={{ color: "#a7cfc9", fontSize: 12, lineHeight: 1.6, margin: "8px 0 0" }}>
          복사가 안 되면 아래 상자의 글을 직접 선택해 복사해 주세요.
        </p>
        <button style={button} onClick={copyReport}>
          {copied ? "복사했습니다" : "결과 복사하기"}
        </button>
        <textarea
          readOnly
          value={report}
          style={{
            width: "100%",
            height: 220,
            marginTop: 10,
            padding: 10,
            fontSize: 11,
            lineHeight: 1.5,
            color: "#cfe9e4",
            background: "#0a2129",
            border: "1px solid #2c5a68",
            borderRadius: 8,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            resize: "vertical",
          }}
        />
      </div>

      <a
        href="/"
        style={{ display: "block", textAlign: "center", color: "#75afa7", fontSize: 13, marginTop: 8 }}
      >
        게임으로 돌아가기
      </a>
    </div>
  );
}
