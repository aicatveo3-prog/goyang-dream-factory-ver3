#!/usr/bin/env bash
# Manus 원본 파일명(해시 포함)으로 받은 게임 이미지를 코드가 기대하는 이름으로 정리한다.
#
# 사용법:
#   1) 원본 파일 20개를 client/public/game/ 에 넣는다
#   2) 저장소 루트에서 실행: bash scripts/rename-game-assets.sh
#
# 이미 정리된 이름의 파일은 건드리지 않으며, 없는 파일은 목록으로 알려준다.

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/client/public/game"

if [ ! -d "$DIR" ]; then
  echo "오류: $DIR 폴더가 없습니다." >&2
  exit 1
fi

# "원본파일명 새파일명" 쌍
MAP="
worker-female-v2_18323621.png worker-female.png
worker-male-v2_61df3cdf.png worker-male.png
thinker-v2_4f60cbce.png thinker.png
researcher-v2_eeaeffd0.png researcher.png
student-v2_c00f9648.png student.png
sleeper-v2_dc0334f1.png sleeper.png
sleeping-v2_bfde4814.png sleeping.png
dancer-female-v2_a9baaa05.png dancer-female.png
dancer-male-v2_7a6eb01c.png dancer-male.png
artist-v2_015d483b.png artist.png
doctor-v2_a2a5d149.png doctor.png
youth-challenge_ed81ed38.webp youth-challenge.webp
youth-coder_40569f05.webp youth-coder.webp
youth-excited_6ed9778d.webp youth-excited.webp
sigh-clump_4771e8f8.webp sigh-clump.webp
dreamworks-bright-ar-lobby_ee89b650.png ar-lobby.png
dreamworks-25d-floor1_9d9de4f4.png floor-1.png
dreamworks-25d-floor2-3_2f84facd.png floor-2-3.png
dreamworks-25d-floor4-bwing_12447917.png floor-4-bwing.png
echo-mark_4e55f7e6.png echo-mark.png
"

renamed=0
already=0
missing=()

while read -r src dst; do
  [ -z "${src:-}" ] && continue
  if [ -f "$DIR/$src" ]; then
    mv "$DIR/$src" "$DIR/$dst"
    echo "정리: $src -> $dst"
    renamed=$((renamed + 1))
  elif [ -f "$DIR/$dst" ]; then
    already=$((already + 1))
  else
    missing+=("$dst")
  fi
done <<< "$MAP"

echo
echo "이름 정리: ${renamed}개 / 이미 준비됨: ${already}개 / 없음: ${#missing[@]}개"

if [ ${#missing[@]} -gt 0 ]; then
  echo
  echo "아직 없는 파일:"
  for f in "${missing[@]}"; do echo "  - $f"; done
  echo
  echo "이미지가 없어도 게임은 CSS 폴백으로 동작합니다."
  echo "필요한 파일 설명은 client/public/game/README.md 를 참고하세요."
  exit 0
fi

echo
echo "20개 모두 준비되었습니다."
echo "이제 client/src/main.tsx 의 'import \"./StaticFallback.css\";' 한 줄을 삭제하면 원본 이미지가 표시됩니다."
