import numpy as np
from PIL import Image
import csv

def load_image_array(path):
    """
    Load an image and return it as a NumPy array (H, W, C).
    """
    img = Image.open(path).convert("RGB")
    return np.array(img)

levelMap = load_image_array("levelMapTransParent.png")
heightmap = load_image_array("imgMap.png")

HEIGHT, WIDTH, _ = levelMap.shape

def fence(row, col, writer):
    h = int(heightmap[row][col][0])
    for i in range(5):
        writer.writerow([col, h + i - 1, row, 3])

def road(row, col, writer):
    h = int(heightmap[row][col][0])
    writer.writerow([col, h - 1, row, 1])

def building(row, col, writer):
    h = int(heightmap[row, col, 0])

    # Edge check
    if row == 0 or row == HEIGHT - 1 or col == 0 or col == WIDTH - 1:
        for i in range(11):
            writer.writerow([col, h + i - 1, row, 2])
        return

    left   = tuple(levelMap[row - 1, col])
    right  = tuple(levelMap[row + 1, col])
    top    = tuple(levelMap[row, col - 1])
    bottom = tuple(levelMap[row, col + 1])

    if (left == (8, 0, 255) and
        right == (8, 0, 255) and
        top == (8, 0, 255) and
        bottom == (8, 0, 255)):
        writer.writerow([col, h + 9, row, 2])
    else:
        for i in range(11):
            writer.writerow([col, h + i - 1, row, 2])

ids = {(255,0,0): 1, (8,0,255): 2, (255,255,0):3}

functionInstruction = {2:building, 1:road,3:fence}

with open("data.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["x", "y", "z", "id"])
    for i in range(len(levelMap)):
        for j in range(len(levelMap[i])):
            r,g,b = levelMap[i][j]
            if (int(r),int(g),int(b)) in ids:
                functionInstruction[ids[(r,g,b)]](i,j,writer)

print(ids)