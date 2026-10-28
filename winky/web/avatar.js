/* Winky — Студийный 3D VTuber Аватар (Оригинальный FBX Shibahu + Кинематика slerp + EMOTION_MAP + Хирургический липсинк) */

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

// Камера 28° FOV на уровне груди и глаз (прямой взгляд на зрителя, руки свободно помещаются в окне)
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

/* ==================== 3. Хирургическое разделение морфов и пресеты эмоций ==================== */

// Разделение морфов лица автора по линии Y = 138.3:
// Ниже 138.3 — строго рот, губы, зубы, язык и челюсть
// Выше 138.3 — строго глаза, веки и брови
function setupSurgicalFaceMorphs(faceMesh) {
  if (!faceMesh || !faceMesh.geometry || !faceMesh.geometry.morphAttributes || !faceMesh.geometry.morphAttributes.position) return;
  const posAttr = faceMesh.geometry.attributes.position;
  const morphAttrs = faceMesh.geometry.morphAttributes.position;
  const dict = faceMesh.morphTargetDictionary || {};
  const isRelative = !!faceMesh.geometry.morphTargetsRelative;

  console.log(`[Winky Morph Surgery] Разделение морфов по Y = 138.3. Вершин: ${posAttr.count}, isRelative: ${isRelative}`);

  // 1. Чисто ротовые морфы — обнуляем всё выше Y = 138.3 (чтобы рот НИКОГДА не трогал глаза):
  const mouthOnlyMorphs = ["face_mesh1", "face_mesh3", "face_mesh4_2", "face_mesh6", "face_mesh9"];
  for (const name of mouthOnlyMorphs) {
    const idx = dict[name] !== undefined ? dict[name] : dict[`blendShape1.${name}`];
    if (idx === undefined || !morphAttrs[idx]) continue;
    const mAttr = morphAttrs[idx];
    for (let i = 0; i < posAttr.count; i++) {
      const by = posAttr.getY(i);
      if (by >= 138.3) {
        mAttr.setXYZ(i, isRelative ? 0 : posAttr.getX(i), isRelative ? 0 : by, isRelative ? 0 : posAttr.getZ(i));
      }
    }
    mAttr.needsUpdate = true;
  }

  // 2. Чисто глазные/бровные морфы — обнуляем всё ниже Y = 138.3 (чтобы глаза НИКОГДА не кривили губы!):
  const eyeOnlyMorphs = [
    "face_mesh1_2", "face_mesh2", "face_mesh3_2", "face_mesh4",
    "face_mesh5", "face_mesh5_2", "face_mesh7", "face_mesh8",
    "face_mesh9_2", "face_mesh10"
  ];
  for (const name of eyeOnlyMorphs) {
    const idx = dict[name] !== undefined ? dict[name] : dict[`blendShape1.${name}`];
    if (idx === undefined || !morphAttrs[idx]) continue;
    const eAttr = morphAttrs[idx];
    for (let i = 0; i < posAttr.count; i++) {
      const by = posAttr.getY(i);
      if (by < 138.3) {
        eAttr.setXYZ(i, isRelative ? 0 : posAttr.getX(i), isRelative ? 0 : by, isRelative ? 0 : posAttr.getZ(i));
      }
    }
    eAttr.needsUpdate = true;
  }
}

// Таблица 9 эмоций для пульта (глаза, форма рта в покое, наклон головы)
const EMOTION_MAP = {
  idle:      { eyes: { facial_irisHilight_Big: 0.35 },                                      mouth: { face_mesh4_2: 0.55 }, head: [0.0, 0.0, 0.0] },
  neutral:   { eyes: { facial_irisHilight_Big: 0.25 },                                      mouth: { face_mesh4_2: 0.35 }, head: [0.0, 0.0, 0.0] },
  happy:     { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.65 },                   mouth: { face_mesh1: 0.75 },   head: [-0.03, 0.0, 0.06] },
  blush:     { eyes: { facial_irisHilight_Big: 0.9, facial_cheek: 1.0, face_mesh2: 0.25 },  mouth: { face_mesh3: 0.95 },   head: [0.05, 0.0, -0.08] },
  excited:   { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.85 },                   mouth: { face_mesh1: 0.90 },   head: [-0.05, 0.0, 0.05] },
  wink:      { eyes: { face_mesh2: 0.70, facial_cheek: 0.7, facial_irisHilight_Big: 1.0 },  mouth: { face_mesh3: 0.95 },   head: [0.02, 0.0, -0.12] },
  wave:      { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.80 },                   mouth: { face_mesh1: 0.80 },   head: [-0.03, 0.0, -0.11] },
  win:       { eyes: { face_mesh1_2: 0.85, facial_cheek: 1.0, facial_irisHilight_Big: 1.0 },mouth: { face_mesh1: 0.90 },   head: [-0.06, 0.0, 0.08] },
  surprised: { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.35 },                   mouth: { face_mesh9: 0.95 },   head: [-0.06, 0.0, 0.0] },
  thinking:  { eyes: { face_mesh7: 0.80 },                                                  mouth: { face_mesh9: 0.40 },   head: [0.04, 0.06, 0.11] },
};

// Временные переменные для slerp без аллокаций в рендер-цикле
const _tmpEuler = new THREE.Euler(0, 0, 0, "XYZ");
const _tmpQuat = new THREE.Quaternion();

/* ==================== 4. Контроллер оригинального Shibahu FBX ==================== */

class ShibahuFBXController {
  constructor(fbx) {
    this.fbx = fbx;
    this.faceMesh = null;

    // Находим face_mesh и сразу оперируем блендшейпы по Y = 138.3
    fbx.traverse((c) => {
      if (c.isMesh && c.name === "face_mesh") {
        this.faceMesh = c;
      }
    });
    if (this.faceMesh) {
      setupSurgicalFaceMorphs(this.faceMesh);
    }

    // Сохраняем исходные базовые углы (baseRotations) и позиции (basePositions) костей в прямой фронтальной позе
    this.bones = {};
    this.baseRotations = {};
    this.basePositions = {};

    fbx.traverse((obj) => {
      if (obj.isBone) {
        if (!this.bones[obj.name] || (obj.parent && obj.parent.name !== obj.name)) {
          this.bones[obj.name] = obj;
          this.baseRotations[obj.name] = { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z };
          this.basePositions[obj.name] = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
        }
      }
    });

    // Режимы и таймеры
    this.currentEmotion = "idle";
    this.emotionResetTimer = 0.0;
    this.waveTimer = 0;
    this.giftReactionTimer = 0;

    // Параметры лица и Lip-Sync
    this.smoothedRms = 0.0;
    this.targetRms = 0.0;
    this.nextBlinkInterval = 3.5;
    this.blinkTimer = 0.0;
    this.blinkProgress = 0.0;
    this.isBlinking = false;
  }

  // Плавная сферическая интерполяция кватернионов (slerp) без Gimbal Lock:
  lerpBoneOffset(boneName, tx, ty, tz, dt, speed = 8.0) {
    const bone = this.bones[boneName];
    const base = this.baseRotations[boneName];
    if (!bone || !base) return;
    _tmpEuler.set(base.x + tx, base.y + ty, base.z + tz, "XYZ");
    _tmpQuat.setFromEuler(_tmpEuler);
    bone.quaternion.slerp(_tmpQuat, Math.min(1.0, dt * speed));
  }

  // Управление пальцами в покое и при речи (Index, Middle, Ring, Pinky, Thumb 1..3)
  setFingerRotations(side, targetTz, dt) {
    const fingers = ["Index", "Middle", "Ring", "Pinky"];
    for (const f of fingers) {
      for (let i = 1; i <= 3; i++) {
        const boneName = `Shibahu_${side}Hand${f}${i}`;
        this.lerpBoneOffset(boneName, 0.0, 0.0, targetTz, dt, 8.0);
      }
    }
    for (let i = 1; i <= 3; i++) {
      const thumbName = `Shibahu_${side}HandThumb${i}`;
      this.lerpBoneOffset(thumbName, 0.0, targetTz * 0.5, 0.0, dt, 8.0);
    }
  }

  // Живые расслабленные пальчики с мягкой волной при махании рукой
  setWaveFingerRotations(side, t, dt) {
    const fingers = ["Index", "Middle", "Ring", "Pinky"];
    fingers.forEach((f, idx) => {
      const fWave = Math.sin(t * 6.0 + idx * 0.35) * 0.05;
      for (let i = 1; i <= 3; i++) {
        const boneName = `Shibahu_${side}Hand${f}${i}`;
        this.lerpBoneOffset(boneName, 0.0, 0.0, 0.05 + fWave, dt, 8.0);
      }
    });
    for (let i = 1; i <= 3; i++) {
      const thumbName = `Shibahu_${side}HandThumb${i}`;
      this.lerpBoneOffset(thumbName, 0.0, 0.04, 0.0, dt, 8.0);
    }
  }

  // Плавная установка веса морфа (lerp)
  smoothSetMorph(morphName, targetWeight, dt, speed = 20.0) {
    if (!this.faceMesh) return;
    const dict = this.faceMesh.morphTargetDictionary;
    const inf = this.faceMesh.morphTargetInfluences;
    if (!dict || !inf) return;
    const idx = dict[morphName] !== undefined ? dict[morphName] : dict[`blendShape1.${morphName}`];
    if (idx === undefined) return;
    const current = inf[idx] || 0.0;
    const factor = 1.0 - Math.exp(-speed * dt);
    inf[idx] = current + (targetWeight - current) * factor;
  }

  // Живая пластика тела, кинематика махания рукой (wave) и жестикуляция рассказчика
  updateBodyPhysics(t, dt, isSpeaking, mouseX = 0, mouseY = 0) {
    const isTalking = isSpeaking && this.smoothedRms > 0.025;
    const activeEmotion = this.waveTimer > 0 ? "wave" : (this.currentEmotion || "idle");
    const emoCfg = EMOTION_MAP[activeEmotion] || EMOTION_MAP.idle;
    const head = emoCfg.head || [0.0, 0.0, 0.0];

    // 1. Бедра (Shibahu_Hips) — мягкое женственное покачивание:
    const hipTurnY = Math.sin(t * 1.1) * 0.03;
    const hipSwayZ = Math.cos(t * 1.1) * 0.025;
    this.lerpBoneOffset("Shibahu_Hips", 0.0, hipTurnY, hipSwayZ, dt, 7.0);

    if (this.bones["Shibahu_Hips"] && this.basePositions["Shibahu_Hips"]) {
      const bounce = Math.sin(t * 2.2) * 0.5;
      this.bones["Shibahu_Hips"].position.y = this.basePositions["Shibahu_Hips"].y + bounce;
    }

    // 2. Позвоночник (Shibahu_Spine, Spine1, Spine2) — плавное дыхание:
    const breathSpine = Math.sin(t * 1.8) * 0.02 + (isTalking ? 0.03 : 0.0);
    const swaySpine = Math.sin(t * 1.1) * 0.02;
    this.lerpBoneOffset("Shibahu_Spine", breathSpine * 0.5, 0.0, swaySpine * 0.5, dt, 7.0);
    this.lerpBoneOffset("Shibahu_Spine1", breathSpine, 0.0, swaySpine, dt, 7.0);
    this.lerpBoneOffset("Shibahu_Spine2", breathSpine * 1.1, 0.0, swaySpine, dt, 7.0);

    // 3. Шея и Голова — базовый наклон из EMOTION_MAP + дыхание + мышь:
    const headTx = head[0] + Math.sin(t * 1.5) * 0.03 + (isTalking ? this.smoothedRms * 0.12 : 0) + mouseY * 0.10;
    const headTy = head[1] + Math.sin(t * 0.9) * 0.05 + mouseX * 0.18;
    const headTz = head[2] + Math.cos(t * 1.2) * 0.04;

    this.lerpBoneOffset("Shibahu_Neck", headTx * 0.4, headTy * 0.4, headTz * 0.4, dt, 7.0);
    this.lerpBoneOffset("Shibahu_Head", headTx * 0.6, headTy * 0.6, headTz * 0.6, dt, 7.0);

    // 4. Плечи:
    const shSway = Math.sin(t * 1.8) * 0.02;
    this.lerpBoneOffset("Shibahu_LeftShoulder", 0.0, 0.0, shSway, dt, 7.0);
    this.lerpBoneOffset("Shibahu_RightShoulder", 0.0, 0.0, shSway, dt, 7.0);

    // 5. Руки, кисти и пальцы:
    if (this.waveTimer > 0) {
      // Приветствие / махание рукой (3.0 сек) — подъем перед правым плечом, открытая ладонь
      const sway = Math.sin(t * 6.0) * 0.18;             // Мягкое качание предплечья влево-вправо
      const wristWave = Math.sin(t * 6.0 - 0.65) * 0.30; // Гибкий взмах кистью с отставанием по фазе
      const wristNod  = Math.cos(t * 12.0) * 0.06;       // Легкая живая игра кисти

      this.lerpBoneOffset("Shibahu_RightShoulder", 0.0, 0.0, 0.10 + Math.sin(t * 6.0) * 0.03, dt, 7.0);
      this.lerpBoneOffset("Shibahu_RightArm", -0.60, 0.28, 0.20 + Math.sin(t * 6.0) * 0.04, dt, 7.0);
      this.lerpBoneOffset("Shibahu_RightForeArm", 1.75, -0.35 + sway, 2.15, dt, 8.0);
      this.lerpBoneOffset("Shibahu_RightHand", wristNod, wristWave, 0.0, dt, 10.0);

      // Живые расслабленные пальчики с легкой волной (НЕ плоская доска!):
      this.setWaveFingerRotations("Right", t, dt);

      // Левая рука спокойно и свободно опущена снаружи от бедра
      this.lerpBoneOffset("Shibahu_LeftArm", 0.0, 0.0, 0.03 + Math.sin(t * 1.5) * 0.015, dt, 6.0);
      this.lerpBoneOffset("Shibahu_LeftForeArm", 0.0, -0.12 + Math.cos(t * 1.5) * 0.03, 0.0, dt, 6.0);
      this.lerpBoneOffset("Shibahu_LeftHand", 0.0, 0.0, 0.0, dt, 6.0);
      this.setFingerRotations("Left", -0.20 + Math.sin(t * 1.8) * 0.04, dt);

    } else if (isTalking) {
      // Речь: мягкая симметричная жестикуляция предплечьями ПЕРЕД талией (снаружи от бедер):
      this.lerpBoneOffset("Shibahu_RightArm", 0.0, +0.06, +0.05, dt, 7.0);
      this.lerpBoneOffset(
        "Shibahu_RightForeArm",
        0.0,
        -0.38 - this.smoothedRms * 0.20 + Math.sin(t * 3.1) * 0.08,
        0.0,
        dt,
        7.0
      );
      this.lerpBoneOffset("Shibahu_RightHand", 0.0, 0.0, Math.sin(t * 2.8) * 0.08, dt, 7.0);

      this.lerpBoneOffset("Shibahu_LeftArm", 0.0, -0.06, +0.05, dt, 7.0);
      this.lerpBoneOffset(
        "Shibahu_LeftForeArm",
        0.0,
        -0.38 - this.smoothedRms * 0.16 + Math.cos(t * 2.7) * 0.07,
        0.0,
        dt,
        7.0
      );
      this.lerpBoneOffset("Shibahu_LeftHand", 0.0, 0.0, Math.cos(t * 2.8) * 0.08, dt, 7.0);

      const fingerCurl = -0.20 + Math.sin(t * 1.8) * 0.04;
      this.setFingerRotations("Right", fingerCurl, dt);
      this.setFingerRotations("Left", fingerCurl, dt);

    } else {
      // Покой: руки свободно висят снаружи от бедер и шорт (не проваливаются внутрь ног!):
      this.lerpBoneOffset("Shibahu_RightArm", 0.0, 0.0, +0.03 + Math.sin(t * 1.5) * 0.015, dt, 6.0);
      this.lerpBoneOffset("Shibahu_RightForeArm", 0.0, -0.12 + Math.sin(t * 1.6) * 0.03, 0.0, dt, 6.0);
      this.lerpBoneOffset("Shibahu_RightHand", 0.0, 0.0, 0.0, dt, 6.0);

      this.lerpBoneOffset("Shibahu_LeftArm", 0.0, 0.0, +0.03 + Math.sin(t * 1.5) * 0.015, dt, 6.0);
      this.lerpBoneOffset("Shibahu_LeftForeArm", 0.0, -0.12 + Math.cos(t * 1.5) * 0.03, 0.0, dt, 6.0);
      this.lerpBoneOffset("Shibahu_LeftHand", 0.0, 0.0, 0.0, dt, 6.0);

      const fingerCurl = -0.20 + Math.sin(t * 1.8) * 0.04;
      this.setFingerRotations("Right", fingerCurl, dt);
      this.setFingerRotations("Left", fingerCurl, dt);
    }

    // 6. Ушки и Хвост:
    const earTwitch = Math.pow(Math.max(0, Math.sin(t * 3.1)), 12) * 0.20 + (isTalking ? this.smoothedRms * 0.15 : 0.0);
    this.lerpBoneOffset("Shibahu_Ear_Left1", 0.0, 0.0, earTwitch, dt, 12.0);
    this.lerpBoneOffset("Shibahu_Ear_Right1", 0.0, 0.0, -earTwitch, dt, 12.0);

    const tailSpeed = isTalking ? 3.5 : 2.2;
    const tailMult = isTalking ? 1.4 : 1.0;
    for (let i = 1; i <= 6; i++) {
      const tailWave = Math.sin(t * tailSpeed - i * 0.5) * 0.14 * tailMult;
      this.lerpBoneOffset(`Shibahu_Tail${i}`, 0.0, tailWave * 0.4, tailWave, dt, 8.0);
    }
  }

  // Обновление эмоций лица, моргания и Lip-Sync на 60 FPS
  updateFace(t, dt, isSpeaking, audioRms) {
    if (this.giftReactionTimer > 0) {
      this.giftReactionTimer -= dt;
    }

    const activeEmotion = this.waveTimer > 0 ? "wave" : (this.currentEmotion || "idle");
    const emoCfg = EMOTION_MAP[activeEmotion] || EMOTION_MAP.idle;

    // 1. Сглаживание RMS звука для многофазной артикуляции:
    this.targetRms = Math.max(0.0, Number(audioRms) || 0.0);
    const lerpSpeed = this.targetRms > this.smoothedRms ? 22.0 : 14.0;
    this.smoothedRms += (this.targetRms - this.smoothedRms) * Math.min(1.0, dt * lerpSpeed);
    const isTalking = isSpeaking && this.smoothedRms > 0.025;

    // 2. Морфы глаз и щек ВСЕГДА стремятся к значениям текущей эмоции:
    const EYE_CHEEK_MORPHS = [
      "face_mesh1_2",
      "face_mesh2",
      "face_mesh7",
      "face_mesh10",
      "facial_cheek",
      "facial_irisHilight_Big",
    ];
    for (const name of EYE_CHEEK_MORPHS) {
      let target = emoCfg.eyes[name] || 0.0;
      // ЖЕСТКОЕ ПРАВИЛО ПРИ РЕЧИ:
      // Когда она говорит (smoothedRms > 0.025), принудительно держи face_mesh1_2 = 0.0 и face_mesh2 = 0.0
      // (чтобы во время разговора её золотые глаза ВСЕГДА были открыты и смотрели на зрителя)
      if (isTalking && (name === "face_mesh1_2" || name === "face_mesh2")) {
        target = 0.0;
      }
      this.smoothSetMorph(name, target, dt, 12.0);
    }

    // 3. Моргание (face_mesh8):
    const isEyeClosed = (emoCfg.eyes.face_mesh1_2 || 0) > 0.4 || (emoCfg.eyes.face_mesh2 || 0) > 0.4;
    let blinkTarget = 0.0;
    if (!isEyeClosed) {
      this.blinkTimer += dt;
      if (this.blinkTimer >= this.nextBlinkInterval) {
        this.isBlinking = true;
        this.blinkProgress = 0.0;
        this.blinkTimer = 0.0;
        this.nextBlinkInterval = 3.5 + Math.random() * 2.0;
      }
      if (this.isBlinking) {
        this.blinkProgress += dt / 0.16;
        if (this.blinkProgress >= 1.0) {
          this.isBlinking = false;
        } else {
          blinkTarget = Math.sin(this.blinkProgress * Math.PI);
        }
      }
    } else {
      this.isBlinking = false;
      this.blinkProgress = 0.0;
    }
    this.smoothSetMorph("face_mesh8", blinkTarget, dt, 35.0);

    // 4. Морфы рта:
    this.smoothSetMorph("face_mesh5", 0.0, dt, 20.0); // Полный запрет оскала face_mesh5!
    this.smoothSetMorph("face_mesh4", 0.0, dt, 20.0); // Полный запрет оскала face_mesh4!

    if (isTalking) {
      const mouthOpen = Math.min(1.0, Math.pow(this.smoothedRms * 1.9, 0.85));
      const syllableWave = 0.5 + 0.5 * Math.sin(t * 13.5);
      const subWave = 0.5 + 0.5 * Math.cos(t * 9.2);

      const targetMouthA = mouthOpen * (0.35 + 0.50 * syllableWave); // face_mesh1 (А)
      const targetMouthO = mouthOpen * (1.0 - syllableWave) * 0.75;  // face_mesh9 (О/У)
      const targetMouthE = mouthOpen * subWave * 0.25;               // face_mesh6 (Э)
      const targetGentleSmile = 0.15;                                // face_mesh4_2

      this.smoothSetMorph("face_mesh1", targetMouthA, dt, 20.0);
      this.smoothSetMorph("face_mesh9", targetMouthO, dt, 20.0);
      this.smoothSetMorph("face_mesh6", targetMouthE, dt, 20.0);
      this.smoothSetMorph("face_mesh3", 0.0, dt, 20.0);
      this.smoothSetMorph("face_mesh4_2", targetGentleSmile, dt, 10.0);
    } else {
      // В тишине ротовые морфы стремятся к EMOTION_MAP[activeEmotion].mouth:
      const MOUTH_MORPHS = ["face_mesh1", "face_mesh6", "face_mesh9", "face_mesh3", "face_mesh4_2"];
      for (const name of MOUTH_MORPHS) {
        const target = emoCfg.mouth[name] || 0.0;
        this.smoothSetMorph(name, target, dt, 12.0);
      }
    }
  }

  // Реакции на события пульта и чата
  setEmotion(name, durationMs = 0) {
    if (name === "wave" || name === "greeting") {
      this.wave();
      return;
    }
    if (name === "win") {
      this.onWin();
      return;
    }
    this.currentEmotion = EMOTION_MAP[name] ? name : "idle";
    // Таймер сброса: авто-возврат в idle через 4.0 секунды, чтобы эмоция не залипала
    this.emotionResetTimer = durationMs > 0 ? durationMs / 1000.0 : 4.0;
  }

  onGift(giftName = "") {
    this.currentEmotion = "blush";
    this.emotionResetTimer = 5.0;
    this.giftReactionTimer = 2.0;
  }

  onWin() {
    this.currentEmotion = "win";
    this.emotionResetTimer = 6.0;
  }

  wave() {
    this.waveTimer = 3.0;
  }

  playBodyMotion(motion) {
    if (motion === "wave" || motion === "greeting") {
      this.wave();
    } else if (motion === "win") {
      this.onWin();
    } else if (motion === "blush" || motion === "flirt") {
      this.setEmotion("blush", 4000);
    }
  }

  setAudioFormants(f) {
    this.vowelFormants = f;
  }

  update(delta, elapsed, isSpeaking, audioRms = 0) {
    if (this.waveTimer > 0) this.waveTimer -= delta;
    if (this.emotionResetTimer > 0) {
      this.emotionResetTimer -= delta;
      if (this.emotionResetTimer <= 0 && !isSpeaking && this.waveTimer <= 0) {
        this.currentEmotion = "idle";
      }
    }

    this.updateBodyPhysics(elapsed, delta, isSpeaking, mouseX, mouseY);
    this.updateFace(elapsed, delta, isSpeaking, audioRms);
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

        console.log("[Winky] Оригинальный Shibahu FBX успешно загружен: фронтальная поза активна, 0% клиппинга!");
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
window.winkySetEmotion = (emo) => {
  if (!vtuber) return;
  if (emo === "wave" || emo === "greeting") {
    window.winkyWave();
  } else if (emo === "win") {
    window.winkyOnWin();
  } else {
    vtuber.setEmotion(emo, 4000); // авто-сброс в idle через 4 секунды
  }
};
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
