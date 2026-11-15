# Отдельная лаборатория Винки

Запуск двойным кликом: `Открыть стенд.command`. Адрес: http://127.0.0.1:8794.
По умолчанию звук выключен; переключатель «Без звука» включает уже существующую запись.

Исходник берётся из `artifacts/avatar-backups/20261114-140151/avatar-before.tgz`.
Проверяются SHA256 архива и каждого из 46 файлов. Копия распаковывается только в
`.runtime/baseline`. Отсутствующий или повреждённый резерв останавливает запуск.
Тяжёлые модель, резерв и результаты проверки остаются локальными, в Git не включаются.
На другом компьютере понадобится отдельно перенести этот резерв и локальные MP3.

Слева — неизменённый исходный контроллер. Справа — тот же контроллер с экспериментальным
адаптером `candidate.mjs`. Все изменения поз, пальцев, рта и сердечки находятся в адаптере.
`winky/`, настройки, рабочие банки, история фраз и торговые модули не изменяются.
Сервер не импортирует приложение, SpeechController, StreamDirector или ChatRouter.
Нет подключения к 8765, VPS, TikTok или Fish Audio. Синтез и генерация речи отсутствуют.

Выбрать RU/EN → категорию → запись → «Сравнить на этой фразе».
Кнопки любимых движений сравнивают резерв с кандидатом без аудио.
Кулачки и поцелуй справа изменены; качание бёдрами сохранено.
Танец с поднятыми руками оставлен для диагностики, автоматически не выбирается.

Вторая доработка: приветствие состоит из подготовки, нескольких разных взмахов
и опускания; поцелуй быстрее достигает губ,
тыльная сторона кисти обращена к зрителю. Фазы вынесены в `motion-tracks.mjs`.
Вращения между фазами интерполируются кватернионами; часть разворота ладони
выполняет предплечье.

Третья доработка по одобрению владельца: смущение прикрывает рот ладонью;
добавлены тихий смех, задумчивость с пальцем у подбородка, игривое недоверие
и сердечко настоящими пальцами обеих рук. Для новых движений есть отдельные
кнопки справа и выбор в симуляции ответа чату. Готовые записи и голоса не менялись.
Большие движения автоматически заменяются кивком для слишком короткой фразы.
Кнопки просмотра закреплены над сценой и остаются видимыми при прокрутке.

В каталоге читаются активные банки и локальная приёмка, исключения и одобренные замены.
Это каталог для просмотра анимаций: контекстные ограничения торговли, цензура и ротация
не воспроизводятся. Наличие записи здесь не означает, что она допустима при любом
событии реального приложения. Отметки приёмки аудио не меняются.

Свободный ответ чата проверяется только как тип события на выбранной готовой записи.
Это симуляция маршрута, а не сгенерированный ответ или тест живого TikTok.

Проверки:

```bash
node --test experiments/winky_avatar/policy.test.mjs
.venv/bin/python -m py_compile experiments/winky_avatar/serve.py
# Нужен доступный Playwright; его установка не требуется рабочему приложению.
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node experiments/winky_avatar/verify.cjs
# Сравнение с предыдущим стендом ffbc79c; --export также сохраняет видео 30 FPS.
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node experiments/winky_avatar/review-motions.cjs --export
# Пять движений третьей доработки: проверка реального перекрытия рта и формы сердечка.
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node experiments/winky_avatar/review-expressions.cjs --export
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node experiments/winky_avatar/verify-expressions-speech.cjs
```

Браузерная проверка использует реальную FBX и существующие MP3 с отключённым звуком.
Проверяет RMS, паузу и конец речи, положение больших пальцев, рот при поцелуе,
сердечки, сохранность качания бёдрами и отсутствие запросов вне стенда.
Результаты и снимки: `.runtime/browser-verification.json` и `.runtime/*.png`.
Полный разбор и границы приёмки: `docs/avatar-audit/analysis.md`.
Уточнения второй доработки: `docs/avatar-audit/revision-2.md`.
Третья доработка: `docs/avatar-audit/revision-3.md`.

Четвёртая доработка: указательный палец касается кожи подбородка, добавлен
лёгкий прищур без деформации рта. Синхронизация расширена на весь читаемый
каталог: 1543 записи и 575 текстовых вариантов из всех известных источников.
Внизу стенда есть выбор источника/шаблона и симуляция произвольного ответа.
У текста без готового аудио — явный беззвучный просмотр, без синтеза.

Жест следует времени записи и фиксируется на паузе; артикуляция останавливается.
Поцелуй выполняется после окончания речи и отменяется новой репликой или Stop.
Старые и новые жесты чередуются по смыслу с интервалом между крупными движениями.
Рабочая очередь SpeechController и живой TikTok к кандидату не подключены.
Подробности, таблица маршрутов и ограничения: `docs/avatar-audit/revision-4.md`.

Дополнительные проверки при запущенном стенде:

```bash
node --test experiments/winky_avatar/policy.test.mjs experiments/winky_avatar/sync.test.mjs
.venv/bin/python experiments/winky_avatar/test_sync_catalog.py
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node experiments/winky_avatar/verify-sync.cjs
```

Актуальные снимки, полный реестр и экспорт новых движений: `.runtime/revision-4`.

Текущая доработка: `framing.mjs` сохраняет крупный план с полностью видимыми
руками при масштабе и изменении размеров окна. `idle.mjs` управляет тихой жизнью:
свободная пауза, внимание к графику, ожидание голоса и поддержка после неудачи.
В верхней части стенда есть масштаб, переключатель живости и симуляция сцены.
Это не управление торговлей. В длинных фразах появился второй небольшой жест.

```bash
node --test experiments/winky_avatar/idle.test.mjs experiments/winky_avatar/policy.test.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node experiments/winky_avatar/review-framing-idle.cjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node experiments/winky_avatar/export-idle.cjs
# Нативный тест с существующей записью, без синтеза и TikTok:
.venv/bin/python tools/verify_avatar_framing_idle.py
```

Результаты и ролик: `.runtime/framing-idle`. Подробности и ограничения —
`docs/avatar-audit/framing-idle.md`.

Радость на закрытый плюс: `celebration.mjs` получает только факты результата.
Полный круг из пяти движений: новые прыжки/взмахи над головой, кулачки, бёдра,
сердечко. В пределах круга и на стыке нет повторов. Кнопка «Симулировать плюс»
показывает следующую реакцию без торговли и синтеза. `victory-motions.mjs`
содержит позы, откалиброванные на замороженной FBX. Проверки и ролик:

```bash
node --test experiments/winky_avatar/celebration.test.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node experiments/winky_avatar/review-wins.cjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node experiments/winky_avatar/export-wins.cjs
.venv/bin/python tools/verify_avatar_wins.py
```

Материалы: `.runtime/win-reactions`, разбор: `docs/avatar-audit/win-reactions.md`.

Исправление по видео владельца: кадр больше не следует текущей позе. Постоянный
запас рассчитан для всего движения, включая переход рук вверх и оба прыжка.
Камера пересчитывается только при смене масштаба, Y или размера окна.
Проверка всех 15 движений и неподвижности камеры:

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node experiments/winky_avatar/review-fixed-framing.cjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node experiments/winky_avatar/export-fixed-framing.cjs
WINKY_VERIFY_FIXED_FRAMING=1 .venv/bin/python tools/verify_avatar_wins.py
```

Ролик и результаты: `.runtime/fixed-framing`, разбор: `docs/avatar-audit/fixed-framing.md`.
