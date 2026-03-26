#!/bin/bash
# Generate simple placeholder icons for the extension
# Requires ImageMagick (convert command)
# If not available, create the icons manually

if command -v magick &> /dev/null; then
  magick -size 48x48 xc:'#0969da' -fill white -font Helvetica -pointsize 24 -gravity center -annotate 0 'P1' extension/icon48.png
  magick -size 128x128 xc:'#0969da' -fill white -font Helvetica -pointsize 64 -gravity center -annotate 0 'P1' extension/icon128.png
  echo "Icons generated!"
elif command -v convert &> /dev/null; then
  convert -size 48x48 xc:'#0969da' -fill white -font Helvetica -pointsize 24 -gravity center -annotate 0 'P1' extension/icon48.png
  convert -size 128x128 xc:'#0969da' -fill white -font Helvetica -pointsize 64 -gravity center -annotate 0 'P1' extension/icon128.png
  echo "Icons generated!"
else
  echo "ImageMagick not found. Please create icon48.png and icon128.png manually."
fi
