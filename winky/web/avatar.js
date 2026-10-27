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

/* ==================== 3. Константы и хирургическое разделение морфов ==================== */

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

  // 1. Делаем чисто ротовые морфы (обнуляем смещения вершин выше Y = 138.3):
  const mouthOnlyMorphs = ["face_mesh1", "face_mesh6", "face_mesh9", "face_mesh4_2", "face_mesh3"];
  for (const name of mouthOnlyMorphs) {
    const idx = dict[name] !== undefined ? dict[name] : dict[`blendShape1.${name}`];
    if (idx === undefined || !morphAttrs[idx]) continue;
    const mAttr = morphAttrs[idx];
    let modified = 0;
    for (let i = 0; i < posAttr.count; i++) {
      const by = posAttr.getY(i);
      if (by >= 138.3) {
        mAttr.setXYZ(
          i,
          isRelative ? 0 : posAttr.getX(i),
          isRelative ? 0 : by,
          isRelative ? 0 : posAttr.getZ(i)
        );
        modified++;
      }
    }
    mAttr.needsUpdate = true;
    console.log(`[Winky Morph Surgery] Морф рта ${name}: изолировано ${modified} вершин верхней части лица`);
  }

  // 2. Делаем чисто глазной морф моргания face_mesh8 (обнуляем смещения вершин ниже Y = 138.3):
  const blinkIdx = dict["face_mesh8"] !== undefined ? dict["face_mesh8"] : dict["blendShape1.face_mesh8"];
  if (blinkIdx !== undefined && morphAttrs[blinkIdx]) {
    const bAttr = morphAttrs[blinkIdx];
    let modified = 0;
    for (let i = 0; i < posAttr.count; i++) {
      const by = posAttr.getY(i);
      if (by < 138.3) {
        bAttr.setXYZ(
          i,
          isRelative ? 0 : posAttr.getX(i),
          isRelative ? 0 : by,
          isRelative ? 0 : posAttr.getZ(i)
        );
        modified++;
      }
    }
    bAttr.needsUpdate = true;
    console.log(`[Winky Morph Surgery] Морф моргания face_mesh8: изолировано ${modified} вершин нижней части лица`);
  }
}

/* ==================== 4. Контроллер оригинального Shibahu FBX ==================== */

class ShibahuFBXController {
  constructor(fbx) {
    this.fbx = fbx;
    this.faceMesh = null;
    this.mixer = null;

    // Находим face_mesh и сразу оперируем блендшейпы по Y = 138.3
    fbx.traverse((c) => {
      if (c.isMesh && c.name === "face_mesh") {
        this.faceMesh = c;
      }
    });
    if (this.faceMesh) {
      setupSurgicalFaceMorphs(this.faceMesh);
    }

    // 1. Фиксация нейтральной стойки автора Take 001 на t = 0.0s
    const rawClip = fbx.animations && fbx.animations[0];
    if (rawClip) {
      rawClip.tracks = rawClip.tracks.filter(
        (t) => !t.name.includes("morphTargetInfluences") && !t.name.includes("DeformPercent")
      );
      this.mixer = new THREE.AnimationMixer(fbx);
      const action = this.mixer.clipAction(rawClip);
      action.play();
      this.mixer.setTime(0.0);
      this.mixer.update(0);
      action.paused = true;
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

    // Параметры лица и Lip-Sync
    this.smoothedRms = 0.0;
    this.targetRms = 0.0;
    this.nextBlinkInterval = 3.5;
    this.blinkTimer = 0.0;
    this.blinkProgress = 0.0;
    this.isBlinking = false;

    // Устанавливаем базовую улыбку и румянец в покое
    this.smoothSetMorph("face_mesh4_2", 0.55, 1.0, 100.0);
    this.smoothSetMorph("facial_cheek", 0.35, 1.0, 100.0);
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
  updateBodyPhysics(t, dt, mode = "idle", audioRms = 0, mouseX = 0, mouseY = 0) {
    const isDance = mode === "dance";
    const isFlirt = mode === "flirt";
    const isTalking = this.smoothedRms > 0.025;
    const speed = isDance ? 5.2 : isFlirt ? 2.0 : 1.35;

    // 1. Бедра (Shibahu_Hips) — живое покачивание и пружинящий bounce:
    const hipSwayZ = Math.sin(t * speed) * (isDance ? 0.14 : isFlirt ? 0.10 : 0.075) + Math.sin(t * 0.6) * 0.03;
    const hipTurnY = Math.cos(t * speed * 0.5) * (isDance ? 0.16 : 0.08);
    const hipTiltX = Math.sin(t * 2.2) * 0.03;
    this.applySmoothBoneOffset("Shibahu_Hips", hipTiltX, hipTurnY, hipSwayZ, dt, 8.0);

    if (this.bones["Shibahu_Hips"] && this.basePos["Shibahu_Hips"]) {
      const bounce = isDance ? Math.abs(Math.sin(t * speed)) * 2.2 : Math.sin(t * 2.7) * 0.7;
      this.bones["Shibahu_Hips"].position.y = this.basePos["Shibahu_Hips"].y + bounce;
    }

    // 2. Талия и Грудь — легкий наклон вперед к зрителю при разговоре:
    const breathX = Math.sin(t * 2.4) * 0.045;
    const spineCounterZ = -hipSwayZ * 0.45;
    const spineTurnY = -hipTurnY * 0.35 + (isDance ? Math.sin(t * speed) * 0.08 : 0);
    const spineLean = isTalking ? (0.04 + this.smoothedRms * 0.04) : 0.0;

    this.applySmoothBoneOffset("Shibahu_Spine", breathX * 0.5, spineTurnY * 0.5, spineCounterZ * 0.5, dt, 8.0);
    this.applySmoothBoneOffset("Shibahu_Spine1", breathX + spineLean, spineTurnY, spineCounterZ, dt, 8.0);
    this.applySmoothBoneOffset("Shibahu_Spine2", (breathX + spineLean) * 1.2, spineTurnY * 0.8, spineCounterZ * 0.8, dt, 8.0);

    // 3. Шея и Голова — смотрят на зрителя, кивают в такт речи:
    const headNodX = 0.08 + Math.sin(t * 1.9) * 0.05 + (isTalking ? this.smoothedRms * 0.14 : 0.0) + mouseY * 0.15;
    const headTurnY = Math.sin(t * 0.75) * 0.09 + mouseX * 0.22;
    const headTiltZ = Math.sin(t * 1.1) * (isFlirt ? 0.16 : 0.10) + Math.cos(t * 0.45) * 0.05 + (isTalking ? Math.sin(t * 1.7) * 0.07 : 0.0);

    // 4. Плечи и руки:
    const shMove = Math.sin(t * 2.4) * 0.04 + (isDance ? Math.sin(t * speed) * 0.08 : 0);
    const leftShMove = shMove + (isTalking ? Math.sin(t * 3.0) * 0.04 : 0.0);
    const rightShMove = shMove + (isTalking ? Math.cos(t * 3.0) * 0.04 : 0.0);
    this.applySmoothBoneOffset("Shibahu_LeftShoulder", 0, 0, leftShMove, dt, 8.0);
    this.applySmoothBoneOffset("Shibahu_RightShoulder", 0, 0, rightShMove, dt, 8.0);

    const armSwayY = 0.18 + Math.sin(t * 1.5) * 0.08;
    const armSwayZ = -0.06 + Math.cos(t * 1.35) * 0.05;

    if (mode === "wave") {
      // Режим приветствия / махания рукой (mode === 'wave', 3.2 сек):
      this.applySmoothBoneOffset("Shibahu_RightShoulder", 0, 0.10, rightShMove, dt, 8.0);
      this.applySmoothBoneOffset("Shibahu_RightArm", 0.0, -0.35, +0.65, dt, 10.0);
      const waveSwing = Math.sin(t * 8.5) * 0.28;
      this.applySmoothBoneOffset("Shibahu_RightForeArm", +1.20, 0.0, +1.95 + waveSwing, dt, 12.0);
      this.applySmoothBoneOffset("Shibahu_RightHand", 0.0, 0.0, Math.sin(t * 8.5 - 0.6) * 0.30, dt, 15.0);

      // Кокетливый наклон головы к машущей руке:
      this.applySmoothBoneOffset("Shibahu_Neck", headNodX * 0.4 + 0.02, headTurnY * 0.4, -0.08, dt, 8.0);
      this.applySmoothBoneOffset("Shibahu_Head", headNodX * 0.6 + 0.04, headTurnY * 0.6, -0.12, dt, 8.0);

      // Левая рука спокойно опущена
      this.applySmoothBoneOffset("Shibahu_LeftArm", 0, armSwayY, armSwayZ, dt, 4.5);
      this.applySmoothBoneOffset("Shibahu_LeftForeArm", 0, -0.38, 0, dt, 4.5);
      this.applySmoothBoneOffset("Shibahu_LeftHand", 0, 0, 0.25, dt, 4.5);
    } else if (isTalking) {
      // Режим рассказчика — выразительная жестикуляция предплечьями при речи:
      this.applySmoothBoneOffset("Shibahu_Neck", headNodX * 0.4, headTurnY * 0.4, headTiltZ * 0.4, dt, 8.0);
      this.applySmoothBoneOffset("Shibahu_Head", headNodX * 0.6, headTurnY * 0.6, headTiltZ * 0.6, dt, 8.0);

      const rForearmZ = +0.65 + Math.sin(t * 3.4) * 0.18 + this.smoothedRms * 0.28;
      const lForearmZ = -0.65 - Math.cos(t * 2.9) * 0.18 - this.smoothedRms * 0.22;

      this.applySmoothBoneOffset("Shibahu_RightArm", 0.05, -0.18, +0.18, dt, 8.0);
      this.applySmoothBoneOffset("Shibahu_RightForeArm", +0.55, 0.0, rForearmZ, dt, 8.0);
      this.applySmoothBoneOffset("Shibahu_RightHand", 0.0, 0.0, 0.15 + Math.cos(t * 2.6) * 0.12, dt, 8.0);

      this.applySmoothBoneOffset("Shibahu_LeftArm", 0.05, +0.18, +0.18, dt, 8.0);
      this.applySmoothBoneOffset("Shibahu_LeftForeArm", -0.55, 0.0, lForearmZ, dt, 8.0);
      this.applySmoothBoneOffset("Shibahu_LeftHand", 0.0, 0.0, -0.15 + Math.sin(t * 2.6) * 0.12, dt, 8.0);
    } else {
      // Покой — руки плавно возвращаются по швам со скоростью dt * 4.5
      this.applySmoothBoneOffset("Shibahu_Neck", headNodX * 0.4, headTurnY * 0.4, headTiltZ * 0.4, dt, 8.0);
      this.applySmoothBoneOffset("Shibahu_Head", headNodX * 0.6, headTurnY * 0.6, headTiltZ * 0.6, dt, 8.0);

      this.applySmoothBoneOffset("Shibahu_RightArm", 0, armSwayY, armSwayZ, dt, 4.5);
      const rightElbowY = -0.38 - Math.cos(t * speed) * (isDance ? 0.25 : 0.10);
      this.applySmoothBoneOffset("Shibahu_RightForeArm", 0, rightElbowY, 0, dt, 4.5);
      this.applySmoothBoneOffset("Shibahu_RightHand", 0, 0, 0.25 + Math.cos(t * 2.6) * 0.12, dt, 4.5);

      this.applySmoothBoneOffset("Shibahu_LeftArm", 0, armSwayY, armSwayZ, dt, 4.5);
      const leftElbowY = -0.38 - Math.sin(t * speed) * (isDance ? 0.25 : 0.10);
      this.applySmoothBoneOffset("Shibahu_LeftForeArm", 0, leftElbowY, 0, dt, 4.5);
      this.applySmoothBoneOffset("Shibahu_LeftHand", 0, 0, 0.25 + Math.sin(t * 2.6) * 0.12, dt, 4.5);
    }

    // 5. Ушки и Хвост: в 1.6 раза энергичнее во время речи
    const energyMult = isTalking ? 1.6 : 1.0;
    const earTwitch = (Math.pow(Math.max(0, Math.sin(t * 3.1)), 12) * 0.22 + this.smoothedRms * 0.18) * energyMult;
    this.applySmoothBoneOffset("Shibahu_Ear_Left1", 0, 0, earTwitch, dt, 14.0);
    this.applySmoothBoneOffset("Shibahu_Ear_Right1", 0, 0, -earTwitch, dt, 14.0);

    for (let i = 1; i <= 6; i++) {
      const tailWave = (Math.sin(t * (isDance ? 6.5 : 2.8) - i * 0.55) * (isDance ? 0.22 : 0.15)) * energyMult;
      this.applySmoothBoneOffset(`Shibahu_Tail${i}`, 0, tailWave * 0.5, tailWave, dt, 10.0);
    }
  }

  // Обновление эмоций лица, моргания и Lip-Sync на 60 FPS
  updateFace(t, dt, mode, isSpeaking, audioRms) {
    if (this.giftReactionTimer > 0) {
      this.giftReactionTimer -= dt;
    }

    // 1. Сглаживание RMS звука для многофазной артикуляции
    this.targetRms = Math.max(0.0, Number(audioRms) || 0.0);
    const lerpSpeed = this.targetRms > this.smoothedRms ? 22.0 : 14.0;
    this.smoothedRms += (this.targetRms - this.smoothedRms) * Math.min(1.0, dt * lerpSpeed);

    const isTalking = this.smoothedRms > 0.025;
    const mouthOpen = isTalking ? Math.min(1.0, Math.pow(this.smoothedRms * 1.9, 0.85)) : 0.0;

    // Плавное гармоническое чередование гласных форм губ во время речи
    const syllableWave = 0.5 + 0.5 * Math.sin(t * 13.5);
    const subWave = 0.5 + 0.5 * Math.cos(t * 9.2);

    const targetMouthA = isTalking ? mouthOpen * (0.35 + 0.50 * syllableWave) : 0.0; // face_mesh1 (рот А с язычком)
    const targetMouthO = isTalking ? mouthOpen * (1.0 - syllableWave) * 0.75 : 0.0;  // face_mesh9 (круглый рот О/У)
    const targetMouthE = isTalking ? mouthOpen * subWave * 0.25 : 0.0;               // face_mesh6 (средний рот Э)
    const targetGentleSmile = isTalking ? 0.15 : 0.55;                               // face_mesh4_2 (нежная улыбка в покое)

    this.smoothSetMorph("face_mesh1", targetMouthA, dt, 20.0);
    this.smoothSetMorph("face_mesh9", targetMouthO, dt, 20.0);
    this.smoothSetMorph("face_mesh6", targetMouthE, dt, 20.0);
    this.smoothSetMorph("face_mesh4_2", targetGentleSmile, dt, 10.0);
    this.smoothSetMorph("face_mesh5", 0.0, dt, 20.0); // Полный запрет оскала face_mesh5!
    this.smoothSetMorph("face_mesh4", 0.0, dt, 20.0); // Полный запрет оскала face_mesh4!

    // 2. Независимое плавное моргание раз в 3.2–5.5 сек (160 мс):
    this.blinkTimer += dt;
    if (this.blinkTimer >= this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkProgress = 0.0;
      this.blinkTimer = 0.0;
      this.nextBlinkInterval = 3.2 + Math.random() * 2.3;
    }

    let blinkWeight = 0.0;
    if (this.isBlinking) {
      this.blinkProgress += dt / 0.16;
      if (this.blinkProgress >= 1.0) {
        this.isBlinking = false;
        blinkWeight = 0.0;
      } else {
        blinkWeight = Math.sin(this.blinkProgress * Math.PI);
      }
    }
    this.smoothSetMorph("face_mesh8", blinkWeight, dt, 35.0);

    // 3. Румянец и блеск глаз:
    const targetCheek = this.giftReactionTimer > 0 ? 0.85 : (isTalking ? 0.45 : 0.35);
    const targetIris = this.giftReactionTimer > 0 ? 1.0 : (isTalking ? 0.2 : 0.0);
    this.smoothSetMorph("facial_cheek", targetCheek, dt, 10.0);
    this.smoothSetMorph("facial_irisHilight_Big", targetIris, dt, 10.0);
  }

  // Реакции на события пульта и чата
  setEmotion(name, durationMs = 4500) {
    const sec = durationMs / 1000.0;
    switch (name) {
      case "happy":
        this.bodyMode = "talk";
        this.flirtTimer = 3.0;
        break;
      case "excited":
      case "win":
        this.bodyMode = "dance";
        this.danceTimer = Math.max(5.0, sec);
        this.giftReactionTimer = 1.5;
        break;
      case "flirt":
      case "blush":
        this.bodyMode = "flirt";
        this.flirtTimer = Math.max(4.0, sec);
        break;
      case "laugh":
        this.bodyMode = "flirt";
        this.flirtTimer = 2.5;
        this.giftReactionTimer = 1.8;
        break;
      case "wave":
      case "greeting":
        this.bodyMode = "wave";
        this.waveTimer = 3.2;
        break;
      case "wink":
        this.bodyMode = "flirt";
        this.flirtTimer = 2.5;
        break;
      case "surprised":
      case "thinking":
        this.bodyMode = "talk";
        this.flirtTimer = 2.5;
        break;
      case "idle":
      case "neutral":
      default:
        this.bodyMode = "idle";
        this.danceTimer = 0;
        this.flirtTimer = 0;
        this.giftReactionTimer = 0;
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
