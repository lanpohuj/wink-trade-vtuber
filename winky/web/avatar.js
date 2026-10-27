/* Winky — Студийный 3D VTuber Аватар (Оригинальный FBX Shibahu + Скелетная анимация Take 001 + Дискретные морфы) */

import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

window.THREE = THREE;

const canvas = window.canvas || document.getElementById("scene") || document.querySelector("canvas");
window.canvas = canvas;

/* ==================== 1. Рендерер и сцена ==================== */

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  premultipliedAlpha: false,
});
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.06; // Чистая сочная яркость без пересвета
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
window.scene = scene;

// Камера 28° FOV на уровне груди и глаз (прямой взгляд на зрителя, ноги ниже колен за нижним срезом окна, запас сверху 33+ px)
const camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 1.0, 1000.0);
camera.position.set(0, 120, 192);
camera.lookAt(0, 114, 0);
camera.updateProjectionMatrix();
window.camera = camera;

/* ==================== 2. Сочное студийное освещение и мягкий Rim Light ==================== */

// 1. Равномерный базовый рассеянный свет — 100% сочные цвета текстур
const ambientLight = new THREE.AmbientLight(0xffffff, 1.18);
scene.add(ambientLight);

// 2. Фронтальный свет для мягкого объема лица и куртки
const keyLight = new THREE.DirectionalLight(0xfffbf5, 0.40);
keyLight.position.set(60, 200, 250);
scene.add(keyLight);

// 3. Заполняющий холодный свет
const fillLight = new THREE.DirectionalLight(0xedf4ff, 0.25);
fillLight.position.set(-160, 120, 200);
scene.add(fillLight);

// 4. НЕОНОВЫЙ КОНТУРНЫЙ СВЕТ (Rim Light) под острым углом сзади
const rimLightLeft = new THREE.DirectionalLight(0x38bdf8, 0.85); // неоновый циан по левому контуру
rimLightLeft.position.set(-220, 160, -240);
scene.add(rimLightLeft);

const rimLightRight = new THREE.DirectionalLight(0xf472b6, 0.75); // нежный неоновый розовый по правому контуру
rimLightRight.position.set(220, 140, -240);
scene.add(rimLightRight);

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);
onResize();

// Слежение за курсором мыши (нормализованные координаты -1..1)
let mouseX = 0;
let mouseY = 0;
window.addEventListener("mousemove", (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

/* ==================== 3. Константы лицевых морфов ==================== */

// 15 полнолицевых замещающих морфов автора (в каждый кадр ТОЛЬКО ОДИН может быть 1.0, остальные строго 0.0!)
const FACE_MORPHS = [
  "face_mesh1", "face_mesh1_2", "face_mesh2",
  "face_mesh3", "face_mesh3_2", "face_mesh4", "face_mesh4_2",
  "face_mesh5", "face_mesh5_2", "face_mesh6", "face_mesh7",
  "face_mesh8", "face_mesh9", "face_mesh9_2", "face_mesh10"
];

// Пары моргания автора модели (при моргании на 130 мс переключаемся на закрытоглазый морф *_2)
const BLINK_PAIRS = {
  null: "face_mesh5_2",
  face_mesh3: "face_mesh3_2",
  face_mesh4_2: "face_mesh5_2",
  face_mesh5: "face_mesh5_2",
  face_mesh6: "face_mesh5_2",
  face_mesh7: "face_mesh5_2",
  face_mesh8: "face_mesh5_2",
  face_mesh9: "face_mesh9_2",
  face_mesh10: "face_mesh5_2",
};

/* ==================== 4. Контроллер оригинального Shibahu FBX ==================== */

class ShibahuFBXController {
  constructor(fbx) {
    this.fbx = fbx;
    this.faceMesh = null;
    this.mixer = null;

    // Находим face_mesh
    fbx.traverse((c) => {
      if (c.isMesh && c.name === "face_mesh") {
        this.faceMesh = c;
      }
    });

    // 1. Фиксация нейтральной стойки автора Take 001 на t = 0.0s (0 градусов по всем осям, строго лицом к камере)
    const rawClip = fbx.animations && fbx.animations[0];
    if (rawClip) {
      rawClip.tracks = rawClip.tracks.filter(
        (t) => !t.name.includes("morphTargetInfluences") && !t.name.includes("DeformPercent")
      );
      this.mixer = new THREE.AnimationMixer(fbx);
      const action = this.mixer.clipAction(rawClip);
      action.play();
      this.mixer.setTime(0.0); // В t = 0.0 она стоит строго лицом к зрителю без доворотов!
      this.mixer.update(0);
      action.paused = true; // Останавливаем миксер навсегда — 0% рывков из видео!
    }

    // 2. Сохраняем исходные кватернионы и позиции всех истинных костей
    this.bones = {};
    this.baseQuats = {};
    this.basePos = {};

    fbx.traverse((obj) => {
      if (obj.isBone) {
        if (!this.bones[obj.name] || (obj.parent && obj.parent.name !== obj.name)) {
          this.bones[obj.name] = obj;
          this.baseQuats[obj.name] = obj.quaternion.clone();
          this.basePos[obj.name] = obj.position.clone();
        }
      }
    });

    this.dummyEuler = new THREE.Euler();
    this.dummyQuat = new THREE.Quaternion();
    this.targetQuat = new THREE.Quaternion();

    // Режимы тела: 'idle', 'talk', 'flirt', 'dance', 'wave'
    this.bodyMode = "idle";
    this.danceTimer = 0;
    this.waveTimer = 0;
    this.flirtTimer = 0;
    this.giftReactionTimer = 0;

    // Лицо и эмоции: null = базовое лицо (открытые золотые глаза прямо в камеру + спокойная улыбка)
    this.activeFaceMorph = null;
    this.cheekWeight = 0.35;
    this.irisHighlight = 0.0;

    // Моргание каждые 2.5–4.0 сек (с 30% шансом двойного моргания)
    this.nextBlinkTime = 2.0;
    this.blinkState = 0; // 0 = открыты, 1 = первый закрытый глаз, 2 = микропауза, 3 = второй закрытый глаз
    this.blinkTimer = 0;
    this.isDoubleBlink = false;

    // Смена настроений на 2.5 сек каждые 6–8 сек с обязательным возвратом к прямому взгляду null
    this.nextMoodTime = 5.0;
    this.moodActive = false;
    this.moodTimer = 0;
    this.currentMood = null;
    this.moodList = [
      { morph: "face_mesh3", cheek: 0.50, iris: 0.2, blink: "face_mesh3_2" },   // кокетливое :3
      { morph: "face_mesh4_2", cheek: 0.40, iris: 0.1, blink: "face_mesh5_2" }, // нежная улыбка с прищуром
      { morph: "face_mesh5", cheek: 0.60, iris: 1.0, blink: "face_mesh5_2" },   // азартная улыбка со звездами в глазах
    ];
    this.moodIndex = 0;

    // Lip-Sync
    this.lipSyncTimer = 0;
    this.lipSyncToggle = false;
    this.vowelFormants = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };

    // Устанавливаем базовое лицо сразу
    this.setExclusiveFaceMorph(this.activeFaceMorph, this.cheekWeight, this.irisHighlight);
  }

  // Плавное смещение кости поверх baseQuats через slerp
  applySmoothBoneOffset(boneName, rx, ry, rz, dt, smoothSpeed = 8.0) {
    const bone = this.bones[boneName];
    const bq = this.baseQuats[boneName];
    if (!bone || !bq) return;
    this.dummyEuler.set(rx, ry, rz, "XYZ");
    this.dummyQuat.setFromEuler(this.dummyEuler);
    this.targetQuat.copy(bq).multiply(this.dummyQuat);
    bone.quaternion.slerp(this.targetQuat, 1.0 - Math.exp(-smoothSpeed * dt));
  }

  // Строго дискретное переключение морфов лица: ровно один 1.0, остальные 0.0 (или все 0.0 для null)
  setExclusiveFaceMorph(activeMorphName, cheek = null, iris = null) {
    if (!this.faceMesh) return;
    const dict = this.faceMesh.morphTargetDictionary;
    const inf = this.faceMesh.morphTargetInfluences;
    if (!dict || !inf) return;

    // 1. Обнуляем ВСЕ 15 морфов лица — 0% проваливания зубов и глаз!
    for (const name of FACE_MORPHS) {
      const idx = dict[name] ?? dict[`blendShape1.${name}`];
      if (idx !== undefined) inf[idx] = 0.0;
    }

    // 2. Включаем строго ОДИН целевой морф на 1.0 (если не null):
    if (activeMorphName) {
      const targetIdx = dict[activeMorphName] ?? dict[`blendShape1.${activeMorphName}`];
      if (targetIdx !== undefined) inf[targetIdx] = 1.0;
    }

    // 3. Аддитивные эффекты (румянец и блеск глаз):
    if (cheek !== null) this.cheekWeight = cheek;
    if (iris !== null) this.irisHighlight = iris;

    const cheekIdx = dict["facial_cheek"] ?? dict["blendShape1.facial_cheek"];
    if (cheekIdx !== undefined) inf[cheekIdx] = this.cheekWeight;

    const irisIdx = dict["facial_irisHilight_Big"] ?? dict["blendShape1.facial_irisHilight_Big"];
    if (irisIdx !== undefined) inf[irisIdx] = this.irisHighlight;
  }

  // Выразительная, живая пластика тела и рук (согнутые локти, естественное дыхание)
  updateBodyPhysics(t, dt, mode = "idle", audioRms = 0, mouseX = 0, mouseY = 0) {
    const isDance = mode === "dance";
    const isFlirt = mode === "flirt";
    const speed = isDance ? 5.2 : isFlirt ? 2.0 : 1.35;

    // 1. Бедра (Shibahu_Hips) — живое кокетливое покачивание + пружинящий bounce:
    const hipSwayZ = Math.sin(t * speed) * (isDance ? 0.14 : isFlirt ? 0.10 : 0.075) + Math.sin(t * 0.6) * 0.03;
    const hipTurnY = Math.cos(t * speed * 0.5) * (isDance ? 0.16 : 0.08);
    const hipTiltX = Math.sin(t * 2.2) * 0.03;
    this.applySmoothBoneOffset("Shibahu_Hips", hipTiltX, hipTurnY, hipSwayZ, dt, 8.0);

    if (this.bones["Shibahu_Hips"] && this.basePos["Shibahu_Hips"]) {
      const bounce = isDance ? Math.abs(Math.sin(t * speed)) * 2.2 : Math.sin(t * 2.7) * 0.7;
      this.bones["Shibahu_Hips"].position.y = this.basePos["Shibahu_Hips"].y + bounce;
    }

    // 2. Талия и Грудь (Shibahu_Spine, Spine1, Spine2) — S-образный женственный противоход бедрам и глубокое дыхание:
    const breathX = Math.sin(t * 2.4) * 0.045 - audioRms * 0.08;
    const spineCounterZ = -hipSwayZ * 0.45;
    const spineTurnY = -hipTurnY * 0.35 + (isDance ? Math.sin(t * speed) * 0.08 : 0);
    this.applySmoothBoneOffset("Shibahu_Spine", breathX * 0.5, spineTurnY * 0.5, spineCounterZ * 0.5, dt, 8.0);
    this.applySmoothBoneOffset("Shibahu_Spine1", breathX, spineTurnY, spineCounterZ, dt, 8.0);
    this.applySmoothBoneOffset("Shibahu_Spine2", breathX * 1.2, spineTurnY * 0.8, spineCounterZ * 0.8, dt, 8.0);

    // 3. Шея и Голова (Shibahu_Neck, Shibahu_Head) — смотрят ПРЯМО НА ЗРИТЕЛЯ (чуть вниз в камеру rx = +0.08),
    // мило наклоняются к плечам и кивают в такт речи:
    const headNodX = 0.08 + Math.sin(t * 1.9) * 0.05 + audioRms * 0.22 + mouseY * 0.15;
    const headTurnY = Math.sin(t * 0.75) * 0.09 + mouseX * 0.22;
    const headTiltZ = Math.sin(t * 1.1) * (isFlirt ? 0.16 : 0.10) + Math.cos(t * 0.45) * 0.05;
    this.applySmoothBoneOffset("Shibahu_Neck", headNodX * 0.4, headTurnY * 0.4, headTiltZ * 0.4, dt, 8.0);
    this.applySmoothBoneOffset("Shibahu_Head", headNodX * 0.6, headTurnY * 0.6, headTiltZ * 0.6, dt, 8.0);

    // 4. Плечи, Руки и Локти:
    const shMove = Math.sin(t * 2.4) * 0.04 + (isDance ? Math.sin(t * speed) * 0.08 : 0);
    this.applySmoothBoneOffset("Shibahu_LeftShoulder", 0, 0, shMove, dt, 8.0);

    const armSwayY = 0.18 + Math.sin(t * 1.5) * 0.08;
    const armSwayZ = -0.06 + Math.cos(t * 1.35) * 0.05;
    this.applySmoothBoneOffset("Shibahu_LeftArm", 0, armSwayY, armSwayZ, dt, 8.0);

    const leftElbowY = -0.38 - Math.sin(t * speed) * (isDance ? 0.25 : 0.10) - audioRms * 0.28;
    this.applySmoothBoneOffset("Shibahu_LeftForeArm", 0, leftElbowY, 0, dt, 8.0);
    this.applySmoothBoneOffset("Shibahu_LeftHand", 0, 0, 0.25 + Math.sin(t * 2.6) * 0.12, dt, 8.0);

    if (mode === "wave") {
      // Режим приветствия: правая рука плавно поднимается и кокетливо машет (0% клиппинга куртки)
      this.applySmoothBoneOffset("Shibahu_RightShoulder", 0, 0.15, shMove, dt, 8.0);
      this.applySmoothBoneOffset("Shibahu_RightArm", 0.35, 0.45, -0.30, dt, 10.0);
      const waveSwing = Math.sin(t * 10.0) * 0.22;
      this.applySmoothBoneOffset("Shibahu_RightForeArm", 0, -1.25 + waveSwing, 0, dt, 12.0);
      this.applySmoothBoneOffset("Shibahu_RightHand", 0, 0, 0.35 + Math.sin(t * 12.0) * 0.35, dt, 15.0);
    } else {
      this.applySmoothBoneOffset("Shibahu_RightShoulder", 0, 0, shMove, dt, 8.0);
      this.applySmoothBoneOffset("Shibahu_RightArm", 0, armSwayY, armSwayZ, dt, 8.0);
      const rightElbowY = -0.38 - Math.cos(t * speed) * (isDance ? 0.25 : 0.10) - audioRms * 0.28;
      this.applySmoothBoneOffset("Shibahu_RightForeArm", 0, rightElbowY, 0, dt, 8.0);
      this.applySmoothBoneOffset("Shibahu_RightHand", 0, 0, 0.25 + Math.cos(t * 2.6) * 0.12, dt, 8.0);
    }

    // 5. Ушки и Хвост (непрерывная живая физика):
    const earTwitch = Math.pow(Math.max(0, Math.sin(t * 3.1)), 12) * 0.22 + audioRms * 0.18;
    this.applySmoothBoneOffset("Shibahu_Ear_Left1", 0, 0, earTwitch, dt, 14.0);
    this.applySmoothBoneOffset("Shibahu_Ear_Right1", 0, 0, -earTwitch, dt, 14.0);

    for (let i = 1; i <= 6; i++) {
      const tailWave = Math.sin(t * (isDance ? 6.5 : 2.8) - i * 0.55) * (isDance ? 0.22 : 0.15);
      this.applySmoothBoneOffset(`Shibahu_Tail${i}`, 0, tailWave * 0.5, tailWave, dt, 10.0);
    }
  }

  // Обновление эмоций лица, моргания и Lip-Sync
  updateFace(t, dt, mode, isSpeaking, audioRms) {
    if (this.giftReactionTimer > 0) {
      this.giftReactionTimer -= dt;
    }

    let targetMorph = null;
    let targetCheek = 0.35;
    let targetIris = 0.0;

    if (this.giftReactionTimer > 0) {
      // Первые 1.5 сек на подарок — счастливый смех face_mesh1 со звездами в глазах!
      targetMorph = "face_mesh1";
      targetCheek = 0.85;
      targetIris = 1.0;
    } else if (isSpeaking) {
      // 1. Lip-Sync под реальный звук речи
      this.lipSyncTimer += dt;
      if (this.lipSyncTimer >= 0.09) {
        this.lipSyncTimer = 0;
        this.lipSyncToggle = !this.lipSyncToggle;
      }

      if (audioRms <= 0.03) {
        // Пауза между словами — рот строго ЗАКРЫТ (прямой взгляд null)!
        targetMorph = null;
        targetCheek = 0.35;
      } else if (audioRms < 0.12) {
        // Тихий звук — маленький ротик 'о'
        targetMorph = "face_mesh9";
        targetCheek = 0.40;
      } else {
        // Средний / громкий звук — чередование открытого рта и улыбки
        targetMorph = this.lipSyncToggle ? "face_mesh6" : "face_mesh5";
        targetCheek = 0.45;
      }
    } else {
      // 2. Покой в тишине — рот закрыт!
      // Смена настроений на 2.5 сек каждые 6-8 сек:
      if (!this.moodActive && t >= this.nextMoodTime) {
        this.moodActive = true;
        this.moodTimer = 2.5;
        this.currentMood = this.moodList[this.moodIndex];
        this.moodIndex = (this.moodIndex + 1) % this.moodList.length;
      }

      if (this.moodActive) {
        this.moodTimer -= dt;
        if (this.moodTimer <= 0) {
          this.moodActive = false;
          this.currentMood = null;
          this.nextMoodTime = t + 5.0 + Math.random() * 3.0; // следующее через 5-8 сек
        }
      }

      if (this.moodActive && this.currentMood) {
        targetMorph = this.currentMood.morph;
        targetCheek = this.currentMood.cheek;
        targetIris = this.currentMood.iris;
      } else {
        targetMorph = null; // Базовое лицо null — открытые золотые глаза прямо в камеру, закрытая улыбка
        targetCheek = 0.35;
        targetIris = 0.0;
      }

      // 3. Моргание каждые 2.5–4.0 сек (с 30% шансом двойного моргания)
      if (this.blinkState === 0) {
        if (t >= this.nextBlinkTime) {
          this.blinkState = 1;
          this.blinkTimer = 0.14;
          this.isDoubleBlink = Math.random() < 0.30;
        }
      } else if (this.blinkState === 1) {
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
          if (this.isDoubleBlink) {
            this.blinkState = 2; // микропауза между двойным морганием
            this.blinkTimer = 0.11;
          } else {
            this.blinkState = 0;
            this.nextBlinkTime = t + 2.5 + Math.random() * 1.5;
          }
        }
      } else if (this.blinkState === 2) {
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
          this.blinkState = 3; // второй закрытый глаз
          this.blinkTimer = 0.14;
        }
      } else if (this.blinkState === 3) {
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
          this.blinkState = 0;
          this.nextBlinkTime = t + 2.5 + Math.random() * 1.5;
        }
      }

      // Применение моргания:
      if (this.blinkState === 1 || this.blinkState === 3) {
        if (targetMorph === "face_mesh3") {
          targetMorph = "face_mesh3_2";
        } else {
          targetMorph = "face_mesh5_2"; // мягко закрытые глаза с улыбкой
        }
      }
    }

    if (targetMorph !== this.activeFaceMorph || targetCheek !== this.cheekWeight || targetIris !== this.irisHighlight) {
      this.activeFaceMorph = targetMorph;
      this.cheekWeight = targetCheek;
      this.irisHighlight = targetIris;
      this.setExclusiveFaceMorph(targetMorph, targetCheek, targetIris);
    }
  }

  // Реакции на события пульта и чата
  setEmotion(name, durationMs = 4500) {
    const sec = durationMs / 1000.0;
    switch (name) {
      case "happy":
        this.bodyMode = "talk";
        this.flirtTimer = 3.0;
        this.moodActive = true;
        this.moodTimer = 3.0;
        this.currentMood = { morph: "face_mesh4_2", cheek: 0.45, iris: 0.2, blink: "face_mesh5_2" };
        break;
      case "excited":
      case "win":
        this.bodyMode = "dance";
        this.danceTimer = Math.max(5.0, sec);
        this.giftReactionTimer = 1.5;
        this.cheekWeight = 0.85;
        this.irisHighlight = 1.0;
        break;
      case "flirt":
      case "blush":
        this.bodyMode = "flirt";
        this.flirtTimer = Math.max(4.0, sec);
        this.moodActive = true;
        this.moodTimer = Math.max(4.0, sec);
        this.currentMood = { morph: "face_mesh7", cheek: 0.70, iris: 0.5, blink: "face_mesh5_2" };
        break;
      case "laugh":
        this.bodyMode = "flirt";
        this.flirtTimer = 2.5;
        this.giftReactionTimer = 1.8;
        this.cheekWeight = 0.50;
        this.irisHighlight = 0.4;
        break;
      case "wave":
      case "greeting":
        this.bodyMode = "wave";
        this.waveTimer = 3.5;
        this.moodActive = true;
        this.moodTimer = 3.5;
        this.currentMood = { morph: "face_mesh5", cheek: 0.70, iris: 0.5, blink: "face_mesh5_2" };
        break;
      case "wink":
        this.bodyMode = "flirt";
        this.flirtTimer = 2.5;
        this.moodActive = true;
        this.moodTimer = 2.5;
        this.currentMood = { morph: "face_mesh9", cheek: 0.50, iris: 0.5, blink: "face_mesh9_2" };
        break;
      case "surprised":
        this.bodyMode = "talk";
        this.flirtTimer = 2.0;
        this.moodActive = true;
        this.moodTimer = 2.0;
        this.currentMood = { morph: "face_mesh10", cheek: 0.35, iris: 0.8, blink: "face_mesh5_2" };
        break;
      case "thinking":
        this.bodyMode = "talk";
        this.flirtTimer = 3.0;
        this.moodActive = true;
        this.moodTimer = 3.0;
        this.currentMood = { morph: "face_mesh3", cheek: 0.40, iris: 0.3, blink: "face_mesh3_2" };
        break;
      case "idle":
      case "neutral":
      default:
        this.bodyMode = "idle";
        this.danceTimer = 0;
        this.flirtTimer = 0;
        this.giftReactionTimer = 0;
        this.moodActive = false;
        this.currentMood = null;
        break;
    }
  }

  onGift(giftName = "") {
    this.bodyMode = "dance";
    this.danceTimer = 6.0;
    this.giftReactionTimer = 1.6;
    this.cheekWeight = 0.85;
    this.irisHighlight = 1.0;
  }

  onWin() {
    this.setEmotion("win", 6000);
  }

  wave() {
    this.setEmotion("wave", 4000);
  }

  playBodyMotion(motion) {
    if (motion === "dance" || motion === "react_dance1" || motion === "react_dance2") {
      this.bodyMode = "dance";
      this.danceTimer = 5.0;
    } else if (motion === "flirt" || motion === "react_flirt" || motion === "laugh") {
      this.bodyMode = "flirt";
      this.flirtTimer = 4.0;
    } else {
      this.bodyMode = "idle";
      this.danceTimer = 0;
      this.flirtTimer = 0;
    }
  }

  setAudioFormants(f) {
    this.vowelFormants = f;
  }

  update(delta, elapsed, isSpeaking, audioRms = 0) {
    if (this.danceTimer > 0) this.danceTimer -= delta;
    if (this.waveTimer > 0) this.waveTimer -= delta;
    if (this.flirtTimer > 0) this.flirtTimer -= delta;

    let mode = "idle";
    if (this.danceTimer > 0) {
      mode = "dance";
    } else if (this.waveTimer > 0) {
      mode = "wave";
    } else if (this.flirtTimer > 0) {
      mode = "flirt";
    } else if (isSpeaking) {
      mode = "talk";
    }

    this.bodyMode = mode;
    this.updateBodyPhysics(elapsed, delta, mode, audioRms, mouseX, mouseY);
    this.updateFace(elapsed, delta, mode, isSpeaking, audioRms);
  }
}

/* ==================== 5. Загрузка оригинального Shibahu FBX ==================== */

let fbxInstance = null;
let vtuber = null;
let baseModelY = 0.0; // В нативных координатах Maya модель стоит на Y=0
let userScale = 1.0;
let userOffsetY = 0.0;
let baseScale = 1.0; // Нативный масштаб Maya (высота модели 157 см)

function updateAvatarTransform() {
  if (!fbxInstance) return;
  fbxInstance.scale.setScalar(baseScale * userScale);
  fbxInstance.position.y = baseModelY + userOffsetY;
}

const fbxLoader = new FBXLoader();

function loadShibahuFBX() {
  window.__fbxStatus = "started";
  const texLoader = new THREE.TextureLoader();
  const tex = {
    Face_mt: texLoader.load("/model/Texture/Shibahu_face_dif.png"),
    Body_mt: texLoader.load("/model/Texture/Shibahu_body_dif.png"),
    HairA_mt: texLoader.load("/model/Texture/Shibahu_hairA_dif.png"),
    HairB_mt: texLoader.load("/model/Texture/Shibahu_hairB_dif.png"),
    CosA_mt: texLoader.load("/model/Texture/Shibahu_cosA_dif.png"),
    CosB_mt: texLoader.load("/model/Texture/Shibahu_cosB_dif.png"),
  };
  for (const k in tex) tex[k].colorSpace = THREE.SRGBColorSpace;
  const cheekTex = texLoader.load("/model/Texture/Shibahu_cheek_msk.png");

  fbxLoader.load(
    "/model/shibahu.fbx?v=" + Date.now(),
    (fbx) => {
      window.__fbxStatus = "parsing_done";
      try {
        fbxInstance = fbx;

      // Настройка мешей и сочных материалов
      function configureMaterial(m) {
        if (!m) return m;
        const matName = m.name || "";
        if (matName.toLowerCase().includes("line")) {
          m.visible = false;
          return m;
        }
        if (matName === "Cheek_mt") {
          return new THREE.MeshBasicMaterial({
            color: 0xff6688,
            alphaMap: cheekTex,
            transparent: true,
            opacity: 0.75,
          });
        }
        if (tex[matName]) {
          return new THREE.MeshToonMaterial({
            map: tex[matName],
            transparent: matName === "HairA_mt" || matName === "HairB_mt",
            alphaTest: 0.5,
          });
        }
        return m;
      }

      fbx.traverse((child) => {
        if (child.isMesh) {
          // Скрываем все паразитные контурные меши (*_line) и подиум base_mesh
          if (child.name.endsWith("_line") || child.name === "base_mesh") {
            child.visible = false;
            return;
          }

          if (Array.isArray(child.material)) {
            child.material = child.material.map(configureMaterial);
          } else if (child.material) {
            child.material = configureMaterial(child.material);
          }
        }
      });

        // Кадрирование: масштаб 1.0 (нативный Maya 157 см), центрирование по X и Z
        fbx.scale.setScalar(baseScale * userScale);
        fbx.position.set(0, baseModelY + userOffsetY, 0);
        fbx.rotation.set(0, 0, 0);

        scene.add(fbx);
        window.__fbxStatus = "instantiating_controller";
        vtuber = new ShibahuFBXController(fbx);
        window.vtuber = vtuber;
        window.activeController = vtuber;
        window.__fbxStatus = "ready";

        console.log("[Winky] Оригинальный Shibahu FBX успешно загружен: все 200+ костей активны, 0% клиппинга!");
      } catch (err) {
        window.__fbxStatus = "error_in_callback";
        window.__fbxError = err.stack || String(err);
        console.error("[Winky] Error in FBX callback:", err);
      }
    },
    (progress) => {
      window.__fbxProgress = progress;
      if (progress.total) {
        console.log(`Загрузка FBX: ${((progress.loaded / progress.total) * 100).toFixed(1)}%`);
      }
    },
    (error) => {
      window.__fbxStatus = "load_error";
      window.__fbxError = error.stack || String(error);
      console.error("[Winky] Ошибка загрузки shibahu.fbx:", error);
    }
  );
}

loadShibahuFBX();

/* ==================== 6. Аудио и речь ==================== */

let audioCtx = null;
let analyser = null;
let currentAudio = null;
let isSpeakingAudio = false;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.6;
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

["click", "keydown", "touchstart"].forEach((evt) => {
  window.addEventListener(evt, initAudioContext, { once: true });
});

function winkySpeak(mediaUrl, emotion = "happy", volume = 1.0) {
  if (vtuber) {
    vtuber.setEmotion(emotion || "happy", 6000);
  }
  return true;
}

/* ==================== 7. Внешнее API окна ==================== */

window.winkySpeak = winkySpeak;
window.winkySetEmotion = (emo) => vtuber && vtuber.setEmotion(emo, 5000);
window.winkyOnGift = (gift) => vtuber && vtuber.onGift(gift);
window.winkyOnWin = () => vtuber && vtuber.onWin();
window.winkyWave = () => vtuber && vtuber.wave();
window.winkyPlayBodyMotion = (motion) => vtuber && vtuber.playBodyMotion(motion);
window.winkySetVolume = (vol) => {
  if (currentAudio) currentAudio.volume = Math.min(1, Math.max(0, vol));
};
window.setAvatarSpeechVolume = (vol) => {
  const v = Math.min(1.0, Math.max(0.0, Number(vol) || 0));
  window.__forceAudioRms = v;
  window.__forceSpeaking = v > 0.03;
};
window.winkySetScale = (scale) => {
  userScale = Math.min(2.0, Math.max(0.4, scale));
  updateAvatarTransform();
};
window.winkySetOffsetY = (offY) => {
  userOffsetY = Math.min(1.0, Math.max(-1.0, offY));
  updateAvatarTransform();
};
window.winkyScreenshot = () => {
  renderer.render(scene, camera);
  return canvas.toDataURL("image/png");
};
window.winkySetModel = (m) => {
  console.log("[Winky] Shibahu native model active:", m);
};

// Применение нативной прозрачности WKWebView
if (window.pywebview?.api) {
  window.pywebview.api.apply_native_transparency?.();
} else {
  window.addEventListener("pywebviewready", () => {
    window.pywebview?.api?.apply_native_transparency?.();
  });
}

/* ==================== 8. Рендер-цикл ==================== */

const clock = new THREE.Clock();
const freqData = new Uint8Array(128);

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  const isSpeaking = Boolean(window.__forceSpeaking);
  const audioRms = window.__forceAudioRms !== undefined ? window.__forceAudioRms : 0;

  if (vtuber && !isSpeaking) {
    vtuber.setAudioFormants({ aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 });
  }

  if (vtuber) {
    vtuber.update(delta, elapsed, isSpeaking, audioRms);
  }

  renderer.render(scene, camera);
}

animate();
