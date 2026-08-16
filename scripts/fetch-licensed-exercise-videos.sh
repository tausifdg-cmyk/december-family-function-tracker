#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/exercises/real"
mkdir -p "$OUT"

# Exercise id | YMove free-library asset id | source exercise title
VIDEOS=$(cat <<'EOF'
dumbbell-bench-press|dd7e706c-2086-4f4b-867f-d7fece2f720d|Barbell Bench Press
incline-dumbbell-press|35a53872-f47c-4ec6-9bdd-888eb1705572|Incline Machine Press
dumbbell-chest-fly|4d197e26-766c-4c5c-b937-9918e56c5b9b|Pec Deck Fly
one-arm-dumbbell-row|d3fece95-c7e2-4794-ba8f-65a5b3e30a28|Single Arm Dumbbell Row - Legs apart
lat-pulldown|9302ad5d-b97a-4b27-afae-611b6ce70a06|Lat Pulldown with V-Grip
seated-cable-row|499ccaa4-719d-40bd-b441-511291482471|Seated Cable Row Neutral Grip
lateral-raise|a16f0235-20eb-4306-b9cc-c01ae51b3b9b|Dumbbell Lateral Raise
rear-delt-fly|31fa8cba-bf48-4c16-9cf9-6a3627ee9bea|Machine Reverse Fly
dumbbell-biceps-curl|6622f4ed-5af3-4275-af0e-7dc23dd8ff78|Machine Bicep Curl
hammer-curl|b11e6c6f-b2e8-44ca-95dc-adf0dcd34426|Hammer Curls
rope-pushdown|9a550e2c-c55e-495d-b59e-b676c3d48a41|Cable Tricep Pushdown
overhead-triceps-extension|c57e3719-a853-453f-b04a-da0c9475d6e7|Overhead Cable Rope Extension
romanian-deadlift|e7175536-9d7d-4f5d-8d49-26c3411eac80|Kettlebell Romanian Deadlift
back-squat|fd0eaa34-d14b-4421-b41c-1669f93253b3|Barbell Back Squat
leg-curl|34a512bf-baa1-48ac-a5b9-132073166018|Lying Leg Curl
leg-extension|3d0e78d0-1125-4d25-8bd4-9ca7ba3799e8|Leg Extension
EOF
)

while IFS='|' read -r exercise asset title; do
  source_file="$OUT/$exercise.source.mp4"
  target_file="$OUT/$exercise.mp4"
  poster_file="$OUT/$exercise.webp"
  printf 'Downloading %s\n' "$title"
  curl --fail --location --silent --show-error "https://ymove.app/api/free/$asset" --output "$source_file"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$source_file" -t 12 -an \
    -vf "scale=-2:720:flags=lanczos,fps=24" -c:v libx264 -preset medium -crf 28 \
    -pix_fmt yuv420p -movflags +faststart "$target_file"
  ffmpeg -nostdin -hide_banner -loglevel error -y -ss 4 -i "$target_file" -frames:v 1 \
    -vf "scale=240:-2:flags=lanczos" -c:v libwebp -quality 78 "$poster_file"
  rm -f "$source_file"
done <<< "$VIDEOS"

printf 'Prepared %s licensed real-human clips in %s\n' "$(printf '%s\n' "$VIDEOS" | wc -l)" "$OUT"
