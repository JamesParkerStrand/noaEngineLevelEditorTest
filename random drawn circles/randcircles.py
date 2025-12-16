import random
from PIL import Image, ImageDraw

WIDTH, HEIGHT = 2048, 2048
NUM_ELLIPSES = 300
MAX_RADIUS = 400

image = Image.new("RGB", (WIDTH, HEIGHT), (1,1,1))
draw = ImageDraw.Draw(image)

for _ in range(NUM_ELLIPSES):
    Off = 100
    cx = random.randint(-Off, WIDTH+Off)
    cy = random.randint(-Off, HEIGHT+Off)

    rx = random.randint(5, MAX_RADIUS)
    ry = random.randint(5, MAX_RADIUS)

    x1 = max(-Off, cx - rx)
    y1 = max(-Off, cy - ry)
    x2 = min(WIDTH+Off, cx + rx)
    y2 = min(HEIGHT+Off, cy + ry)

    gray = random.randint(80, 100)
    color = (gray, gray, gray)

    draw.ellipse([x1, y1, x2, y2], fill=color)

image.save("random_ellipses_bw.png")
print("Image saved as random_ellipses_bw.png")