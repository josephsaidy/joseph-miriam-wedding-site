#!/usr/bin/env bash
# Generates artifacts/wedding/public/opengraph.jpg (1200×630)
# Two portrait photos + dark overlay + J&M branding

set -e

OUT="artifacts/wedding/public/opengraph.jpg"
IMG_DIR="artifacts/wedding/public/images"

# Pick a font that exists on this system (fallback chain)
FONT=""
for f in "Palatino-Bold" "Georgia-Bold" "Georgia" "Times-Bold" "Times" "DejaVu-Serif-Bold" "DejaVu-Serif" "Liberation-Serif-Bold" "Liberation-Serif"; do
  if magick -list font 2>/dev/null | grep -qi "^  Font: ${f}$\|Name: ${f}"; then
    FONT="$f"
    break
  fi
done

# If we couldn't detect a font by exact name, let ImageMagick use whatever default it finds
FONT_ARG=""
if [ -n "$FONT" ]; then
  FONT_ARG="-font $FONT"
fi

echo "Using font: ${FONT:-<default>}"

magick \
  \
  `# ── LEFT PANEL: hero2.jpg ────────────────────────────────────────` \
  \( "$IMG_DIR/hero2.jpg"     -resize 600x630^ -gravity center -extent 600x630 \) \
  \
  `# ── RIGHT PANEL: our-story.jpg ───────────────────────────────────` \
  \( "$IMG_DIR/our-story.jpg" -resize 600x630^ -gravity center -extent 600x630 \) \
  \
  `# ── JOIN SIDE BY SIDE ────────────────────────────────────────────` \
  +append \
  \
  `# ── DARK VIGNETTE OVERLAY ────────────────────────────────────────` \
  \( -size 1200x630 xc:"rgba(18,14,9,0.70)" \) -composite \
  \
  `# ── HORIZONTAL GOLD RULE above text ─────────────────────────────` \
  -fill "#a08d6e" -draw "line 480,240 720,240" \
  \
  `# ── "J & M" — large serif gold ───────────────────────────────────` \
  $FONT_ARG \
  -pointsize 110 -fill "#c4a97d" \
  -gravity center -annotate +0-42 "J & M" \
  \
  `# ── "Joseph & Miriam" — smaller gold ────────────────────────────` \
  -pointsize 28 -fill "#e2d4bb" \
  -gravity center -annotate +0+68 "Joseph & Miriam" \
  \
  `# ── Date & location ──────────────────────────────────────────────` \
  -pointsize 20 -fill "#9e8b6f" \
  -gravity center -annotate +0+108 "August 2nd, 2026  ·  Bekaa, Lebanon" \
  \
  `# ── HORIZONTAL GOLD RULE below text ─────────────────────────────` \
  -fill "#a08d6e" -draw "line 480,385 720,385" \
  \
  `# ── OUTPUT ───────────────────────────────────────────────────────` \
  -quality 92 "$OUT"

echo "✓ Written: $OUT"
identify "$OUT"
