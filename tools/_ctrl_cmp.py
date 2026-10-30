# -*- coding: utf-8 -*-
from PIL import Image
import os
base = os.path.dirname(os.path.abspath(__file__))
td = os.path.join(base, '..', '_shots', 'lnktest')
names = ['c1.png', 'c2.png', 'c3.png', 'c4.png']
labels = ['1-notepad+face', '2-html+face', '3-notepad+sys', '4-REAL']
ims = []
for n in names:
    p = os.path.join(td, n)
    ims.append(Image.open(p).convert('RGB') if os.path.exists(p) else Image.new('RGB', (128,128), (40,40,40)))
W = 128 * len(ims) + 10 * (len(ims) - 1)
c = Image.new('RGB', (W, 128), (14, 17, 22))
x = 0
for im in ims:
    c.paste(im, (x, 0)); x += 138
c.save(os.path.join(base, '..', '_shots', 'ctrl-compare.png'))
print('拼图完成')
