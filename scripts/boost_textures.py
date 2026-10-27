"""Попиксельный буст яркости аутентичных текстур Shibahu (formula из AGENTS.md: p * 1.18 + 28)."""

from pathlib import Path
from PIL import Image

TEXTURE_DIR = Path("winky/web/model/Texture")

TEX_FILES = [
    "Shibahu_face_dif.png",
    "Shibahu_body_dif.png",
    "Shibahu_hairA_dif.png",
    "Shibahu_hairB_dif.png",
    "Shibahu_cosA_dif.png",
    "Shibahu_cosB_dif.png",
]

def boost_pixel(p: int) -> int:
    return min(255, max(0, int(p * 1.18 + 28)))

def process_textures():
    lut = [boost_pixel(i) for i in range(256)]
    for fname in TEX_FILES:
        src = TEXTURE_DIR / fname
        if not src.exists():
            print(f"Пропуск {fname}: файл не найден")
            continue
        im = Image.open(src)
        if im.mode == "RGBA":
            r, g, b, a = im.split()
            r = r.point(lut)
            g = g.point(lut)
            b = b.point(lut)
            out = Image.merge("RGBA", (r, g, b, a))
        else:
            im = im.convert("RGB")
            r, g, b = im.split()
            r = r.point(lut)
            g = g.point(lut)
            b = b.point(lut)
            out = Image.merge("RGB", (r, g, b))

        dst = TEXTURE_DIR / f"boosted_{fname}"
        out.save(dst, "PNG")
        print(f"Создана сочная текстура: {dst.name}")

if __name__ == "__main__":
    process_textures()
