# -*- coding: utf-8 -*-
"""生成象数工坊图标：墨底金边太极，输出多尺寸 ICO"""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'xiangshu.ico')
S = 256
SS = 4                      # 4 倍超采样，边缘更顺滑
W = S * SS
img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

INK  = (24, 29, 38, 255)    # 墨色
GOLD = (217, 180, 106, 255) # 金色
cx = cy = W / 2
R = W * 0.44
ring = max(2, int(W * 0.022))

d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=GOLD)                    # 金边
d.ellipse([cx - R + ring, cy - R + ring, cx + R - ring, cy + R - ring], fill=INK)
r2 = R - ring
d.pieslice([cx - r2, cy - r2, cx + r2, cy + r2], -90, 90, fill=GOLD)      # 右半金
d.ellipse([cx - r2 / 2, cy - r2, cx + r2 / 2, cy], fill=GOLD)             # 上小圆
d.ellipse([cx - r2 / 2, cy, cx + r2 / 2, cy + r2], fill=INK)              # 下小圆
dot = r2 / 8
d.ellipse([cx - dot, cy - r2 / 2 - dot, cx + dot, cy - r2 / 2 + dot], fill=INK)   # 金中墨点
d.ellipse([cx - dot, cy + r2 / 2 - dot, cx + dot, cy + r2 / 2 + dot], fill=GOLD)  # 墨中金点

img = img.resize((S, S), Image.LANCZOS)
img.save(OUT, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
print('图标已生成: ' + os.path.abspath(OUT) + '  ' + str(os.path.getsize(OUT)) + ' bytes')
