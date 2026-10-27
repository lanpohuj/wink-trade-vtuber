#!/usr/bin/env python3
"""Скрипт для создания легковесного архива исходного кода проекта (code_snapshot.zip).

Упаковывает только текстовые файлы кода (.py, .html, .js, .css, .json, .yaml, .md и т.д.),
строго исключая любые секреты (.env), базы данных, кэши, аудио и тяжелые 3D-исходники.
"""

from __future__ import annotations

import os
from pathlib import Path
import sys
import zipfile

# Разрешённые расширения текстовых файлов
TEXT_EXTENSIONS = {
    ".py",
    ".html",
    ".js",
    ".css",
    ".json",
    ".yaml",
    ".yml",
    ".md",
    ".txt",
    ".sh",
    ".command",
}

# Специальные имена файлов, которые тоже нужно включить
EXACT_INCLUDE_FILES = {
    "Dockerfile",
    "Caddyfile",
    ".gitignore",
    ".dockerignore",
    ".env.example",
}

# Каталоги, которые обходятся стороной
EXCLUDE_DIRS = {
    ".git",
    ".venv",
    "venv",
    "ENV",
    "env",
    "__pycache__",
    "node_modules",
    ".pytest_cache",
    ".idea",
    ".vscode",
    ".gemini",
    "Winky.app",
    "shibahu",
    "data",
}

# Относительные пути, которые не должны попадать в архив
EXCLUDE_SUBPATHS = {
    "winky/web/media",
    "winky/web/model",
}


def should_include(rel_path: Path) -> bool:
    """Определяет, должен ли файл быть упакован в архив."""
    # Проверка на исключённые подпути
    rel_str = rel_path.as_posix()
    for sub in EXCLUDE_SUBPATHS:
        if rel_str == sub or rel_str.startswith(sub + "/"):
            return False

    name = rel_path.name

    # Никогда не пакуем секреты и окружение (кроме .env.example)
    if name.startswith(".env") and name != ".env.example":
        return False
    if "config_local" in name:
        return False

    # Исключаем архивы, базы данных, медиа
    if name == "code_snapshot.zip" or name.endswith(".zip") or name.endswith(".tar.gz"):
        return False
    if name.endswith((".db", ".sqlite", ".sqlite3", ".db-journal")):
        return False
    if name.endswith((".mp3", ".wav", ".ogg", ".aac", ".m4a")):
        return False
    if name.endswith((".fbx", ".vrm", ".obj", ".gltf", ".glb", ".blend")):
        return False
    if name.endswith((".png", ".jpg", ".jpeg", ".ico", ".icns")):
        return False
    if name == ".DS_Store" or name.startswith("._"):
        return False

    # Включаем по точному имени
    if name in EXACT_INCLUDE_FILES:
        return True

    # Включаем по расширению
    if rel_path.suffix.lower() in TEXT_EXTENSIONS:
        return True

    return False


def create_snapshot() -> None:
    root_dir = Path(__file__).resolve().parent
    output_zip = root_dir / "code_snapshot.zip"

    # Удаляем старый архив перед созданием, если был
    if output_zip.exists():
        output_zip.unlink()

    included_files: list[Path] = []
    total_uncompressed_bytes = 0

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Модифицируем dirnames in-place, чтобы не заходить в игнорируемые каталоги
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]

        current_dir = Path(dirpath)
        try:
            rel_dir = current_dir.relative_to(root_dir)
        except ValueError:
            continue

        # Пропускаем вложенные исключённые каталоги
        if any(rel_dir.as_posix().startswith(sub) for sub in EXCLUDE_SUBPATHS):
            continue

        for fname in sorted(filenames):
            fpath = current_dir / fname
            rel_path = fpath.relative_to(root_dir)

            if should_include(rel_path):
                included_files.append(rel_path)
                try:
                    total_uncompressed_bytes += fpath.stat().st_size
                except OSError:
                    pass

    included_files.sort()

    print(f"📦 Сборка code_snapshot.zip...")
    print(f"   Найдено файлов кода: {len(included_files)}")

    with zipfile.ZipFile(output_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for rel_file in included_files:
            abs_path = root_dir / rel_file
            zf.write(abs_path, arcname=rel_file.as_posix())

    zip_size_bytes = output_zip.stat().st_size

    print(f"✅ Архив успешно создан: {output_zip.name}")
    print(f"   Размер исходного текста: {total_uncompressed_bytes / 1024:.1f} KB")
    print(f"   Размер сжатого архива:   {zip_size_bytes / 1024:.1f} KB")
    print(f"   Файлов упаковано:        {len(included_files)}")


if __name__ == "__main__":
    create_snapshot()
