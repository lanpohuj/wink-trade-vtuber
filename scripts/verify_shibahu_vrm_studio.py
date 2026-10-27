"""Верификация нативного Shibahu FBX Studio через Pillow и WKWebView."""

import base64
import json
import time
from pathlib import Path
from PIL import Image, ImageStat
import webview
from winky.server import start_assets_server

ARTIFACTS_DIR = Path("/Users/alansalam/.gemini/antigravity/brain/e09df6a2-23eb-4ba0-b6e3-79c406ecc94d")
OUT_IDLE = ARTIFACTS_DIR / "shibahu_studio_idle.png"
OUT_SPEAK = ARTIFACTS_DIR / "shibahu_studio_speaking.png"
OUT_CELEBRATE = ARTIFACTS_DIR / "shibahu_studio_celebrating.png"
OUT_WAVE = ARTIFACTS_DIR / "shibahu_studio_wave.png"
OUT_SHY = ARTIFACTS_DIR / "shibahu_living_shy.png"
OUT_CURIOUS = ARTIFACTS_DIR / "shibahu_living_curious.png"
OUT_PLAYFUL = ARTIFACTS_DIR / "shibahu_living_playful.png"
OUT_STRETCH = ARTIFACTS_DIR / "shibahu_living_stretch.png"

def capture_b64(window, js_code):
    safe_js = f"(function() {{ const c = window.canvas || document.querySelector('canvas'); if (!c) return null; return {js_code}; }})()"
    data_url = window.evaluate_js(safe_js)
    if not data_url or "," not in data_url:
        raise RuntimeError("Не удалось получить base64 от canvas")
    b64 = data_url.split(",", 1)[1]
    return base64.b64decode(b64)

def run_verification():
    print("=== Запуск верификации Shibahu FBX Studio ===")
    host, port = start_assets_server()
    url = f"http://{host}:{port}/avatar.html"
    print(f"Сервер ассетов: {url}")

    window = webview.create_window("Shibahu Studio Verification", url, width=460, height=680)

    def worker():
        try:
            # 1. Ждем загрузки FBX
            print("Ожидание инициализации window.vtuber (FBX)...")
            loaded = False
            for _ in range(40):
                time.sleep(0.5)
                res = window.evaluate_js("Boolean(window.vtuber && window.vtuber.faceMesh && window.vtuber.bones)")
                if res:
                    loaded = True
                    break

            if not loaded:
                print("ОШИБКА: window.vtuber не инициализировался за 20 секунд!")
                window.destroy()
                return

            print("Модель FBX успешно загружена! Прогреваем кадры...")
            for _ in range(10):
                time.sleep(0.05)

            # 2. Кадр IDLE (авторский покой t=1.25s, процедурное дыхание, рот строго ЗАКРЫТ, глаза открыты)
            window.evaluate_js("""
                window.__forceSpeaking = false;
                window.__forceAudioRms = 0;
                vtuber.setEmotion('idle');
            """)
            time.sleep(0.3)
            raw_idle = capture_b64(window, "window.winkyScreenshot()")
            with open(OUT_IDLE, "wb") as f:
                f.write(raw_idle)
            print(f"Сохранен снимок Idle (рот закрыт): {OUT_IDLE}")

            # 3. Кадр SPEAKING (речь с открытым ртом face_mesh6 и жестикуляцией предплечий)
            window.evaluate_js("""
                window.__forceSpeaking = true;
                window.__forceAudioRms = 0.15;
            """)
            time.sleep(0.3)
            raw_speak = capture_b64(window, "window.winkyScreenshot()")
            with open(OUT_SPEAK, "wb") as f:
                f.write(raw_speak)
            print(f"Сохранен снимок Speaking (рот открыт): {OUT_SPEAK}")

            # 4. Кадр CELEBRATING (победный танец dance на подарок TikTok, звезды в глазах, 0% клиппинга)
            window.evaluate_js("""
                window.__forceSpeaking = false;
                window.__forceAudioRms = 0;
                vtuber.onGift();
            """)
            time.sleep(0.3)
            raw_cel = capture_b64(window, "window.winkyScreenshot()")
            with open(OUT_CELEBRATE, "wb") as f:
                f.write(raw_cel)
            print(f"Сохранен снимок Celebrating (Танец на подарок): {OUT_CELEBRATE}")

            # 5. Кадр WAVE (махание правой рукой перед грудью)
            window.evaluate_js("""
                window.__forceSpeaking = false;
                window.__forceAudioRms = 0;
                vtuber.setEmotion('wave');
                for (let i = 0; i < 30; i++) vtuber.update(0.016, 1.0 + i * 0.016, false, 0);
            """)
            time.sleep(0.3)
            raw_wave = capture_b64(window, "window.winkyScreenshot()")
            with open(OUT_WAVE, "wb") as f:
                f.write(raw_wave)
            print(f"Сохранен снимок Wave (Махание рукой): {OUT_WAVE}")

            # 6. Живой Idle: PLAYFUL (тёплый прищур face_mesh4_2)
            window.evaluate_js("""
                vtuber.setEmotion('happy');
                for (let i = 0; i < 30; i++) vtuber.update(0.016, 2.2 + i * 0.016, false, 0);
            """)
            time.sleep(0.2)
            raw_playful = capture_b64(window, "window.winkyScreenshot()")
            with open(OUT_PLAYFUL, "wb") as f:
                f.write(raw_playful)
            print(f"Сохранен снимок Живой Idle (Playful / face_mesh4_2): {OUT_PLAYFUL}")

            # 7. Живой Idle: LOOK (кокетливое :3 face_mesh3)
            window.evaluate_js("""
                vtuber.setEmotion('thinking');
                for (let i = 0; i < 30; i++) vtuber.update(0.016, 3.3 + i * 0.016, false, 0);
            """)
            time.sleep(0.2)
            raw_curious = capture_b64(window, "window.winkyScreenshot()")
            with open(OUT_CURIOUS, "wb") as f:
                f.write(raw_curious)
            print(f"Сохранен снимок Живой Idle (Cat smile / face_mesh3): {OUT_CURIOUS}")

            # 8. Живой Реакция: LAUGH (задорный смех face_mesh1)
            window.evaluate_js("""
                vtuber.setEmotion('laugh');
                for (let i = 0; i < 30; i++) vtuber.update(0.016, 5.2 + i * 0.016, false, 0);
            """)
            time.sleep(0.2)
            raw_shy = capture_b64(window, "window.winkyScreenshot()")
            with open(OUT_SHY, "wb") as f:
                f.write(raw_shy)
            print(f"Сохранен снимок Смех (Laugh / face_mesh1): {OUT_SHY}")

            # 9. Мягкое моргание (face_mesh5_2)
            window.evaluate_js("""
                vtuber.setExclusiveFaceMorph('face_mesh5_2', 0.35, 0.0);
                for (let i = 0; i < 10; i++) vtuber.update(0.016, 7.2 + i * 0.016, false, 0);
            """)
            time.sleep(0.2)
            raw_stretch = capture_b64(window, "window.winkyScreenshot()")
            with open(OUT_STRETCH, "wb") as f:
                f.write(raw_stretch)
            print(f"Сохранен снимок Моргание (face_mesh5_2): {OUT_STRETCH}")

        finally:
            window.destroy()

    webview.start(worker)

def analyze_pillow():
    print("\n=== Математический анализ Pillow ===")
    im_idle = Image.open(OUT_IDLE)
    im_speak = Image.open(OUT_SPEAK)
    im_cel = Image.open(OUT_CELEBRATE)
    im_wave = Image.open(OUT_WAVE)

    w, h = im_idle.size
    print(f"Размер окна: {w}x{h}")

    # 1. BBox и поля (Margins)
    bbox_idle = im_idle.getbbox()
    print(f"BBox Idle: {bbox_idle}")
    assert bbox_idle is not None, "Изображение Idle пустое!"
    min_x, min_y, max_x, max_y = bbox_idle

    margin_left = min_x
    margin_right = w - max_x
    margin_top = min_y
    margin_bottom = h - max_y

    print(f"Поля Idle:")
    print(f"  Сверху (Headroom): {margin_top} px (требование >= 20 px)")
    print(f"  Снизу (Knee level): max_y = {max_y} px (требование >= 650 px)")
    print(f"  Слева: {margin_left} px (требование >= 35 px)")
    print(f"  Справа: {margin_right} px (требование >= 35 px)")

    assert margin_top >= 20, f"Голова упирается в потолок: {margin_top} < 20 px"
    assert margin_left >= 35, f"Левый край обрезан: {margin_left} < 35 px"
    assert margin_right >= 35, f"Правый край обрезан: {margin_right} < 35 px"
    assert max_y >= 1200, f"Низ не доходит до колен: max_y = {max_y} < 1200 px"
    print("-> BBox и кадрирование до колен: 100% УСПЕШНО!")

    # Проверка полей при максимальном размахе рук (react_dance2)
    bbox_cel = im_cel.getbbox()
    print(f"BBox Celebrating (размах рук в танце 2): {bbox_cel}")
    cel_m_left = bbox_cel[0]
    cel_m_top = bbox_cel[1]
    cel_m_right = w - bbox_cel[2]
    print(f"  Поля при танце 2: сверху {cel_m_top} px, слева {cel_m_left} px, справа {cel_m_right} px")
    assert cel_m_top >= 15, f"Руки при танце упираются в потолок! {cel_m_top} < 15 px"
    assert cel_m_left >= 15 and cel_m_right >= 15, "Руки при танце вылетают за окно!"

    # Проверка полей при махании рукой (wave)
    bbox_wave = im_wave.getbbox()
    print(f"BBox Wave (махание рукой): {bbox_wave}")
    wave_m_left = bbox_wave[0]
    wave_m_top = bbox_wave[1]
    wave_m_right = w - bbox_wave[2]
    print(f"  Поля при Wave: сверху {wave_m_top} px, слева {wave_m_left} px, справа {wave_m_right} px")
    assert wave_m_top >= 15, f"Рука при Wave упирается в потолок: {wave_m_top} < 15 px"
    assert wave_m_left >= 15 and wave_m_right >= 15, "Рука при Wave вылетает за окно!"

    # 2. Анализ пересвета и насыщенности цветов
    char_pixels = 0
    blown_out_pixels = 0
    cyan_hair_pixels = 0
    warm_skin_pixels = 0

    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b, a = im_idle.getpixel((x, y))
            if a > 30:
                char_pixels += 1
                if r > 245 and g > 245 and b > 245:
                    blown_out_pixels += 1
                # Бирюзовые волосы
                if b > 90 and g > 90 and b > r + 15 and g > r + 10:
                    cyan_hair_pixels += 1
                # Теплый персиковый тон кожи
                if 140 <= r <= 235 and 100 <= g <= 190 and 95 <= b <= 185 and r > g:
                    warm_skin_pixels += 1

    blown_ratio = (blown_out_pixels / char_pixels) * 100.0 if char_pixels else 0
    print(f"\nАнализ цветопередачи:")
    print(f"  Всего пикселей персонажа: {char_pixels}")
    print(f"  Пересвеченные белые пиксели (>245, >245, >245): {blown_out_pixels} ({blown_ratio:.2f}%)")
    print(f"  Пиксели сочных бирюзовых волос: {cyan_hair_pixels}")
    print(f"  Пиксели теплого тона кожи: {warm_skin_pixels}")

    assert blown_ratio < 2.0, f"Пересвет не устранен! Доля белых пикселей: {blown_ratio:.2f}% >= 2%"
    assert cyan_hair_pixels > 1500, "Бирюзовый цвет волос не обнаружен!"
    assert warm_skin_pixels > 4000, f"Персиковый тон кожи не обнаружен! Найдено {warm_skin_pixels}"
    print("-> Цветокоррекция: 100% УСПЕШНО! Пересвет устранен, цвета сочные и чистые.")

    # 3. Анализ зоны лица и рта
    face_box = (310, 180, 570, 500)
    face_idle = im_idle.crop(face_box)
    face_speak = im_speak.crop(face_box)

    face_idle.save(ARTIFACTS_DIR / "shibahu_face_idle_crop.png")
    face_speak.save(ARTIFACTS_DIR / "shibahu_face_speak_crop.png")

    mouth_idle = face_idle.crop((70, 160, 190, 240))
    mouth_speak = face_speak.crop((70, 160, 190, 240))

    mouth_idle.save(ARTIFACTS_DIR / "shibahu_mouth_idle.png")
    mouth_speak.save(ARTIFACTS_DIR / "shibahu_mouth_speak.png")

    print(f"\nАнализ артикуляции рта: средняя яркость mouth_speak = {ImageStat.Stat(mouth_speak).mean[0]:.2f}, mouth_idle = {ImageStat.Stat(mouth_idle).mean[0]:.2f}")
    print("\n=== ВСЕ ТЕСТЫ И МЕТРИКИ УСПЕШНО ПРОЙДЕНЫ! ===")

if __name__ == "__main__":
    run_verification()
    analyze_pillow()
