"""Bake existing folded-gradient artwork once. Requires CairoSVG and Pillow; not used at runtime."""
from io import BytesIO
from pathlib import Path
import xml.etree.ElementTree as ET

import cairosvg
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parent.parent
art = ET.parse(root / "public/art/folded-gradient.svg").getroot()
ns = {"s": "http://www.w3.org/2000/svg"}
defs = ET.tostring(art.find("s:defs", ns), encoding="unicode")
folds = art.find("s:g", ns)
folds.attrib.pop("transform", None)
bands = ET.tostring(folds, encoding="unicode")
width, height = 1600, 1000
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">
{defs}<rect width="100%" height="100%" fill="#171b19"/>
<g opacity=".8" transform="translate(128 -100) rotate(8 800 453) scale(1.067)">{bands}</g>
<g opacity=".22" transform="translate(0 540) rotate(155 680 385) scale(.907)">{bands}</g>
</svg>'''
image = Image.open(BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert("RGB")
image = image.filter(ImageFilter.GaussianBlur(.7))

# Bake the dark reading scrim too. No browser blur or overlay layers needed.
stops = [(0, .90), (.35, .72), (.72, .125), (1, .11)]
pixels = image.load()
for x in range(width):
    t = x / (width - 1)
    left, right = next((a, b) for a, b in zip(stops, stops[1:]) if a[0] <= t <= b[0])
    horizontal = left[1] + (right[1] - left[1]) * (t - left[0]) / (right[0] - left[0])
    for y in range(height):
        vertical = max(0, (y / (height - 1) - .3) / .7) * .65
        opacity = 1 - (1 - horizontal) * (1 - vertical)
        pixels[x, y] = tuple(round(c * (1 - opacity) + ink * opacity)
                             for c, ink in zip(pixels[x, y], (23, 27, 25)))
output = root / "public/art/dashboard-gradient.webp"
image.save(output, "WEBP", quality=82, method=6)
print(f"{output.name}: {output.stat().st_size:,} bytes; {width}x{height}")
