from PIL import Image, ImageChops
import os

src = "frontend/public/logo-original.png"
img = Image.open(src).convert("RGB")

fond = Image.new("RGB", img.size, (255, 255, 255))
diff = ImageChops.difference(img, fond).convert("L")
boite = diff.point(lambda p: 255 if p > 12 else 0).getbbox()

m = 12
boite = (max(0, boite[0] - m), max(0, boite[1] - m),
         min(img.width, boite[2] + m), min(img.height, boite[3] + m))

img = img.crop(boite)
img.thumbnail((600, 600), Image.LANCZOS)
img.save("frontend/public/logo.png", "PNG", optimize=True)

taille = os.path.getsize("frontend/public/logo.png") / 1024
print(f"{img.width}x{img.height} px, {taille:.0f} Ko")
