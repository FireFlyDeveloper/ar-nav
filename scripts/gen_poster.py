from PIL import Image, ImageDraw, ImageFont
import qrcode
import os

os.makedirs('/root/.worktrees/t_e9bb9af0/public/targets', exist_ok=True)

size = 512
img = Image.new('RGB', (size, size), '#f5f5f7')
draw = ImageDraw.Draw(img)

draw.rectangle([20, 20, size-20, size-20], outline='#0066cc', width=8)
draw.rectangle([32, 32, size-32, size-32], outline='#1d1d1f', width=4)

for i in range(0, size, 24):
    draw.line([(i, 0), (i+60, 60)], fill='#e0e0e0', width=2)
    draw.line([(0, i), (60, i+60)], fill='#e0e0e0', width=2)

qr = qrcode.QRCode(version=5, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=8, border=2)
qr.add_data('https://navigation.ffly.site/ar?from=QR_A1&to=room-301')
qr.make(fit=True)
qr_img = qr.make_image(fill_color='#1d1d1f', back_color='#ffffff').convert('RGB')

qr_size = 280
qr_img = qr_img.resize((qr_size, qr_size), Image.LANCZOS)
qr_x = (size - qr_size) // 2
qr_y = (size - qr_size) // 2 - 40
img.paste(qr_img, (qr_x, qr_y))

try:
    font_large = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 36)
    font_small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)
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
draw.text(((size - text2_w) // 2, qr_y + qr_size + 70), text2, fill='#0066cc', font=font_small)

draw.polygon([(40, 40), (80, 40), (40, 80)], fill='#ff3b30')
draw.polygon([(size-40, 40), (size-80, 40), (size-40, 80)], fill='#ff3b30')
draw.polygon([(40, size-40), (80, size-40), (40, size-80)], fill='#ff3b30')
draw.polygon([(size-40, size-40), (size-80, size-40), (size-40, size-80)], fill='#ff3b30')

img_path = '/root/.worktrees/t_e9bb9af0/public/targets/QR_A1.png'
img.save(img_path, 'PNG')
print('Saved poster image to', img_path)
print('Image size:', img.size)
