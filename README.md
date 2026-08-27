# YOUTH ECHO

고양 내일꿈제작소 청년 행사용 **모바일 세로형 위치기반 AR 카드 게임**과, 행사 현장에서 쓰는 **완주 코드 발급·경품 수령 도구**입니다.

> 저장소 이름(`goyang-dream-factory-ver3`)은 초기 기획 단계의 이름입니다. 제품명은 **YOUTH ECHO**입니다.

## 게임 흐름

1. **AR 탐색** — 현장에서 카메라·GPS·나침반으로 청년 캐릭터를 실제 방위에 고정 배치합니다. 폰을 그 방향으로 돌려야 나타납니다.
2. **대화 → 카드 획득** — 2~3턴 선택지 대화. 정답이면 카드와 호감도(+18)를 얻고, 오답이면 청년이 사라져 다시 탐색해야 합니다.
3. **스토리 해금** — 카드를 **5장 이상** 모으면 A동 1~4층과 B동을 탐사하는 2.5D 야간 맵이 열립니다.
4. **턴제 배틀** — 카드 3장을 조합해 대표 속성을 정하고 3턴 승부. 보스는 한숨덩이와 이상한 박사입니다.

### 속성 상성

```
감정 → 분석 → 체력 → 영감 → 도전 → 감정      (화살표 앞이 승리)
```

위 순환에 없는 5개 쌍(감정–체력, 분석–영감, 체력–도전, 영감–감정, 도전–분석)은 **상성 없음**으로 처리하고, 이때만 대표 카드 레벨이 높은 쪽이 이깁니다.

### 카드 3장 조합

| 조합 | 조건 | 대표 속성 |
|---|---|---|
| 몰빵 | 3장 모두 같은 속성 | 그 속성 |
| 페어 | 2장이 같은 속성 | 겹친 속성 |
| 무지개 | 3장 모두 다름 | **첫 번째로 놓은 카드**(리더) |

무지개일 때만 카드 배열 순서가 전술이 됩니다. 이상한 박사는 **직전 턴의 대표 속성을 한 턴 늦게 복제**하므로, 복제될 속성을 예측해 리더를 바꾸는 것이 공략의 핵심입니다.

## 개발

```bash
pnpm install

pnpm dev      # 풀스택 개발 서버 (server/_core/index.ts + Vite 미들웨어)
pnpm test     # vitest (server/**/*.test.ts)
pnpm check    # tsc --noEmit
pnpm format   # prettier
```

## 배포 — 두 가지 모드

이 저장소는 성격이 다른 두 가지로 배포할 수 있습니다. **무엇을 배포하는지 반드시 구분하세요.**

| | 정적 배포 | 풀스택 배포 |
|---|---|---|
| 명령 | `DEPLOY_BASE=/ pnpm exec vite build --config vite.static.config.ts` | `pnpm build` → `pnpm start` |
| 산출물 | `dist-static/` | `dist/` + 상주 Node 프로세스 |
| 참가자 게임 | ✅ 동작 | ✅ 동작 |
| `/operator` 운영자 콘솔 | ❌ **동작하지 않음** (`/api/trpc` 없음) | ✅ 동작 |
| DB | 불필요 | MySQL 필요 |
| 호스팅 | Vercel 등 정적 호스팅 (`vercel.json` 준비됨) | Railway / Fly.io 등 |

참가자 게임은 서버 호출이 전혀 없고 진행 데이터를 전부 브라우저 `localStorage`에 저장하므로, **체험용이라면 정적 배포만으로 충분합니다.**

### HTTPS 필수

카메라·GPS·나침반 API는 보안 컨텍스트에서만 동작합니다. HTTP로 서비스하면 AR이 켜지지 않습니다. Vercel은 자동으로 HTTPS를 제공합니다.

## 이미지 자산

게임 이미지 20개는 저장소에 포함되어 있지 않습니다. 넣는 방법과 파일 목록은 **[`client/public/game/README.md`](client/public/game/README.md)** 를 참고하세요.

이미지가 없어도 게임은 `client/src/StaticFallback.css`의 CSS 픽셀 아트로 동작합니다. 원본을 모두 넣은 뒤에는 `client/src/main.tsx`의 `import "./StaticFallback.css";` 한 줄을 삭제하세요.

## 환경 변수 (풀스택 배포에만 필요)

| 변수 | 용도 |
|---|---|
| `DATABASE_URL` | MySQL 접속 문자열. 없으면 DB 기능이 비활성화되고 나머지는 정상 동작합니다 |
| `JWT_SECRET` | 세션 쿠키 서명 키 |
| `OWNER_OPEN_ID` | 이 openId로 로그인하면 자동으로 `admin` 권한을 받습니다. 운영자 권한의 유일한 부트스트랩 경로입니다 |
| `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` | Manus OAuth 로그인 |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Manus 스토리지 프록시(`/manus-storage/*`). 이미지를 저장소로 옮겼으므로 더 이상 필요하지 않습니다 |

DB 스키마 변경은 `pnpm db:push` (drizzle-kit generate + migrate)로 반영합니다.

## 개인정보 처리

설계상 **참가자 개인정보를 저장하지 않습니다.**

- 게임 진행(카드·호감도·가방·단서)은 참가자 브라우저의 `localStorage`에만 저장됩니다. 서버로 전송되지 않습니다.
- 카메라 영상은 화면 표시와 기기 내 이미지 저장에만 쓰이며 서버로 전송되지 않습니다.
- 서버 DB에는 **입장권 번호의 SHA-256 해시, 완주 코드의 SHA-256 해시, 발급·수령 상태와 시각**만 남습니다. 이름·전화번호·이메일·기기 식별자·위치 이력·코드 원문은 컬럼 자체가 없습니다.

자세한 현장 운영 절차와 장애 대응은 [`event_operations_manual.md`](event_operations_manual.md)를 참고하세요.

## 알려진 제약

- **`/operator`는 정적 배포에서 동작하지 않습니다.** 경품 코드 기능이 필요하면 풀스택 배포가 필요합니다.
- **운영자 로그인이 Manus OAuth에 묶여 있습니다.** 자체 도메인으로 운영하려면 인증을 교체해야 합니다.
- **안드로이드 나침반**: 코드가 iOS의 `webkitCompassHeading`을 사용합니다. 안드로이드 크롬에는 이 값이 없어 방위 정확도가 떨어질 수 있습니다. 실기기 검증이 필요합니다.
- **실내 GPS 오차**: 건물 내부에서 오차가 커질 수 있습니다. 반경 밖·센서 없는 환경에서는 `?test=1`로 가상 GPS 구역을 선택해 체험할 수 있습니다.
- **완주 코드 재발급 불가**: `participationHash`가 UNIQUE라 입장권 1장당 1회만 발급됩니다. 참가자가 코드를 잃으면 현재 복구 수단이 없습니다.
- **게임 본체가 단일 파일입니다.** `client/src/pages/Home.tsx`(약 69KB)에 5개 화면 전체가 들어 있고 `@ts-nocheck`이 걸려 있어 이 파일은 타입 검사를 받지 않습니다.
- **저장된 결말 표시 UI가 없습니다.** 박사전 결말은 `save.endings`에 기록되지만 아직 어디에도 보여주지 않습니다.

## 관련 문서

| 파일 | 내용 |
|---|---|
| `ideas.md` | 디자인 방향, 색·타이포 체계, 게임 규칙 명세 |
| `todo.md` | 개발 이력 체크리스트 |
| `event_operations_manual.md` | 현장 운영·네트워크 장애 대응 매뉴얼 |
| `event_security_slides.md`, `event-security-deck/` | 보안 아키텍처 발표 자료 |
| `space_reference_notes.md` | 실제 공간 사진 관찰 메모 |
| `제안서/` | 사업 제안서 |
