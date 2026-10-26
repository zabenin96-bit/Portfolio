#!/usr/bin/env bash
# Makes a light, seamless preview loop + poster for a category tile.
#
#   tools/make-preview.sh <source video> <start, e.g. 00:00:12> <name>
#
# Result: assets/video/<name>.mp4 (~0.5–1.2 MB) and assets/img/<name>.webp
# Needs ffmpeg (https://ffmpeg.org).
set -euo pipefail
src="$1"; start="$2"; name="$3"
len=4        # seconds
fade=0.5     # crossfade between end and start, hides the loop seam
w=960        # tile is ~460 px wide on desktop, x2 for retina screens

ffmpeg -y -ss "$start" -t "$len" -i "$src" -ss "$start" -t "$len" -i "$src" -filter_complex "
  [0:v]scale=${w}:-2:flags=lanczos,fps=25,setpts=PTS-STARTPTS,split[a][b];
  [a]trim=0:$(echo "$len-$fade" | bc),setpts=PTS-STARTPTS[main];
  [b]trim=$(echo "$len-$fade" | bc):$len,setpts=PTS-STARTPTS[tail];
  [1:v]scale=${w}:-2:flags=lanczos,fps=25,trim=0:$fade,setpts=PTS-STARTPTS[head];
  [tail][head]xfade=transition=fade:duration=$fade:offset=0[seam];
  [seam][main]concat=n=2:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -profile:v high -preset slow -crf 28 \
  -movflags +faststart "assets/video/${name}.mp4"

ffmpeg -y -i "assets/video/${name}.mp4" -frames:v 1 -c:v libwebp -quality 72 "assets/img/${name}.webp"
ls -lh "assets/video/${name}.mp4" "assets/img/${name}.webp"
