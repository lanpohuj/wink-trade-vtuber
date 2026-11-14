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

// Таблица эмоций для пульта и кинематики (глаза, форма рта в покое, наклон головы)
const EMOTION_MAP = {
  idle:        { eyes: { facial_irisHilight_Big: 0.45 },                     mouth: { face_mesh4_2: 0.55 }, head: [0.0, 0.0, 0.0] },
  neutral:     { eyes: { facial_irisHilight_Big: 0.30 },                     mouth: { face_mesh4_2: 0.35 }, head: [0.0, 0.0, 0.0] },
  happy:       { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.70 },  mouth: { face_mesh1: 0.75 },   head: [-0.03, 0.0, 0.06] },
  blush:       { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 1.0 },   mouth: { face_mesh3: 1.0 },    head: [0.05, 0.0, -0.09] },
  excited:     { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.90 },  mouth: { face_mesh1: 0.90 },   head: [-0.05, 0.0, 0.05] },
  wink:        { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.85 },  mouth: { face_mesh3: 0.95 },   head: [0.03, 0.05, -0.13] },
  wave:        { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.80 },  mouth: { face_mesh1: 0.80 },   head: [-0.03, 0.0, -0.11] },
  win:         { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 1.0 },   mouth: { face_mesh1: 0.92 },   head: [-0.06, 0.0, 0.08] },
  surprised:   { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.40 },  mouth: { face_mesh9: 0.95 },   head: [-0.06, 0.0, 0.0] },
  thinking:    { eyes: { facial_irisHilight_Big: 0.60, face_mesh7: 0.55 },   mouth: { face_mesh9: 0.40 },   head: [0.04, 0.06, 0.11] },
  dance:       { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.90 },  mouth: { face_mesh1: 0.85 },   head: [-0.03, 0.0, 0.0] },
  flirt_kiss:  { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.90 },  mouth: { face_mesh9: 0.85 },   head: [-0.04, 0.05, -0.08] },
  neko_paws:   { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.85 },  mouth: { face_mesh3: 0.75 },   head: [-0.04, 0.0, 0.0] },
  hip_groove:  { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.70 },  mouth: { face_mesh1: 0.75 },   head: [-0.02, 0.0, 0.0] },
  peek_closer: { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.60 },  mouth: { face_mesh4_2: 0.60 }, head: [0.06, 0.08, -0.14] },
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

    // Алиасы костей для удобного доступа
    const boneAliases = {
      RightShoulder: "Shibahu_RightShoulder",
      RightArm:      "Shibahu_RightArm",
      RightForeArm:  "Shibahu_RightForeArm",
      RightHand:     "Shibahu_RightHand",
      LeftShoulder:  "Shibahu_LeftShoulder",
      LeftArm:       "Shibahu_LeftArm",
      LeftForeArm:   "Shibahu_LeftForeArm",
      LeftHand:      "Shibahu_LeftHand",
      Spine:         "Shibahu_Spine",
      Spine1:        "Shibahu_Spine1",
      Spine2:        "Shibahu_Spine2",
      Hips:          "Shibahu_Hips",
      Head:          "Shibahu_Head",
      Neck:          "Shibahu_Neck",
      EarLeft1:      "Shibahu_Ear_Left1",
      EarRight1:     "Shibahu_Ear_Right1",
    };
    for (const [alias, full] of Object.entries(boneAliases)) {
      if (this.bones[full]) {
        this.bones[alias] = this.bones[full];
      }
    }

    // Массивы костей пальцев правой и левой руки (Index, Middle, Ring, Pinky, Thumb 1..3)
    this.rightFingerBones = [];
    this.leftFingerBones = [];
    const fingerTypes = ["Index", "Middle", "Ring", "Pinky", "Thumb"];
    for (const f of fingerTypes) {
      for (let i = 1; i <= 3; i++) {
        const rName = `Shibahu_RightHand${f}${i}`;
        if (this.bones[rName]) this.rightFingerBones.push(this.bones[rName]);
        const lName = `Shibahu_LeftHand${f}${i}`;
        if (this.bones[lName]) this.leftFingerBones.push(this.bones[lName]);
      }
    }

    // Режимы и таймеры
    this.currentEmotion = "idle";
    this.emotionResetTimer = 0.0;
    this.waveTimer = 0;
    this.giftReactionTimer = 0;
    this.actionMode = null; // 'dance', 'cheer', 'shy', 'flirt_kiss', 'neko_paws'
    this.actionDuration = 0.0;
    this.actionTimer = 0.0;
    this.speechHoldTimer = 0.0;
    this.talkBodyWeight = 0.0;
    this.tailPhase = 0.0;
    this.idleFlirtTimer = 4.0 + Math.random() * 2.0;
    this.flirtIndex = 0;
    this.idleMicroTimer = 7.0 + Math.random() * 4.0;
    this.activeMicroHabit = null; // 'curious_look', 'cute_wink', 'happy_vibing'
    this.microHabitTimer = 0.0;

    // Параметры лица и Lip-Sync
    this.smoothedRms = 0.0;
    this.targetRms = 0.0;
    this.nextBlinkInterval = 3.5;
    this.blinkTimer = 0.0;
    this.blinkProgress = 0.0;
    this.isBlinking = false;
  }

  // Плавная сферическая интерполяция кватернионов (slerp) без Gimbal Lock:
  lerpBoneOffset(boneOrName, txOrName, tyOrTx, tzOrTy, dtOrTz, speedOrDt = 8.0, maybeSpeed = 8.0) {
    let boneName, tx, ty, tz, dt, speed;
    if (typeof txOrName === "string") {
      boneName = txOrName;
      tx = tyOrTx;
      ty = tzOrTy;
      tz = dtOrTz;
      dt = speedOrDt;
      speed = maybeSpeed;
    } else {
      boneName = typeof boneOrName === "string" ? boneOrName : boneOrName?.name;
      tx = txOrName;
      ty = tyOrTx;
      tz = tzOrTy;
      dt = dtOrTz;
      speed = speedOrDt;
    }
    const bone = this.bones[boneName] || (typeof boneOrName === "object" ? boneOrName : null);
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

  // Живая пластика тела, кинематика махания рукой (wave), спец-анимации (dance, cheer, shy, flirts) и жестикуляция
  updateBodyPhysics(t, dt, isSpeaking, mouseX = 0, mouseY = 0) {
    const bones = this.bones;
    const rightFingerBones = this.rightFingerBones;
    const leftFingerBones = this.leftFingerBones;
    const lerpBoneOffset = (b, name, tx, ty, tz, dt, sp) => this.lerpBoneOffset(b, name, tx, ty, tz, dt, sp);
    const smoothSetMorph = (name, val, dt, sp) => this.smoothSetMorph(name, val, dt, sp);
    const actionMode = this.actionMode;
    const actionDuration = this.actionDuration;
    const actionTimer = this.actionTimer;
    const isPhonating = this.smoothedRms > 0.03;

    const activeEmotion = this.waveTimer > 0
      ? "wave"
      : this.actionMode === "dance"
      ? "excited"
      : this.actionMode === "cheer"
      ? "win"
      : this.actionMode === "shy"
      ? "blush"
      : this.actionMode === "flirt_kiss"
      ? "flirt_kiss"
      : this.actionMode === "neko_paws"
      ? "neko_paws"
      : this.actionMode === "hip_groove"
      ? "hip_groove"
      : this.actionMode === "peek_closer"
      ? "peek_closer"
      : (this.currentEmotion || "idle");
    const emoCfg = EMOTION_MAP[activeEmotion] || EMOTION_MAP.idle;
    const head = emoCfg.head || [0.0, 0.0, 0.0];

    // 1. Бедра (Shibahu_Hips) — женственный грув тела (Contrapposto Sway) или ритмичный танец
    if (this.actionMode === "dance") {
      const beat = t * 6.8;
      const hipTx = Math.abs(Math.sin(beat)) * 0.04;
      const hipTurnY = Math.sin(beat * 0.5) * 0.12;
      const hipSwayZ = Math.sin(beat) * 0.16;
      this.lerpBoneOffset("Shibahu_Hips", hipTx, hipTurnY, hipSwayZ, dt, 10.0);
      if (this.bones["Shibahu_Hips"] && this.basePositions["Shibahu_Hips"]) {
        const bounce = Math.sin(beat * 2.0) * 0.9;
        this.bones["Shibahu_Hips"].position.y = this.basePositions["Shibahu_Hips"].y + bounce;
      }
    } else if (this.actionMode === "hip_groove") {
      const gBeat = t * 5.2;
      const hipTx = Math.abs(Math.sin(gBeat)) * 0.03;
      const hipTurnY = Math.cos(gBeat * 0.5) * 0.09;
      const hipSwayZ = Math.sin(gBeat) * 0.14;
      this.lerpBoneOffset("Shibahu_Hips", hipTx, hipTurnY, hipSwayZ, dt, 9.0);
      if (this.bones["Shibahu_Hips"] && this.basePositions["Shibahu_Hips"]) {
        const bounce = Math.sin(gBeat * 2.0) * 0.6;
        this.bones["Shibahu_Hips"].position.y = this.basePositions["Shibahu_Hips"].y + bounce;
      }
    } else if (this.actionMode === "peek_closer") {
      this.lerpBoneOffset("Shibahu_Hips", 0.03, 0.04, 0.0, dt, 6.0);
      if (this.bones["Shibahu_Hips"] && this.basePositions["Shibahu_Hips"]) {
        this.bones["Shibahu_Hips"].position.y = this.basePositions["Shibahu_Hips"].y + 0.4;
      }
    } else {
      // 24/7 покой и речь: увеличенная пластика бедер, Contrapposto + дыхание
      const hipTx = Math.sin(t * 2.4) * 0.025;
      const hipTurnY = Math.cos(t * 0.8) * 0.065;
      const hipSwayZ = Math.sin(t * 1.2) * 0.075;
      this.lerpBoneOffset("Shibahu_Hips", hipTx, hipTurnY, hipSwayZ, dt, 7.0);
      if (this.bones["Shibahu_Hips"] && this.basePositions["Shibahu_Hips"]) {
        const bounce = Math.sin(t * 2.4) * 0.65;
        this.bones["Shibahu_Hips"].position.y = this.basePositions["Shibahu_Hips"].y + bounce;
      }
    }

    // 2. Позвоночник (Shibahu_Spine, Spine1, Spine2) — мягкий S-изгиб талии в противофазе с бедрами и глубокое дыхание
    if (this.actionMode === "dance") {
      const beat = t * 6.8;
      const swaySpine = -Math.sin(beat) * 0.08;
      this.lerpBoneOffset("Shibahu_Spine", 0.0, 0.0, swaySpine * 0.5, dt, 10.0);
      this.lerpBoneOffset("Shibahu_Spine1", 0.0, 0.0, swaySpine, dt, 10.0);
      this.lerpBoneOffset("Shibahu_Spine2", 0.0, 0.0, swaySpine * 1.1, dt, 10.0);
    } else if (this.actionMode === "hip_groove") {
      const gBeat = t * 5.2;
      const swaySpine = -Math.sin(gBeat) * 0.07;
      this.lerpBoneOffset("Shibahu_Spine", 0.0, 0.0, swaySpine * 0.5, dt, 9.0);
      this.lerpBoneOffset("Shibahu_Spine1", 0.0, 0.0, swaySpine, dt, 9.0);
      this.lerpBoneOffset("Shibahu_Spine2", 0.0, 0.0, swaySpine * 1.1, dt, 9.0);
    } else if (this.actionMode === "peek_closer") {
      this.lerpBoneOffset("Shibahu_Spine", 0.05, 0.0, 0.0, dt, 6.0);
      this.lerpBoneOffset("Shibahu_Spine1", 0.08, 0.0, 0.0, dt, 6.0);
      this.lerpBoneOffset("Shibahu_Spine2", 0.10, 0.0, 0.0, dt, 6.0);
    } else if (this.actionMode === "shy") {
      const shySway = Math.sin(t * 4.5) * 0.06;
      this.lerpBoneOffset("Shibahu_Spine", 0.0, shySway * 0.5, 0.0, dt, 7.0);
      this.lerpBoneOffset("Shibahu_Spine1", 0.0, shySway, 0.0, dt, 7.0);
      this.lerpBoneOffset("Shibahu_Spine2", 0.0, shySway * 1.1, 0.0, dt, 7.0);
    } else {
      const breathSpine = Math.sin(t * 1.9) * 0.035 + (0.025 * this.talkBodyWeight);
      const spineTy = -Math.cos(t * 0.8) * 0.030;
      const swaySpine = -Math.sin(t * 1.2) * 0.040;
      this.lerpBoneOffset("Shibahu_Spine", breathSpine * 0.5, spineTy * 0.5, swaySpine * 0.5, dt, 7.0);
      this.lerpBoneOffset("Shibahu_Spine1", breathSpine, spineTy, swaySpine, dt, 7.0);
      this.lerpBoneOffset("Shibahu_Spine2", breathSpine * 1.1, spineTy * 1.1, swaySpine * 1.1, dt, 7.0);
    }

    // 2.1 Грудь (Shibahu_Bust_Left1, Shibahu_Bust_Right1) — женственная динамика дыхания
    const bustTx = Math.sin(t * 1.9) * 0.035;
    const bustTz = Math.sin(t * 1.2) * 0.025;
    this.lerpBoneOffset("Shibahu_Bust_Left1", bustTx, 0.0, bustTz, dt, 7.0);
    this.lerpBoneOffset("Shibahu_Bust_Right1", bustTx, 0.0, -bustTz, dt, 7.0);

    // 3. Шея и Голова — базовый наклон из EMOTION_MAP + дыхание + мышь + микро-привычки
    let headTx, headTy, headTz;
    if (this.actionMode === "dance") {
      const beat = t * 6.8;
      headTx = Math.abs(Math.cos(beat)) * 0.07 - 0.03;
      headTy = Math.sin(beat * 0.5) * 0.08;
      headTz = Math.sin(beat * 0.5) * 0.14;
    } else if (this.actionMode === "neko_paws") {
      headTx = -0.04;
      headTy = Math.sin(t * 3.0) * 0.06;
      headTz = Math.sin(t * 3.0) * 0.16;
    } else if (this.actionMode === "flirt_kiss") {
      headTx = -0.04;
      headTy = 0.05;
      headTz = -0.08;
    } else if (this.actionMode === "hip_groove") {
      headTx = -0.02;
      headTy = 0.0;
      headTz = -Math.sin(t * 5.2) * 0.10;
    } else if (this.actionMode === "peek_closer") {
      headTx = 0.08 + mouseY * 0.06;
      headTy = 0.08 + mouseX * 0.12;
      headTz = -0.14;
    } else if (this.actionMode === "shy") {
      headTx = 0.06;
      headTy = 0.0;
      headTz = -0.12;
    } else if (this.activeMicroHabit === "curious_look") {
      headTx = 0.05 + mouseY * 0.05;
      headTy = 0.08 + mouseX * 0.10;
      headTz = -0.12;
    } else {
      const talkNod = Math.sin(t * 2.8) * 0.035 * this.talkBodyWeight;
      headTx = head[0] + Math.sin(t * 1.6) * 0.04 + talkNod + mouseY * 0.10;
      headTy = head[1] + Math.sin(t * 0.9) * 0.07 + mouseX * 0.18;
      headTz = head[2] + Math.cos(t * 1.2) * 0.06;
    }
    this.lerpBoneOffset("Shibahu_Neck", headTx * 0.4, headTy * 0.4, headTz * 0.4, dt, 5.0);
    this.lerpBoneOffset("Shibahu_Head", headTx * 0.6, headTy * 0.6, headTz * 0.6, dt, 5.0);

    // 4. Плечи — поочередный кач в танце / мягкое дыхание
    if (this.actionMode === "dance" || this.actionMode === "hip_groove") {
      const beat = t * 6.0;
      this.lerpBoneOffset("Shibahu_LeftShoulder", 0.0, 0.0, Math.sin(beat) * 0.08, dt, 10.0);
      this.lerpBoneOffset("Shibahu_RightShoulder", 0.0, 0.0, -Math.sin(beat) * 0.08, dt, 10.0);
    } else if (this.waveTimer > 0) {
      const w = Math.sin(t * 5.8);
      this.lerpBoneOffset("Shibahu_LeftShoulder", 0.0, 0.0, Math.sin(t * 1.8) * 0.025, dt, 7.0);
      this.lerpBoneOffset("Shibahu_RightShoulder", 0.0, 0.0, 0.10 + 0.03 * w, dt, 8.0);
    } else if (this.activeMicroHabit === "cute_wink") {
      this.lerpBoneOffset("Shibahu_LeftShoulder", 0.0, 0.0, 0.06 + Math.sin(t * 2.0) * 0.02, dt, 8.0);
      this.lerpBoneOffset("Shibahu_RightShoulder", 0.0, 0.0, Math.sin(t * 1.8) * 0.025, dt, 7.0);
    } else {
      const shSway = Math.sin(t * 1.9) * 0.030;
      this.lerpBoneOffset("Shibahu_LeftShoulder", 0.0, 0.0, shSway, dt, 7.0);
      this.lerpBoneOffset("Shibahu_RightShoulder", 0.0, 0.0, shSway, dt, 7.0);
    }

    // 5. Руки, предплечья, кисти и пальцы:
    if (this.waveTimer > 0) {
      // БЛОК 1: ЧИСТОЕ КАЧАНИЕ В ПЛОСКОСТИ ЭКРАНА БЕЗ «ВКРУЧИВАНИЯ ЛАМПОЧКИ»
      const w = Math.sin(t * 5.8);               // Фаза махания предплечьем (-1 .. +1)
      const wLag = Math.sin(t * 5.8 - 0.55);     // Фаза кисти с мягким отставанием

      // 1. Плечо и предплечье качаются в плоскости экрана БЕЗ осевого скручивания ладони:
      this.lerpBoneOffset("Shibahu_RightShoulder", 0.0, 0.0, 0.10 + 0.03 * w, dt, 8.0);
      this.lerpBoneOffset("Shibahu_RightArm",      -0.58, 0.26, 0.18 + 0.04 * w, dt, 8.0);
      this.lerpBoneOffset(
        "Shibahu_RightForeArm",
        1.75 - 0.16 * w,   // Синхронная компенсация X (убирает скручивание кисти!)
        -0.35 - 0.27 * w,  // Горизонтальная дуга взмаха влево-вправо
        2.15 - 0.10 * w,   // Синхронная компенсация Z
        dt,
        10.0
      );

      // 2. Кисть мягко доводит взмах влево-вправо в плоскости ладони (по оси ty):
      this.lerpBoneOffset("Shibahu_RightHand", 0.0, -0.26 * wLag, 0.0, dt, 12.0);

      // 3. Пальчики чуть приоткрыты и живо шевелятся легкой волной:
      const fingerNames = ["Index", "Middle", "Ring", "Pinky"];
      let fIdx = 0;
      for (const f of fingerNames) {
        for (let i = 1; i <= 3; i++) {
          const fWave = Math.sin(t * 5.8 + fIdx * 0.3) * 0.04;
          this.lerpBoneOffset(`Shibahu_RightHand${f}${i}`, 0.0, 0.0, 0.06 + fWave, dt, 9.0);
          fIdx++;
        }
      }
      for (let i = 1; i <= 3; i++) {
        this.lerpBoneOffset(`Shibahu_RightHandThumb${i}`, 0.0, 0.04, 0.0, dt, 9.0);
      }

      // Левая рука спокойно и свободно опущена снаружи от бедра
      this.lerpBoneOffset("Shibahu_LeftArm", 0.0, 0.0, 0.05 + Math.sin(t * 1.5) * 0.015, dt, 6.0);
      this.lerpBoneOffset("Shibahu_LeftForeArm", 0.0, -0.16 + Math.cos(t * 1.5) * 0.03, 0.0, dt, 6.0);
      this.lerpBoneOffset("Shibahu_LeftHand", 0.0, 0.0, 0.0, dt, 6.0);
      this.setFingerRotations("Left", -0.20 + Math.sin(t * 1.8) * 0.04, dt);

    } else if (actionMode === "dance") {
      const beat = t * 6.8;
      const bSin = Math.sin(beat);
      const bCos = Math.cos(beat);

      // Эмоция лица в танце: сияющие открытые глаза, румянец и улыбка
      smoothSetMorph("facial_cheek", 0.90, dt, 10.0);
      smoothSetMorph("facial_irisHilight_Big", 1.0, dt, 10.0);
      if (!isPhonating) {
        smoothSetMorph("face_mesh1",   0.85, dt, 12.0);
        smoothSetMorph("face_mesh3",   0.0,  dt, 12.0);
        smoothSetMorph("face_mesh9",   0.0,  dt, 12.0);
        smoothSetMorph("face_mesh4_2", 0.0,  dt, 12.0);
      }

      // Бедра, корпус, плечи и голова:
      lerpBoneOffset(bones.Hips,   "Shibahu_Hips",   Math.abs(bSin) * 0.03, Math.sin(beat * 0.5) * 0.09, bSin * 0.12, dt, 8.0);
      lerpBoneOffset(bones.Spine1, "Shibahu_Spine1", 0.03, -Math.sin(beat * 0.5) * 0.04, -bSin * 0.06, dt, 8.0);
      lerpBoneOffset(bones.Spine2, "Shibahu_Spine2", 0.02, 0.0, -bSin * 0.05, dt, 8.0);
      lerpBoneOffset(bones.Head,   "Shibahu_Head",   Math.abs(bCos) * 0.05 - 0.02, Math.sin(beat * 0.5) * 0.06, Math.sin(beat * 0.5) * 0.12, dt, 8.0);

      lerpBoneOffset(bones.RightShoulder, "Shibahu_RightShoulder", 0.0, 0.0, 0.06 - bSin * 0.06, dt, 8.0);
      lerpBoneOffset(bones.LeftShoulder,  "Shibahu_LeftShoulder",  0.0, 0.0, 0.06 + bSin * 0.06, dt, 8.0);

      // Правая рука компактно перед грудью (Elbow X = -16.5, Wrist X = -15.1, Tip X = -14.4 — НЕ вылезает за рамку!):
      lerpBoneOffset(bones.RightArm,     "Shibahu_RightArm",     -0.35, -0.25, -0.05, dt, 8.0);
      lerpBoneOffset(bones.RightForeArm, "Shibahu_RightForeArm", 1.35, -0.45, 1.65 + 0.18 * bSin, dt, 9.0);
      lerpBoneOffset(bones.RightHand,    "Shibahu_RightHand",    0.0, 0.15 * bCos, -0.25, dt, 10.0);

      // Левая рука симметрично перед грудью (Elbow X = +13.3, Wrist X = +15.5, Tip X = +16.6):
      lerpBoneOffset(bones.LeftArm,      "Shibahu_LeftArm",      -0.35, 0.10, -0.15, dt, 8.0);
      lerpBoneOffset(bones.LeftForeArm,  "Shibahu_LeftForeArm",  1.60, -0.45, 1.65 - 0.18 * bSin, dt, 9.0);
      lerpBoneOffset(bones.LeftHand,     "Shibahu_LeftHand",     0.0, -0.15 * bCos, -0.25, dt, 10.0);

      // Мягко согнутые пальчики в танце:
      rightFingerBones.forEach((fBone) => lerpBoneOffset(fBone, fBone.name, 0.0, 0.0, -0.25, dt, 9.0));
      leftFingerBones.forEach((fBone)  => lerpBoneOffset(fBone, fBone.name, 0.0, 0.0, -0.25, dt, 9.0));

    } else if (this.actionMode === "cheer") {
      // БЛОК 3: ПОБЕДНАЯ РАДОСТЬ (cheer / win) — обе руки радостно вскинуты вверх с раскрытыми ладонями
      const c = Math.sin(t * 7.5);
      this.lerpBoneOffset("Shibahu_RightArm",     -0.55, 0.25, 0.20, dt, 8.0);
      this.lerpBoneOffset("Shibahu_RightForeArm", 1.75 - 0.14 * c, -0.35 - 0.22 * c, 2.15 - 0.08 * c, dt, 9.0);
      this.lerpBoneOffset("Shibahu_RightHand", 0.0, 0.0, 0.0, dt, 8.0);

      this.lerpBoneOffset("Shibahu_LeftArm",      -0.55, 0.25, 0.20, dt, 8.0);
      this.lerpBoneOffset("Shibahu_LeftForeArm",  1.75 + 0.14 * c, -0.35 + 0.22 * c, 2.15 + 0.08 * c, dt, 9.0);
      this.lerpBoneOffset("Shibahu_LeftHand", 0.0, 0.0, 0.0, dt, 8.0);

      const fingerNames = ["Index", "Middle", "Ring", "Pinky"];
      fingerNames.forEach((f, idx) => {
        const fWave = Math.sin(t * 7.0 + idx * 0.3) * 0.04;
        for (let i = 1; i <= 3; i++) {
          this.lerpBoneOffset(`Shibahu_RightHand${f}${i}`, 0.0, 0.0, 0.06 + fWave, dt, 9.0);
          this.lerpBoneOffset(`Shibahu_LeftHand${f}${i}`, 0.0, 0.0, 0.06 + fWave, dt, 9.0);
        }
      });
      for (let i = 1; i <= 3; i++) {
        this.lerpBoneOffset(`Shibahu_RightHandThumb${i}`, 0.0, 0.05, 0.0, dt, 9.0);
        this.lerpBoneOffset(`Shibahu_LeftHandThumb${i}`, 0.0, -0.05, 0.0, dt, 9.0);
      }

    } else if (actionMode === "flirt_kiss") {
      const elapsed = Math.max(0.0, (actionDuration || 3.0) - actionTimer);
      const kissPhase1 = elapsed < 1.35;

      // Эмоция лица: в Фазе 1 — губки бантиком «О» для поцелуя, в Фазе 2 — сияющая открытая улыбка!
      smoothSetMorph("facial_cheek", 1.0, dt, 12.0);
      smoothSetMorph("facial_irisHilight_Big", 1.0, dt, 12.0);
      if (!isPhonating) {
        smoothSetMorph("face_mesh9",   kissPhase1 ? 0.85 : 0.0,  dt, 14.0);
        smoothSetMorph("face_mesh1",   kissPhase1 ? 0.0  : 0.88, dt, 14.0);
        smoothSetMorph("face_mesh3",   0.0, dt, 12.0);
        smoothSetMorph("face_mesh4_2", 0.0, dt, 12.0);
      }

      if (kissPhase1) {
        // ФАЗА 1 (Без перекрута рукава! tz = 0.0 на предплечье):
        // Ладошка повернута внутренней стороной к губам (PalmN.z = -0.60), большой палец снаружи (Thumb.x = -0.55)
        lerpBoneOffset(bones.RightShoulder, "Shibahu_RightShoulder", 0.0, 0.0, 0.08, dt, 8.0);
        lerpBoneOffset(bones.RightArm,      "Shibahu_RightArm",      -0.90, -0.75, -0.45, dt, 8.0);
        lerpBoneOffset(bones.RightForeArm,  "Shibahu_RightForeArm",  -0.45, -2.12, 0.0, dt, 9.0);
        lerpBoneOffset(bones.RightHand,     "Shibahu_RightHand",     -0.40, 0.25, -0.20, dt, 10.0);

        // Пальчики мягко вытянуты к губам:
        rightFingerBones.forEach((fBone) => {
          lerpBoneOffset(fBone, fBone.name, 0.0, 0.0, 0.08, dt, 9.0);
        });

        lerpBoneOffset(bones.Spine1, "Shibahu_Spine1", -0.02, 0.0, -0.04, dt, 6.0);
        lerpBoneOffset(bones.Head,   "Shibahu_Head",   0.06, 0.05, -0.13, dt, 7.0);
      } else {
        // ФАЗА 2: Отводит ладошку от губ вперед к зрителю (Wrist X = -8.0, Y = 121, Z = +30.0 — без выворачивания кисти!)
        const flutter = Math.sin(t * 7.0) * 0.04;
        lerpBoneOffset(bones.RightShoulder, "Shibahu_RightShoulder", 0.0, 0.0, 0.08, dt, 7.0);
        lerpBoneOffset(bones.RightArm,      "Shibahu_RightArm",      -0.75, -0.45, -0.30, dt, 7.0);
        lerpBoneOffset(bones.RightForeArm,  "Shibahu_RightForeArm",  -0.35, -1.65 + flutter, 0.0, dt, 8.0);
        lerpBoneOffset(bones.RightHand,     "Shibahu_RightHand",     -0.45, 0.15, -0.35 + flutter, dt, 9.0);

        rightFingerBones.forEach((fBone, idx) => {
          lerpBoneOffset(fBone, fBone.name, 0.0, 0.0, 0.12 + Math.sin(t * 7.0 + idx * 0.3) * 0.03, dt, 9.0);
        });

        lerpBoneOffset(bones.Spine1, "Shibahu_Spine1", 0.05, 0.0, 0.03, dt, 6.0);
        lerpBoneOffset(bones.Hips,   "Shibahu_Hips",   0.02, 0.04, 0.07, dt, 6.0);
        lerpBoneOffset(bones.Head,   "Shibahu_Head",   -0.03, -0.03, 0.09, dt, 7.0);
      }

      lerpBoneOffset(bones.LeftArm,     "Shibahu_LeftArm",     0.0, -0.04, 0.04, dt, 7.0);
      lerpBoneOffset(bones.LeftForeArm, "Shibahu_LeftForeArm", 0.0, -0.25, 0.0, dt, 7.0);

    } else if (actionMode === "neko_paws") {
      const p = Math.sin(t * 6.8); // Поочередный мах правой и левой лапкой у щечек (-1 .. +1)

      // Эмоция: кошачья улыбка :3 + румянец + огромные сияющие зрачки
      smoothSetMorph("facial_cheek", 1.0, dt, 12.0);
      smoothSetMorph("facial_irisHilight_Big", 1.0, dt, 12.0);
      if (!isSpeaking) {
        smoothSetMorph("face_mesh3",   1.0, dt, 14.0);
        smoothSetMorph("face_mesh1",   0.0, dt, 12.0);
        smoothSetMorph("face_mesh9",   0.0, dt, 12.0);
        smoothSetMorph("face_mesh4_2", 0.0, dt, 12.0);
      }

      // 1. Правая лапка поднята прямо у правой щечки (X = -10.2, Y = 125.3, Z = +20.9):
      lerpBoneOffset(bones.RightShoulder, "Shibahu_RightShoulder", 0.0, 0.0, 0.10, dt, 8.0);
      lerpBoneOffset(bones.RightArm,      "Shibahu_RightArm",      -0.72, 0.15, -0.12 + 0.06 * p, dt, 8.0);
      lerpBoneOffset(bones.RightForeArm,  "Shibahu_RightForeArm",  1.85, -0.05, 2.18 + 0.14 * p, dt, 10.0);
      // Сгибаем кисть вперед-вниз лапкой (tz = -0.65) и качаем ей в такт:
      lerpBoneOffset(bones.RightHand,     "Shibahu_RightHand",     0.0, 0.12 * p, -0.65 - 0.15 * p, dt, 12.0);

      // 2. Левая лапка поднята симметрично у левой щечки (X = +10.7, Y = 125.3, Z = +20.9):
      lerpBoneOffset(bones.LeftShoulder,  "Shibahu_LeftShoulder",  0.0, 0.0, 0.10, dt, 8.0);
      lerpBoneOffset(bones.LeftArm,       "Shibahu_LeftArm",       -0.72, 0.15, -0.12 - 0.06 * p, dt, 8.0);
      lerpBoneOffset(bones.LeftForeArm,   "Shibahu_LeftForeArm",   1.85, -0.05, 2.18 - 0.14 * p, dt, 10.0);
      lerpBoneOffset(bones.LeftHand,      "Shibahu_LeftHand",      0.0, -0.12 * p, -0.65 + 0.15 * p, dt, 12.0);

      // 3. Сгибаем пальчики обеих рук в мягкие кошачьи лапки (tz = -0.35):
      rightFingerBones.forEach((fBone) => {
        lerpBoneOffset(fBone, fBone.name, 0.0, 0.0, -0.35, dt, 10.0);
      });
      leftFingerBones.forEach((fBone) => {
        lerpBoneOffset(fBone, fBone.name, 0.0, 0.0, -0.35, dt, 10.0);
      });

      // 4. Игривое покачивание головой, бедрами и быстрые ушки:
      lerpBoneOffset(bones.Head,   "Shibahu_Head",   0.04, Math.sin(t * 3.4) * 0.06, Math.sin(t * 3.4) * 0.14, dt, 8.0);
      lerpBoneOffset(bones.Hips,   "Shibahu_Hips",   0.02, Math.cos(t * 3.4) * 0.07, Math.sin(t * 3.4) * 0.09, dt, 7.0);
      lerpBoneOffset(bones.Spine1, "Shibahu_Spine1", 0.04, 0.0, -Math.sin(t * 3.4) * 0.05, dt, 7.0);

    } else if (this.actionMode === "hip_groove") {
      // КОКЕТЛИВЫЙ ТАНЕЦ БЕДРАМИ (hip_groove) — ручки упираются в бедра/талию
      this.lerpBoneOffset("Shibahu_RightArm", 0.06, 0.16, 0.18, dt, 7.0);
      this.lerpBoneOffset("Shibahu_RightForeArm", 0.0, -0.85, 0.0, dt, 8.0);
      this.lerpBoneOffset("Shibahu_RightHand", 0.0, 0.20, 0.0, dt, 8.0);

      this.lerpBoneOffset("Shibahu_LeftArm", 0.06, -0.16, 0.18, dt, 7.0);
      this.lerpBoneOffset("Shibahu_LeftForeArm", 0.0, -0.85, 0.0, dt, 8.0);
      this.lerpBoneOffset("Shibahu_LeftHand", 0.0, -0.20, 0.0, dt, 8.0);

      this.setFingerRotations("Right", -0.30, dt);
      this.setFingerRotations("Left", -0.30, dt);

    } else if (this.actionMode === "peek_closer") {
      // ЛЮБОПЫТНОЕ ПРИБЛИЖЕНИЕ (peek_closer) — легкий наклон вперед, ручки чуть сведены
      this.lerpBoneOffset("Shibahu_RightArm", 0.02, 0.08, 0.08, dt, 7.0);
      this.lerpBoneOffset("Shibahu_RightForeArm", 0.0, -0.35, 0.0, dt, 7.0);
      this.lerpBoneOffset("Shibahu_RightHand", 0.0, 0.0, 0.0, dt, 7.0);

      this.lerpBoneOffset("Shibahu_LeftArm", 0.02, -0.08, 0.08, dt, 7.0);
      this.lerpBoneOffset("Shibahu_LeftForeArm", 0.0, -0.35, 0.0, dt, 7.0);
      this.lerpBoneOffset("Shibahu_LeftHand", 0.0, 0.0, 0.0, dt, 7.0);

      this.setFingerRotations("Right", -0.16, dt);
      this.setFingerRotations("Left", -0.16, dt);

    } else if (this.actionMode === "shy") {
      // БЛОК 3: РЕАКЦИЯ НА КОМПЛИМЕНТ (shy)
      this.lerpBoneOffset("Shibahu_RightArm", 0.0, 0.08, 0.06, dt, 7.0);
      this.lerpBoneOffset("Shibahu_RightForeArm", 0.0, -0.65, 0.0, dt, 8.0);
      this.lerpBoneOffset("Shibahu_RightHand", 0.0, 0.0, 0.0, dt, 7.0);

      this.lerpBoneOffset("Shibahu_LeftArm", 0.0, -0.08, 0.06, dt, 7.0);
      this.lerpBoneOffset("Shibahu_LeftForeArm", 0.0, -0.65, 0.0, dt, 8.0);
      this.lerpBoneOffset("Shibahu_LeftHand", 0.0, 0.0, 0.0, dt, 7.0);

      this.setFingerRotations("Right", -0.25, dt);
      this.setFingerRotations("Left", -0.25, dt);

    } else {
      // Плавное перетекание между позой покоя и позой речи через talkBodyWeight:
      const idleForeY_R = -0.16 + Math.sin(t * 1.5) * 0.06;
      const idleForeY_L = -0.16 + Math.cos(t * 1.4) * 0.06;
      const talkForeY_R = -0.36 + Math.sin(t * 2.3) * 0.09;
      const talkForeY_L = -0.34 + Math.cos(t * 1.9) * 0.08;

      const armTy_R = 0.04 * this.talkBodyWeight;
      const armTz_R = 0.04 + 0.02 * this.talkBodyWeight;
      const foreY_R = THREE.MathUtils.lerp(idleForeY_R, talkForeY_R, this.talkBodyWeight);

      const armTy_L = -0.04 * this.talkBodyWeight;
      const armTz_L = 0.04 + 0.02 * this.talkBodyWeight;
      const foreY_L = THREE.MathUtils.lerp(idleForeY_L, talkForeY_L, this.talkBodyWeight);

      this.lerpBoneOffset("Shibahu_RightArm", 0.0, armTy_R, armTz_R, dt, 5.0);
      this.lerpBoneOffset("Shibahu_RightForeArm", 0.0, foreY_R, 0.0, dt, 5.0);
      this.lerpBoneOffset("Shibahu_RightHand", 0.0, Math.sin(t * 2.0) * 0.07, 0.0, dt, 5.0);

      this.lerpBoneOffset("Shibahu_LeftArm", 0.0, armTy_L, armTz_L, dt, 5.0);
      this.lerpBoneOffset("Shibahu_LeftForeArm", 0.0, foreY_L, 0.0, dt, 5.0);
      this.lerpBoneOffset("Shibahu_LeftHand", 0.0, Math.cos(t * 2.0) * 0.07, 0.0, dt, 5.0);

      const fingerCurl = THREE.MathUtils.lerp(
        -0.16 + Math.sin(t * 1.9) * 0.05,
        -0.20 + Math.sin(t * 1.8) * 0.04,
        this.talkBodyWeight
      );
      this.setFingerRotations("Right", fingerCurl, dt);
      this.setFingerRotations("Left", fingerCurl, dt);
    }

    // 6. Ушки — стабильные, без дерганий и складывания внутрь черепа:
    const earSway = Math.sin(t * 1.4) * 0.025;
    this.lerpBoneOffset("Shibahu_Ear_Left1", 0.0, 0.0, earSway, dt, 4.0);
    this.lerpBoneOffset("Shibahu_Ear_Right1", 0.0, 0.0, -earSway, dt, 4.0);

    // Пушистый хвост (Tail1..6): непрерывный интегратор фазы исключает скачки при старте речи
    this.tailPhase += dt * (1.8 + this.talkBodyWeight * 1.2);
    for (let i = 1; i <= 6; i++) {
      const ty = Math.sin(this.tailPhase - i * 0.45) * 0.28;
      const tz = Math.cos(this.tailPhase * 0.7 - i * 0.3) * 0.18;
      this.lerpBoneOffset(`Shibahu_Tail${i}`, 0.0, ty, tz, dt, 8.0);
    }

    // Хохолок на макушке (Ahoge1..3): упруго пружинит
    const ahogeTz = Math.sin(t * 3.5) * 0.16;
    for (let i = 1; i <= 3; i++) {
      this.lerpBoneOffset(`Shibahu_Ahoge${i}`, 0.0, 0.0, ahogeTz * (i * 0.5), dt, 8.0);
    }
  }

  // Обновление эмоций лица, моргания и Lip-Sync на 60 FPS
  updateFace(t, dt, isSpeaking, audioRms) {
    if (this.giftReactionTimer > 0) {
      this.giftReactionTimer -= dt;
    }

    const activeEmotion = this.waveTimer > 0
      ? "wave"
      : this.actionMode === "dance"
      ? "excited"
      : this.actionMode === "cheer"
      ? "win"
      : this.actionMode === "shy"
      ? "blush"
      : this.actionMode === "flirt_kiss"
      ? "flirt_kiss"
      : this.actionMode === "neko_paws"
      ? "neko_paws"
      : this.actionMode === "hip_groove"
      ? "hip_groove"
      : this.actionMode === "peek_closer"
      ? "peek_closer"
      : this.activeMicroHabit === "curious_look"
      ? "happy"
      : this.activeMicroHabit === "cute_wink"
      ? "wink"
      : this.activeMicroHabit === "happy_vibing"
      ? "happy"
      : (this.currentEmotion || "idle");
    const emoCfg = EMOTION_MAP[activeEmotion] || EMOTION_MAP.idle;

    // 1. Сглаживание RMS звука для многофазной артикуляции:
    this.targetRms = Math.max(0.0, Number(audioRms) || 0.0);
    const lerpSpeed = this.targetRms > this.smoothedRms ? 38.0 : 28.0;
    this.smoothedRms += (this.targetRms - this.smoothedRms) * Math.min(1.0, dt * lerpSpeed);
    const isPhonating = this.smoothedRms > 0.03;

    // 2. Морфы глаз и щек ВСЕГДА стремятся к значениям текущей эмоции:
    // ЖЕСТКИЙ ЗАПРЕТ СОННЫХ ВЕК: face_mesh1_2 и face_mesh2 ВСЕГДА принудительно обнуляются!
    this.smoothSetMorph("face_mesh1_2", 0.0, dt, 15.0);
    this.smoothSetMorph("face_mesh2", 0.0, dt, 15.0);

    const EYE_CHEEK_MORPHS = [
      "face_mesh7",
      "face_mesh10",
      "facial_cheek",
      "facial_irisHilight_Big",
    ];
    for (const name of EYE_CHEEK_MORPHS) {
      let target = emoCfg.eyes[name] || 0.0;
      if (name === "facial_irisHilight_Big" && (this.activeMicroHabit === "curious_look" || activeEmotion !== "idle")) {
        target = 1.0;
      }
      this.smoothSetMorph(name, target, dt, 12.0);
    }

    // 3. Моргание (face_mesh8) — единственный естественный способ смыкания глаз на 0.13 сек:
    this.blinkTimer += dt;
    if (this.blinkTimer >= this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkProgress = 0.0;
      this.blinkTimer = 0.0;
      this.nextBlinkInterval = 3.5 + Math.random() * 1.0;
    }
    let blinkTarget = 0.0;
    if (this.isBlinking) {
      this.blinkProgress += dt / 0.13;
      if (this.blinkProgress >= 1.0) {
        this.isBlinking = false;
        this.blinkProgress = 0.0;
      } else {
        blinkTarget = Math.sin(this.blinkProgress * Math.PI);
      }
    }
    this.smoothSetMorph("face_mesh8", blinkTarget, dt, 35.0);

    // 4. Морфы рта:
    this.smoothSetMorph("face_mesh5", 0.0, dt, 20.0); // Полный запрет оскала face_mesh5!
    this.smoothSetMorph("face_mesh4", 0.0, dt, 20.0); // Полный запрет оскала face_mesh4!

    if (isPhonating) {
      const mouthOpen = Math.min(1.0, Math.pow(this.smoothedRms, 0.85));
      const vowelMod = 0.5 + 0.5 * Math.sin(t * 16.0);

      const targetMouthA = mouthOpen * (this.smoothedRms > 0.42 ? 0.80 : 0.35 * vowelMod); // face_mesh1 (А)
      const targetMouthO = mouthOpen * (this.smoothedRms <= 0.42 ? 0.75 : 0.30 * (1.0 - vowelMod)); // face_mesh9 (О/У)
      const targetMouthE = mouthOpen * 0.25 * vowelMod; // face_mesh6 (Э)
      const targetGentleSmile = 0.15; // face_mesh4_2

      this.smoothSetMorph("face_mesh1", targetMouthA, dt, 32.0);
      this.smoothSetMorph("face_mesh9", targetMouthO, dt, 32.0);
      this.smoothSetMorph("face_mesh6", targetMouthE, dt, 32.0);
      this.smoothSetMorph("face_mesh3", 0.0, dt, 25.0);
      this.smoothSetMorph("face_mesh4_2", targetGentleSmile, dt, 20.0);
    } else if (this.talkBodyWeight > 0.10) {
      // Микропауза между словами во время активной речи: быстрое смыкание рта в аккуратную легкую улыбку
      this.smoothSetMorph("face_mesh1", 0.0, dt, 28.0);
      this.smoothSetMorph("face_mesh9", 0.0, dt, 28.0);
      this.smoothSetMorph("face_mesh6", 0.0, dt, 28.0);
      this.smoothSetMorph("face_mesh3", 0.0, dt, 25.0);
      this.smoothSetMorph("face_mesh4_2", 0.35, dt, 28.0);
    } else {
      // В тишине ротовые морфы стремятся к EMOTION_MAP[activeEmotion].mouth или спец-фазам:
      if (this.actionMode === "flirt_kiss") {
        const elapsed = Math.max(0.0, (this.actionDuration || 3.0) - this.actionTimer);
        const kissPhase1 = elapsed < 1.35;
        this.smoothSetMorph("face_mesh9",   kissPhase1 ? 0.85 : 0.0,  dt, 14.0);
        this.smoothSetMorph("face_mesh1",   kissPhase1 ? 0.0  : 0.88, dt, 14.0);
        this.smoothSetMorph("face_mesh3",   0.0, dt, 12.0);
        this.smoothSetMorph("face_mesh4_2", 0.0, dt, 12.0);
        this.smoothSetMorph("face_mesh6",   0.0, dt, 12.0);
      } else if (this.actionMode === "neko_paws") {
        this.smoothSetMorph("face_mesh3",   1.0, dt, 14.0);
        this.smoothSetMorph("face_mesh1",   0.0, dt, 12.0);
        this.smoothSetMorph("face_mesh9",   0.0, dt, 12.0);
        this.smoothSetMorph("face_mesh4_2", 0.0, dt, 12.0);
        this.smoothSetMorph("face_mesh6",   0.0, dt, 12.0);
      } else {
        const MOUTH_MORPHS = ["face_mesh1", "face_mesh6", "face_mesh9", "face_mesh3", "face_mesh4_2"];
        for (const name of MOUTH_MORPHS) {
          let target = emoCfg.mouth[name] || 0.0;
          if (this.activeMicroHabit === "curious_look" && name === "face_mesh3") {
            target = 0.75;
          }
          this.smoothSetMorph(name, target, dt, 12.0);
        }
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
    if (name === "dance") {
      this.triggerAction("dance", durationMs > 0 ? durationMs / 1000.0 : 4.5);
      return;
    }
    if (name === "shy") {
      this.triggerAction("shy", durationMs > 0 ? durationMs / 1000.0 : 3.2);
      return;
    }
    if (name === "flirt_kiss") {
      this.triggerAction("flirt_kiss", durationMs > 0 ? durationMs / 1000.0 : 3.0);
      return;
    }
    if (name === "neko_paws") {
      this.triggerAction("neko_paws", durationMs > 0 ? durationMs / 1000.0 : 3.2);
      return;
    }
    if (name === "hip_groove") {
      this.triggerAction("hip_groove", durationMs > 0 ? durationMs / 1000.0 : 3.2);
      return;
    }
    if (name === "peek_closer") {
      this.triggerAction("peek_closer", durationMs > 0 ? durationMs / 1000.0 : 2.8);
      return;
    }
    this.currentEmotion = EMOTION_MAP[name] ? name : "idle";
    this.emotionResetTimer = durationMs > 0 ? durationMs / 1000.0 : 4.0;
  }

  triggerAction(action, duration = 4.0) {
    this.actionMode = action;
    this.actionDuration = Number(duration) || 4.0;
    this.actionTimer = this.actionDuration;
    if (action === "dance") {
      this.currentEmotion = "excited";
      this.emotionResetTimer = this.actionTimer;
    } else if (action === "cheer") {
      this.currentEmotion = "win";
      this.emotionResetTimer = this.actionTimer;
    } else if (action === "shy") {
      this.currentEmotion = "blush";
      this.emotionResetTimer = this.actionTimer;
    } else if (action === "thinking") {
      this.currentEmotion = "thinking";
      this.emotionResetTimer = this.actionTimer;
    } else if (action === "flirt_kiss") {
      this.currentEmotion = "flirt_kiss";
      this.emotionResetTimer = this.actionTimer;
    } else if (action === "neko_paws") {
      this.currentEmotion = "neko_paws";
      this.emotionResetTimer = this.actionTimer;
    } else if (action === "hip_groove") {
      this.currentEmotion = "hip_groove";
      this.emotionResetTimer = this.actionTimer;
    } else if (action === "peek_closer") {
      this.currentEmotion = "peek_closer";
      this.emotionResetTimer = this.actionTimer;
    }
  }

  onGift(giftName = "") {
    this.triggerAction("dance", 4.5);
    this.giftReactionTimer = 2.0;
  }

  onWin() {
    this.triggerAction("cheer", 3.5);
  }

  wave() {
    this.waveTimer = 3.0;
  }

  playBodyMotion(motion) {
    if (motion === "wave" || motion === "greeting") {
      this.wave();
    } else if (motion === "win" || motion === "cheer") {
      this.triggerAction("cheer", 3.5);
    } else if (motion === "dance") {
      this.triggerAction("dance", 4.5);
    } else if (motion === "blush" || motion === "shy") {
      this.triggerAction("shy", 3.2);
    } else if (motion === "flirt_kiss" || motion === "kiss") {
      this.triggerAction("flirt_kiss", 3.0);
    } else if (motion === "neko_paws" || motion === "paws") {
      this.triggerAction("neko_paws", 3.2);
    } else if (motion === "hip_groove" || motion === "groove") {
      this.triggerAction("hip_groove", 3.2);
    } else if (motion === "peek_closer" || motion === "peek") {
      this.triggerAction("peek_closer", 2.8);
    }
  }

  setAudioFormants(f) {
    this.vowelFormants = f;
  }

  update(delta, elapsed, isSpeaking, audioRms = 0) {
    if (this.waveTimer > 0) this.waveTimer -= delta;

    if (this.actionTimer > 0) {
      this.actionTimer -= delta;
      if (this.actionTimer <= 0) {
        this.actionMode = null;
      }
    }

    if (this.speechHoldTimer > 0) {
      this.speechHoldTimer = Math.max(0.0, this.speechHoldTimer - delta);
    }
    const isSpeakingStable = this.speechHoldTimer > 0 || isSpeaking;
    const targetTalkWeight = (isSpeakingStable && this.waveTimer <= 0 && (!this.actionTimer || this.actionTimer <= 0)) ? 1.0 : 0.0;
    this.talkBodyWeight += (targetTalkWeight - this.talkBodyWeight) * Math.min(1.0, delta * 2.5);

    if (this.emotionResetTimer > 0) {
      this.emotionResetTimer -= delta;
      if (this.emotionResetTimer <= 0 && !isSpeakingStable && this.waveTimer <= 0 && !this.actionMode) {
        this.currentEmotion = "idle";
      }
    }

    // Автономные кокетливые действия и микро-привычки в покое каждые 4.0-6.0 секунд:
    if (!isSpeakingStable && !this.actionMode && this.waveTimer <= 0 && this.currentEmotion === "idle") {
      this.idleFlirtTimer -= delta;
      if (this.idleFlirtTimer <= 0) {
        const flirts = ["flirt_kiss", "neko_paws", "hip_groove", "peek_closer"];
        const action = flirts[this.flirtIndex % flirts.length];
        this.flirtIndex++;
        const dur = (action === "hip_groove") ? 3.2 : (action === "neko_paws") ? 3.2 : (action === "peek_closer") ? 2.8 : 3.0;
        this.triggerAction(action, dur);
        this.idleFlirtTimer = 4.5 + Math.random() * 2.5;
      }
    } else if (isSpeakingStable || this.actionMode || this.waveTimer > 0) {
      this.idleFlirtTimer = 4.5 + Math.random() * 2.5;
      this.activeMicroHabit = null;
    }

    if (this.microHabitTimer > 0) {
      this.microHabitTimer -= delta;
      if (this.microHabitTimer <= 0) {
        this.activeMicroHabit = null;
      }
    }

    this.updateBodyPhysics(elapsed, delta, isSpeakingStable, mouseX, mouseY);
    this.updateFace(elapsed, delta, isSpeakingStable, audioRms);
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
  } else if (emo === "dance") {
    window.winkyTriggerAction("dance", 4.5);
  } else if (emo === "shy") {
    window.winkyTriggerAction("shy", 3.2);
  } else if (emo === "flirt_kiss") {
    window.winkyTriggerAction("flirt_kiss", 3.0);
  } else if (emo === "neko_paws") {
    window.winkyTriggerAction("neko_paws", 3.2);
  } else if (emo === "hip_groove") {
    window.winkyTriggerAction("hip_groove", 3.2);
  } else if (emo === "peek_closer") {
    window.winkyTriggerAction("peek_closer", 2.8);
  } else {
    vtuber.setEmotion(emo, 4000); // авто-сброс в idle через 4 секунды
  }
};
window.winkyTriggerAction = (action, duration = 4.0) => {
  if (vtuber) vtuber.triggerAction(action, duration);
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
  window.__forceSpeaking = v > 0.02;
  if (v > 0.02 && vtuber) {
    vtuber.speechHoldTimer = 0.85;
  }
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
