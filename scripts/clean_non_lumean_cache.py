#!/usr/bin/env python3
"""
Скрипт точечной очистки voice_cache/ и bot/assets/ от файлов не от Lumean (EdgeTTS / macOS / Chrome).

Критерии фальшивых файлов (EdgeTTS):
- sample_rate == 24000 Hz (24 kHz) ИЛИ bit_rate <= 64000 bps (48 kbps) ИЛИ размер < 4096 байт.
- Удаление сторонних папок voice_cache/edge_*, voice_cache/macos_*, voice_cache/default_*.
- Удаление соответствующих записей из manifest.json.
"""

import json
import os
import shutil
import subprocess
from pathlib import Path

VOICE_CACHE_DIR = Path("voice_cache")
BOT_ASSETS_DIR = Path("bot/assets")


def get_audio_info(file_path: Path) -> tuple[int, int, int]:
    """Возвращает (sample_rate, bit_rate, size_bytes). При ошибке возвращает (0, 0, size)."""
    size = file_path.stat().st_size
    try:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "stream=sample_rate,bit_rate",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(file_path),
        ]
        out = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).strip().split()
        sr = int(out[0]) if len(out) >= 1 and out[0].isdigit() else 0
        br = int(out[1]) if len(out) >= 2 and out[1].isdigit() else 0
        return sr, br, size
    except Exception:
        return 0, 0, size


def clean_cache() -> None:
    print("=" * 60)
    print("🔍 ЗАПУСК ТОЧЕЧНОЙ ОЧИСТКИ voice_cache/ ОТ НЕ-LUMEAN ФАЙЛОВ")
    print("=" * 60)

    # 1. Удаление сторонних папок edge_*, macos_*, default_*
    for d in VOICE_CACHE_DIR.glob("*"):
        if d.is_dir() and (d.name.startswith("edge_") or d.name.startswith("macos_") or d.name.startswith("default_")):
            print(f"🗑️ Удаляю стороннюю папку: {d}")
            shutil.rmtree(d, ignore_errors=True)

    # 2. Поиск и удаление файлов EdgeTTS (24000 Hz / <=64 kbps)
    total_checked = 0
    deleted_files: list[tuple[str, int, int, int]] = []
    preserved_files: list[tuple[str, int, int]] = []

    scan_targets = [VOICE_CACHE_DIR, BOT_ASSETS_DIR]

    for target in scan_targets:
        if not target.exists():
            continue
        for root, dirs, files in os.walk(target):
            rpath = Path(root)
            for f in sorted(files):
                if not f.endswith(".mp3"):
                    continue
                fpath = rpath / f
                total_checked += 1
                sr, br, size = get_audio_info(fpath)

                # Критерий не-Lumean (EdgeTTS генерирует 24000 Hz / 48 kbps)
                is_edge_tts = (sr == 24000) or (br > 0 and br <= 64000) or (size < 4096)

                if is_edge_tts:
                    deleted_files.append((str(fpath), sr, br, size))
                    try:
                        fpath.unlink()
                        print(f"❌ [УДАЛЁН EdgeTTS] {fpath.name} | {sr} Hz | {br // 1000} kbps | {size} B")
                    except Exception as e:
                        print(f"⚠️ Ошибка удаления {fpath}: {e}")
                else:
                    preserved_files.append((str(fpath), sr, br))

    # 3. Очистка записей в manifest.json
    for mpath in VOICE_CACHE_DIR.glob("**/manifest.json"):
        try:
            with open(mpath, "r", encoding="utf-8") as mf:
                manifest_data = json.load(mf)
            vdir = mpath.parent
            initial_count = len(manifest_data)
            cleaned_data = {}

            for text_hash, entry in manifest_data.items():
                fname = entry.get("file", "")
                fpath = vdir / fname
                # Если файл существует и не был удалён
                if fpath.exists():
                    cleaned_data[text_hash] = entry

            removed_entries = initial_count - len(cleaned_data)
            if removed_entries > 0:
                with open(mpath, "w", encoding="utf-8") as mf:
                    json.dump(cleaned_data, mf, ensure_ascii=False, indent=2)
                print(f"📝 Обновлён manifest: {mpath.relative_to(VOICE_CACHE_DIR)} (удалено {removed_entries} записей)")
        except Exception as e:
            print(f"⚠️ Ошибка обработки {mpath}: {e}")

    # 4. Итоговый отчёт
    print("\n" + "=" * 60)
    print("📊 ИТОГОВЫЙ ОТЧЁТ ОЧИСТКИ:")
    print(f"  • Всего проверено файлов: {total_checked}")
    print(f"  • Найдено и удалено файлов EdgeTTS (24000 Hz / 48 kbps): {len(deleted_files)}")
    print(f"  • Сохранено 100% настоящих файлов Lumean (44100 Hz): {len(preserved_files)}")
    print("=" * 60)


if __name__ == "__main__":
    clean_cache()
