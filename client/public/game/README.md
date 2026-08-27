# 게임 이미지 자산 폴더

이 폴더에 이미지 파일을 넣으면 게임에 **즉시** 반영됩니다. 빌드 설정을 고칠 필요가 없습니다.

이전에는 이 이미지들을 Manus 플랫폼의 비공개 스토리지(`/manus-storage/*`)에서 프록시로 가져왔습니다.
그 방식은 Manus 환경 밖(예: Vercel 정적 배포)에서 전부 404가 되므로, 저장소 안에서 직접 서빙하도록 바꿨습니다.

## 넣어야 하는 파일 (총 20개)

파일명을 **아래와 정확히 같게** 맞춰주세요. 대소문자와 확장자까지 일치해야 합니다.

### 청년 캐릭터 (14개)

| 파일명 | 캐릭터 | 원래 Manus 파일명 |
|---|---|---|
| `worker-female.png` | 일하는 청년(여) | `worker-female-v2_18323621.png` |
| `worker-male.png` | 일하는 청년(남) | `worker-male-v2_61df3cdf.png` |
| `thinker.png` | 생각하는 청년 | `thinker-v2_4f60cbce.png` |
| `researcher.png` | 연구하는 청년 | `researcher-v2_eeaeffd0.png` |
| `student.png` | 공부하는 청년 | `student-v2_c00f9648.png` |
| `sleeper.png` | 졸린 청년 | `sleeper-v2_dc0334f1.png` |
| `sleeping.png` | 자는 청년(가로형·침대) | `sleeping-v2_bfde4814.png` |
| `dancer-female.png` | 춤추는 청년(여) | `dancer-female-v2_a9baaa05.png` |
| `dancer-male.png` | 춤추는 청년(남) | `dancer-male-v2_7a6eb01c.png` |
| `artist.png` | 화가 (스토리 NPC) | `artist-v2_015d483b.png` |
| `doctor.png` | 이상한 박사 (보스) | `doctor-v2_a2a5d149.png` |
| `youth-challenge.webp` | 도전하는 청년 | `youth-challenge_ed81ed38.webp` |
| `youth-coder.webp` | 코딩하는 청년 | `youth-coder_40569f05.webp` |
| `youth-excited.webp` | 들뜬 청년 | `youth-excited_6ed9778d.webp` |

### 보스 (1개)

| 파일명 | 용도 | 원래 Manus 파일명 |
|---|---|---|
| `sigh-clump.webp` | 한숨덩이 | `sigh-clump_4771e8f8.webp` |

### 배경 (4개)

| 파일명 | 용도 | 원래 Manus 파일명 |
|---|---|---|
| `ar-lobby.png` | AR 탐색 화면 배경 | `dreamworks-bright-ar-lobby_ee89b650.png` |
| `floor-1.png` | 스토리 A동 1층 | `dreamworks-25d-floor1_9d9de4f4.png` |
| `floor-2-3.png` | 스토리 A동 2~3층 | `dreamworks-25d-floor2-3_2f84facd.png` |
| `floor-4-bwing.png` | 스토리 A동 4층 · B동 | `dreamworks-25d-floor4-bwing_12447917.png` |

### 로고 (1개)

| 파일명 | 용도 | 원래 Manus 파일명 |
|---|---|---|
| `echo-mark.png` | 상단 브랜드 마크 + 파비콘 | `echo-mark_4e55f7e6.png` |

## 파일 규격

- **캐릭터·보스**: 배경이 투명한 PNG 또는 WebP. 인물이 이미지 하단에 발이 닿게 배치되어야 바닥 그림자 정렬이 맞습니다.
- **배경**: 불투명 PNG. 세로형 화면에서 가로로 넓게 패닝하므로 가로가 긴 이미지가 적합합니다.
- **로고**: 정사각형에 가까운 투명 PNG.
- 원본 파일이 있다면 **크기를 조정하지 말고 그대로** 넣어주세요. 표시 크기는 CSS에서 캐릭터별로 미세 조정되어 있습니다.

## 원본 파일명으로 갖고 있는 경우

Manus 원본 파일명(해시가 붙은 형태)을 그대로 갖고 있다면, 이 폴더에 넣고 저장소 루트에서 아래를 실행하면 한 번에 이름이 정리됩니다.

```bash
bash scripts/rename-game-assets.sh
```

## 이미지가 아직 없을 때

이미지가 없어도 게임은 동작합니다. `client/src/StaticFallback.css`가 CSS 픽셀 아트 캐릭터와
대체 배경을 그려줍니다. 다만 완성도가 원본보다 낮으므로 정식 출시 전에는 원본을 넣어야 합니다.

**원본 이미지를 모두 넣은 뒤에는** `client/src/main.tsx`의 아래 한 줄을 삭제하세요.
그래야 폴백이 꺼지고 원본 PNG가 표시됩니다.

```ts
import "./StaticFallback.css";
```
