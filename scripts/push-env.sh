#!/usr/bin/env bash
#
# 로컬 환경 변수 파일을 Vercel 프로젝트에 그대로 올립니다.
#
#   ./scripts/push-env.sh
#
# 값이 화면에 출력되지 않으므로 키가 노출되지 않습니다.
# 실행 후에는 반영을 위해 재배포가 필요합니다: npx vercel --prod
#
set -euo pipefail

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "환경 변수 파일이 없습니다: $ENV_FILE"
  echo "먼저 .env.example 을 복사해서 값을 채우세요."
  exit 1
fi

echo "→ $ENV_FILE 의 값을 Vercel(production, preview)에 올립니다."

while IFS= read -r line || [ -n "$line" ]; do
  # 주석과 빈 줄 건너뛰기
  case "$line" in
    ''|\#*) continue ;;
  esac

  key="${line%%=*}"
  value="${line#*=}"

  # 키 이름이 없거나 Vercel이 자동 생성한 값은 건너뜁니다
  case "$key" in
    ''|VERCEL_*|NX_*) continue ;;
  esac

  # 앞뒤 따옴표 제거
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  [ -z "$value" ] && continue

  for target in production preview; do
    # 값은 stdin으로만 전달하므로 터미널에 찍히지 않습니다
    printf '%s' "$value" | npx --yes vercel@latest env add "$key" "$target" --force >/dev/null 2>&1 \
      && echo "  ✓ $key ($target)" \
      || echo "  ✗ $key ($target) — 실패"
  done
done < "$ENV_FILE"

echo
echo "완료. 재배포하면 반영됩니다:"
echo "  npx vercel --prod"
