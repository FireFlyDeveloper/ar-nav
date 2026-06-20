from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode
import random
import math
import os

# Seed for reproducibility but with enough randomness in the pattern
random.seed(42)

size = 1024  # Higher resolution for better feature detection
img = Image.new('RGB', (size, size), '#ffffff')
draw = ImageDraw.Draw(img)

# Create a rich, non-repeating, asymmetric background with features distributed to edges
# Strategy: use multiple layers of varied visual elements

# Layer 1: Organic gradient blobs with high contrast (no symmetry)
def draw_blob(draw, cx, cy, rx, ry, color, rotation=0):
    points = []
    for angle in range(0, 360, 10):
        rad = math.radians(angle + rotation)
        r = 1.0 + 0.15 * math.sin(angle * 3) + 0.1 * math.cos(angle * 5)
        x = cx + rx * r * math.cos(rad)
        y = cy + ry * r * math.sin(rad)
        points.append((x, y))
    draw.polygon(points, fill=color)

# Asymmetric organic shapes distributed across the canvas
blobs = [
    (120, 140, 180, 140, '#1a1a2e', 30),
    (900, 200, 200, 160, '#16213e', -20),
    (200, 850, 220, 180, '#0f3460', 45),
    (880, 880, 190, 200, '#533483', -35),
    (520, 120, 250, 120, '#1a1a2e', 15),
    (150, 500, 160, 200, '#16213e', 60),
    (900, 520, 170, 190, '#0f3460', -50),
    (500, 900, 240, 150, '#1a1a2e', 25),
    (350, 300, 140, 120, '#2d1b4e', 40),
    (750, 750, 130, 110, '#1a1a2e', -15),
]
for cx, cy, rx, ry, color, rot in blobs:
    draw_blob(draw, cx, cy, rx, ry, color, rot)

# Layer 2: High-contrast diagonal strokes and splatters (no repetition)
for i in range(60):
    x1 = random.randint(0, size)
    y1 = random.randint(0, size)
    length = random.randint(40, 180)
    angle = random.uniform(0, math.pi * 2)
    x2 = x1 + length * math.cos(angle)
    y2 = y1 + length * math.sin(angle)
    width = random.randint(2, 8)
    color = random.choice([
        '#e94560', '#ff6b6b', '#feca57', '#48dbfb',
        '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3',
        '#ff9f43', '#10ac84', '#ee5a24', '#0984e3'
    ])
    draw.line([(x1, y1), (x2, y2)], fill=color, width=width)

# Layer 3: Scattered geometric shapes (triangles, irregular polygons) near edges
triangles = [
    [(50, 50), (180, 90), (90, 220)],
    [(950, 80), (1020, 200), (850, 180)],
    [(60, 920), (200, 980), (120, 850)],
    [(940, 940), (980, 820), (860, 880)],
    [(400, 40), (520, 120), (450, 30)],
    [(600, 30), (720, 100), (680, 20)],
    [(30, 400), (150, 450), (80, 350)],
    [(950, 400), (1010, 520), (880, 480)],
    [(40, 650), (160, 600), (100, 720)],
    [(940, 640), (1000, 760), (860, 700)],
]
colors_tri = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24']
for tri, color in zip(triangles, colors_tri):
    draw.polygon(tri, fill=color)

# Layer 4: Random circles with varying sizes and opacities (simulated by color mixing)
for i in range(40):
    cx = random.randint(0, size)
    cy = random.randint(0, size)
    r = random.randint(15, 80)
    color = random.choice([
        '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6',
        '#e94560', '#ff6b6b', '#feca57', '#48dbfb'
    ])
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=color)

# Layer 5: Fine-grained noise texture in margins (high frequency detail)
for i in range(3000):
    x = random.randint(0, size)
    y = random.randint(0, size)
    if random.random() > 0.5:
        draw.point((x, y), fill='#1d1d1f')
    else:
        draw.point((x, y), fill='#ffffff')

# Layer 6: Concentric arcs (asymmetric placement)
for cx, cy in [(200, 200), (850, 300), (300, 800), (800, 850)]:
    for r in range(20, 120, 15):
        color = random.choice(['#e94560', '#0f3460', '#533483', '#feca57'])
        draw.arc([cx-r, cy-r, cx+r, cy+r], start=random.randint(0, 90), end=random.randint(180, 360), fill=color, width=3)

# Layer 7: Dashed lines and cross-hatching in sparse areas
for i in range(30):
    x1 = random.randint(0, size)
    y1 = random.randint(0, size)
    length = random.randint(30, 100)
    angle = random.uniform(0, math.pi * 2)
    for j in range(5):
        seg_start = j * (length / 5)
        seg_end = seg_start + (length / 10)
        sx = x1 + seg_start * math.cos(angle)
        sy = y1 + seg_start * math.sin(angle)
        ex = x1 + seg_end * math.cos(angle)
        ey = y1 + seg_end * math.sin(angle)
        draw.line([(sx, sy), (ex, ey)], fill='#1d1d1f', width=2)

# Now overlay the QR code in the center
qr = qrcode.QRCode(version=5, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=12, border=2)
qr.add_data('https://navigation.ffly.site/ar?from=QR_A1&to=room-301')
qr.make(fit=True)
qr_img = qr.make_image(fill_color='#1d1d1f', back_color='#ffffff').convert('RGB')

qr_size = 340
qr_img = qr_img.resize((qr_size, qr_size), Image.LANCZOS)
qr_x = (size - qr_size) // 2
qr_y = (size - qr_size) // 2 - 50

# Create a white backing plate for the QR with slight shadow effect for visual separation
plate_margin = 20
draw.rounded_rectangle(
    [qr_x - plate_margin, qr_y - plate_margin, qr_x + qr_size + plate_margin, qr_y + qr_size + plate_margin + 90],
    radius=16,
    fill='#ffffff',
    outline='#e0e0e0',
    width=2
)

img.paste(qr_img, (qr_x, qr_y))

# Add text below QR
try:
    font_large = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 52)
    font_small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 32)
except:
    font_large = ImageFont.load_default()
    font_small = ImageFont.load_default()

text = 'WAYPOINT QR_A1'
bbox = draw.textbbox((0, 0), text, font=font_large)
text_w = bbox[2] - bbox[0]
draw.text(((size - text_w) // 2, qr_y + qr_size + 20), text, fill='#1d1d1f', font=font_large)

text2 = 'Scan \u2192 AR Navigation'
bbox2 = draw.textbbox((0, 0), text2, font=font_small)
text2_w = bbox2[2] - bbox2[0]
draw.text(((size - text_w) // 2, qr_y + qr_size + 80), text2, fill='#0066cc', font=font_small)

# Add some distinctive corner markers that are NOT symmetric
corner_marks = [
    # Top-left: bold L-shape
    {'type': 'L', 'pos': (30, 30), 'color': '#e94560', 'size': 80, 'rotation': 0},
    # Top-right: star burst
    {'type': 'star', 'pos': (size-30, 30), 'color': '#feca57', 'size': 70, 'rotation': 0},
    # Bottom-left: circle cluster
    {'type': 'cluster', 'pos': (30, size-30), 'color': '#48dbfb', 'size': 60, 'rotation': 0},
    # Bottom-right: diamond
    {'type': 'diamond', 'pos': (size-30, size-30), 'color': '#ff9ff3', 'size': 75, 'rotation': 0},
]

for mark in corner_marks:
    x, y = mark['pos']
    s = mark['size']
    c = mark['color']
    t = mark['type']
    if t == 'L':
        draw.rectangle([x, y, x + s//3, y + s], fill=c)
        draw.rectangle([x, y, x + s, y + s//3], fill=c)
    elif t == 'star':
        pts = []
        for i in range(10):
            angle = math.pi/2 + i * math.pi/5
            r = s//2 if i % 2 == 0 else s//4
            px = x + r * math.cos(angle)
            py = y + r * math.sin(angle)
            pts.append((px, py))
        draw.polygon(pts, fill=c)
    elif t == 'cluster':
        draw.ellipse([x-s//2, y-s//2, x+s//2, y+s//2], fill=c)
        draw.ellipse([x-s//3, y-s//3, x+s//3, y+s//3], fill='#ffffff')
        draw.ellipse([x-s//6, y-s//6, x+s//6, y+s//6], fill='#1d1d1f')
    elif t == 'diamond':
        draw.polygon([(x, y-s), (x+s, y), (x, y+s), (x-s, y)], fill=c)

# Save the high-res image
output_dir = '/root/.worktrees/t_6e041fef/public/targets'
os.makedirs(output_dir, exist_ok=True)
img_path = os.path.join(output_dir, 'QR_A1.png')
img.save(img_path, 'PNG')
print('Saved high-feature poster image to', img_path)
print('Image size:', img.size)

# Also create a smaller 512x512 version for web preview if needed
img_small = img.resize((512, 512), Image.LANCZOS)
img_small_path = os.path.join(output_dir, 'QR_A1_preview.png')
img_small.save(img_small_path, 'PNG')
print('Saved preview to', img_small_path)
