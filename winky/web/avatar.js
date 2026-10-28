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

// Камера 28° FOV на уровне груди и глаз (отодвинута по Z на 215, +12% для надежного запаса воздуха вокруг рук и ушей)
const camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 1.0, 1000.0);
camera.position.set(0, 120, 215);
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

// Разделение морфов лица по линии Y = 138.3:
// Ниже 138.3 — строго рот, губы, зубы, язык и челюсть
// Выше 138.3 — строго глаза, веки и брови
function setupSurgicalFaceMorphs(faceMesh) {
  if (!faceMesh || !faceMesh.geometry || !faceMesh.geometry.morphAttributes || !faceMesh.geometry.morphAttributes.position) return;
  const posAttr = faceMesh.geometry.attributes.position;
  const morphAttrs = faceMesh.geometry.morphAttributes.position;
  const dict = faceMesh.morphTargetDictionary || {};
  const isRelative = !!faceMesh.geometry.morphTargetsRelative;

  console.log(`[Winky Morph Surgery] Разделение морфов по Y = 138.3. Вершин: ${posAttr.count}, isRelative: ${isRelative}`);

  // Вспомогательная функция копирования части морфа srcName в dstName по фильтру вершин keepFn(bx, by, bz)
  function copyFilteredMorph(srcName, dstName, keepFn) {
    const srcIdx = dict[srcName] !== undefined ? dict[srcName] : dict[`blendShape1.${srcName}`];
    const dstIdx = dict[dstName] !== undefined ? dict[dstName] : dict[`blendShape1.${dstName}`];
    if (srcIdx === undefined || dstIdx === undefined || !morphAttrs[srcIdx] || !morphAttrs[dstIdx]) return;
    const srcAttr = morphAttrs[srcIdx];
    const dstAttr = morphAttrs[dstIdx];
    for (let i = 0; i < posAttr.count; i++) {
      const bx = posAttr.getX(i);
      const by = posAttr.getY(i);
      const bz = posAttr.getZ(i);
      if (keepFn(bx, by, bz)) {
        dstAttr.setXYZ(i, srcAttr.getX(i), srcAttr.getY(i), srcAttr.getZ(i));
      } else {
        dstAttr.setXYZ(i, isRelative ? 0 : bx, isRelative ? 0 : by, isRelative ? 0 : bz);
      }
    }
    dstAttr.needsUpdate = true;
  }

  // 1. Создаем ЧИСТЫЕ МОРФЫ РТА (только Y < 138.3, глаза вообще не двигаются!):
  // face_mesh5_2 -> MOUTH_A (милый открытый ротик «А» с розовым язычком из face_mesh1)
  copyFilteredMorph("face_mesh1", "face_mesh5_2", (bx, by) => by < 138.3);
  // face_mesh9_2 -> MOUTH_O (маленький круглый ротик «О/У» из face_mesh9)
  copyFilteredMorph("face_mesh9", "face_mesh9_2", (bx, by) => by < 138.3);
  // face_mesh6   -> MOUTH_E (средний рот «Э» — отсекаем глаза выше 138.3)
  copyFilteredMorph("face_mesh6", "face_mesh6", (bx, by) => by < 138.3);
  // face_mesh3   -> MOUTH_CAT (милая кошачья улыбка «:3» — только рот ниже 138.3)
  copyFilteredMorph("face_mesh3", "face_mesh3", (bx, by) => by < 138.3);
  // face_mesh4_2 -> MOUTH_SMILE (нежная закрытая полуулыбка — только рот ниже 138.3)
  copyFilteredMorph("face_mesh4_2", "face_mesh4_2", (bx, by) => by < 138.3);

  // 2. Создаем ЧИСТЫЕ МОРФЫ ГЛАЗ И БРОВЕЙ (только Y >= 138.3, рот не трогают!):
  // face_mesh1_2 -> EYES_HAPPY (счастливые глаза дугой ^ ^)
  copyFilteredMorph("face_mesh1_2", "face_mesh1_2", (bx, by) => by >= 138.3);
  // face_mesh3_2 -> EYES_WINK (настоящее подмигивание ОДНИМ правым глазом: Y >= 138.3 и X < 0!)
  copyFilteredMorph("face_mesh1_2", "face_mesh3_2", (bx, by) => by >= 138.3 && bx < 0.0);
  // face_mesh8   -> EYES_BLINK (естественное моргание обоими глазами)
  copyFilteredMorph("face_mesh8", "face_mesh8", (bx, by) => by >= 138.3);
  // face_mesh9   -> EYES_SURPRISED (широко распахнутые удивленные глаза)
  copyFilteredMorph("face_mesh9", "face_mesh9", (bx, by) => by >= 138.3);
  // face_mesh7   -> EYES_THINKING (задумчивые / сведенные бровки)
  copyFilteredMorph("face_mesh7", "face_mesh7", (bx, by) => by >= 138.3);
}

// Карта всех 9 эмоций пульта: глаза, рот в покое и наклон головы
const EMOTION_PRESETS = {
  idle:      { eyes: {},                                                                    idleMouth: { face_mesh4_2: 0.55 }, headTilt: [0.0, 0.0, 0.0] },
  neutral:   { eyes: {},                                                                    idleMouth: { face_mesh4_2: 0.45 }, headTilt: [0.0, 0.0, 0.0] },
  happy:     { eyes: { face_mesh1_2: 1.0, facial_cheek: 0.45 },                             idleMouth: { face_mesh5_2: 0.65 }, headTilt: [-0.04, 0.0, 0.06] },
  blush:     { eyes: { facial_cheek: 1.0, facial_irisHilight_Big: 0.8 },                    idleMouth: { face_mesh3: 1.0 },    headTilt: [0.06, 0.0, -0.08] },
  excited:   { eyes: { facial_irisHilight_Big: 1.0, facial_cheek: 0.7 },                    idleMouth: { face_mesh5_2: 0.85 }, headTilt: [-0.06, 0.0, 0.05] },
  wink:      { eyes: { face_mesh3_2: 1.0, facial_cheek: 0.6 },                              idleMouth: { face_mesh3: 0.90 },   headTilt: [0.02, 0.0, -0.12] },
  wave:      { eyes: { face_mesh1_2: 0.90, facial_cheek: 0.75 },                            idleMouth: { face_mesh5_2: 0.75 }, headTilt: [-0.03, 0.0, -0.12] },
  win:       { eyes: { face_mesh1_2: 1.0, facial_cheek: 1.0, facial_irisHilight_Big: 1.0 }, idleMouth: { face_mesh5_2: 0.90 }, headTilt: [-0.08, 0.0, 0.08] },
  surprised: { eyes: { face_mesh9: 1.0, facial_irisHilight_Big: 0.6 },                      idleMouth: { face_mesh9_2: 0.90 }, headTilt: [-0.06, 0.0, 0.0] },
  thinking:  { eyes: { face_mesh7: 1.0 },                                                   idleMouth: { face_mesh9_2: 0.45 }, headTilt: [0.05, 0.08, 0.12] },
};

// Вспомогательная функция плавного slerp кости к целевому углу Эйлера
const _tmpEuler = new THREE.Euler(0, 0, 0, "XYZ");
const _tmpQuat = new THREE.Quaternion();
function slerpBoneEuler(bone, rx, ry, rz, weight) {
  if (!bone) return;
  _tmpEuler.set(rx, ry, rz, "XYZ");
  _tmpQuat.setFromEuler(_tmpEuler);
  bone.quaternion.slerp(_tmpQuat, weight);
}

/* ==================== 4. Контроллер оригинального Shibahu FBX ==================== */

class ShibahuFBXController {
  constructor(fbx) {
    this.fbx = fbx;
    this.faceMesh = null;
    this.mixer = null;
    this.idleAction = null;
    this.animPhase = 0.0;

    // Находим face_mesh и сразу оперируем блендшейпы по Y = 138.3
    fbx.traverse((c) => {
      if (c.isMesh && c.name === "face_mesh") {
        this.faceMesh = c;
      }
    });
    if (this.faceMesh) {
      setupSurgicalFaceMorphs(this.faceMesh);
    }

    // 1. Инициализация авторской анимации Take 001 через AnimationMixer
    const rawClip = fbx.animations && fbx.animations[0];
    if (rawClip) {
      const clip = rawClip.clone();
      // Оставляем только вращение костей скелета (убираем морфы и смещение корня)
      clip.tracks = clip.tracks.filter(
        (t) => !t.name.includes("morphTargetInfluences") && !t.name.endsWith(".position")
      );
      this.mixer = new THREE.AnimationMixer(fbx);
      this.idleAction = this.mixer.clipAction(clip);
      this.idleAction.play();
      this.idleAction.time = 2.35;
      this.mixer.update(0);
      console.log(`[Winky] Скелетная анимация Take 001 подключена (${clip.tracks.length} костных треков вращения)`);
    }

    // 2. Индексируем кости скелета и пальцы
    this.bones = {};
    this.rightFingerBones = [];
    fbx.traverse((obj) => {
      if (obj.isBone) {
        this.bones[obj.name] = obj;
        if (obj.name.startsWith("Shibahu_RightHand") && obj.name !== "Shibahu_RightHand") {
          this.rightFingerBones.push(obj);
        }
      }
    });

    // Удобные алиасы ключевых костей
    this.bones.Hips = this.bones["Shibahu_Hips"];
    this.bones.Spine = this.bones["Shibahu_Spine"];
    this.bones.Neck = this.bones["Shibahu_Neck"];
    this.bones.Head = this.bones["Shibahu_Head"];
    this.bones.RightShoulder = this.bones["Shibahu_RightShoulder"];
    this.bones.RightArm = this.bones["Shibahu_RightArm"];
    this.bones.RightForeArm = this.bones["Shibahu_RightForeArm"];
    this.bones.RightHand = this.bones["Shibahu_RightHand"];
    this.bones.LeftShoulder = this.bones["Shibahu_LeftShoulder"];
    this.bones.LeftArm = this.bones["Shibahu_LeftArm"];
    this.bones.LeftForeArm = this.bones["Shibahu_LeftForeArm"];
    this.bones.LeftHand = this.bones["Shibahu_LeftHand"];

    // Параметры эмоций, взмаха и таймеров
    this.currentEmotion = "idle";
    this.previousEmotion = "idle";
    this.emotionTimer = 0.0;
    this.waveTimer = 0.0;
    this.waveWeight = 0.0;

    // Параметры звука и Lip-Sync
    this.smoothedRms = 0.0;
    this.targetRms = 0.0;
    this.nextBlinkInterval = 3.5;
    this.blinkTimer = 0.0;
    this.blinkProgress = 0.0;
    this.isBlinking = false;

    // Базовый вид в покое
    this.smoothSetMorph("face_mesh4_2", 0.55, 1.0, 100.0);
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

  // Авторская анимация Take 001 + процедурные акценты + кинематика взмаха
  updateBody(t, dt, isSpeaking, mouseX = 0, mouseY = 0) {
    // 1. Плавный пинг-понг анимации Take 001 на интервале 1.25s .. 3.45s
    if (this.idleAction && this.mixer) {
      const isEnergized = this.currentEmotion === "excited" || this.currentEmotion === "win";
      const bodySpeed = isSpeaking ? 0.75 : (isEnergized ? 0.85 : 0.42);
      this.animPhase += dt * bodySpeed;
      this.idleAction.time = 2.35 + 1.10 * Math.sin(this.animPhase);
      this.mixer.update(0);
    }

    const bones = this.bones;

    // 2. Слегка уменьшаем базовый разворот корпуса вбок из Take 001 (прямой взгляд в камеру)
    if (bones.Hips) {
      bones.Hips.rotation.setFromQuaternion(bones.Hips.quaternion, "XYZ");
      bones.Hips.rotation.y *= 0.45;
    }
    if (bones.Neck) {
      bones.Neck.rotation.setFromQuaternion(bones.Neck.quaternion, "XYZ");
      bones.Neck.rotation.y *= 0.45;
    }
    if (bones.Head) {
      bones.Head.rotation.setFromQuaternion(bones.Head.quaternion, "XYZ");
      bones.Head.rotation.y *= 0.45;

      // Наклон головы текущей эмоции из EMOTION_PRESETS
      const preset = EMOTION_PRESETS[this.currentEmotion] || EMOTION_PRESETS.idle;
      if (preset.headTilt) {
        bones.Head.rotation.x += preset.headTilt[0];
        bones.Head.rotation.y += preset.headTilt[1];
        bones.Head.rotation.z += preset.headTilt[2];
      }

      // Мягкие кивки головы в такт слогам при речи
      if (isSpeaking) {
        bones.Head.rotation.x += this.smoothedRms * 0.12;
      }

      // Деликатное слежение за курсором мыши
      bones.Head.rotation.y += mouseX * 0.10;
      bones.Head.rotation.x += mouseY * 0.06;
    }

    // 3. Во время речи — естественная жестикуляция ТОЛЬКО по анатомической оси сгиба локтя rotation.y
    if (isSpeaking && this.waveWeight < 0.05) {
      const talkLiftR = this.smoothedRms * 0.28 + (0.5 + 0.5 * Math.sin(t * 3.1)) * 0.14;
      const talkLiftL = this.smoothedRms * 0.22 + (0.5 + 0.5 * Math.cos(t * 2.6)) * 0.12;
      if (bones.RightForeArm) {
        bones.RightForeArm.rotation.setFromQuaternion(bones.RightForeArm.quaternion, "XYZ");
        bones.RightForeArm.rotation.y -= talkLiftR;
      }
      if (bones.LeftForeArm) {
        bones.LeftForeArm.rotation.setFromQuaternion(bones.LeftForeArm.quaternion, "XYZ");
        bones.LeftForeArm.rotation.y -= talkLiftL;
      }
    }

    // 4. Кинематика махания рукой (wave):
    if (this.waveTimer > 0) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0 && this.currentEmotion === "wave") {
        this.currentEmotion = this.previousEmotion || "idle";
      }
    }
    const targetWaveWeight = this.waveTimer > 0 ? 1.0 : 0.0;
    this.waveWeight += (targetWaveWeight - this.waveWeight) * Math.min(1.0, dt * (targetWaveWeight > 0 ? 9.0 : 6.0));

    if (this.waveWeight > 0.005) {
      const sway = Math.sin(t * 7.2) * 0.22;             // Горизонтальное качание предплечья влево-вправо
      const wristWave = Math.sin(t * 7.2 - 0.55) * 0.28; // Мягкий довод открытой ладошкой

      // 1. Локоть аккуратно опущен у правого бока и чуть выдвинут вперед
      slerpBoneEuler(bones.RightShoulder, 0.0, 0.0, 0.15, this.waveWeight);
      slerpBoneEuler(bones.RightArm, -0.61, 0.26, -1.09, this.waveWeight);

      // 2. Предплечье поднято вверх перед правым плечом, ладошка смотрит в камеру
      slerpBoneEuler(bones.RightForeArm, 1.75, -0.35 + sway, 2.15, this.waveWeight);

      // 3. Кисть машет влево-вправо в плоскости экрана по оси Y
      slerpBoneEuler(bones.RightHand, -0.10, 0.08 + wristWave, 0.44, this.waveWeight);

      // 4. Распрямляем пальчики правой руки, открывая ладошку
      for (const fingerBone of this.rightFingerBones) {
        fingerBone.rotation.setFromQuaternion(fingerBone.quaternion, "XYZ");
        fingerBone.rotation.z = THREE.MathUtils.lerp(fingerBone.rotation.z, -0.12, this.waveWeight);
      }

      // 5. Милый наклон головы и легкое покачивание в такт взмаху
      if (bones.Head) {
        bones.Head.rotation.z -= 0.14 * this.waveWeight;
        bones.Head.rotation.x += 0.05 * this.waveWeight;
      }
    }
  }

  // Обновление эмоций лица, моргания и бесконфликтного Lip-Sync
  updateFace(t, dt, isSpeaking, audioRms) {
    // 0. Таймер временных эмоций (если задан)
    if (this.emotionTimer > 0) {
      this.emotionTimer -= dt;
      if (this.emotionTimer <= 0) {
        this.currentEmotion = "idle";
      }
    }

    // 1. Сглаживание RMS звука для артикуляции
    this.targetRms = Math.max(0.0, Number(audioRms) || 0.0);
    const lerpSpeed = this.targetRms > this.smoothedRms ? 24.0 : 14.0;
    this.smoothedRms += (this.targetRms - this.smoothedRms) * Math.min(1.0, dt * lerpSpeed);

    const isTalking = this.smoothedRms > 0.025;
    const mouthOpen = isTalking ? Math.min(1.0, Math.pow(this.smoothedRms * 1.9, 0.85)) : 0.0;

    // Плавное гармоническое чередование гласных форм губ во время речи
    const syllableWave = 0.5 + 0.5 * Math.sin(t * 13.5);
    const subWave = 0.5 + 0.5 * Math.cos(t * 9.2);

    const preset = EMOTION_PRESETS[this.currentEmotion] || EMOTION_PRESETS.idle;

    // 2. Рот: Lip-sync во время речи, либо idleMouth текущей эмоции
    if (isTalking) {
      const targetMouthA = mouthOpen * (0.40 + 0.50 * syllableWave); // face_mesh5_2 (А)
      const targetMouthO = mouthOpen * (1.0 - syllableWave) * 0.75;  // face_mesh9_2 (О)
      const targetMouthE = mouthOpen * subWave * 0.25;               // face_mesh6 (Э)
      this.smoothSetMorph("face_mesh5_2", targetMouthA, dt, 24.0);
      this.smoothSetMorph("face_mesh9_2", targetMouthO, dt, 24.0);
      this.smoothSetMorph("face_mesh6",   targetMouthE, dt, 24.0);
      this.smoothSetMorph("face_mesh3",   0.0, dt, 20.0);
      this.smoothSetMorph("face_mesh4_2", 0.10, dt, 15.0);
    } else {
      const idle = preset.idleMouth || {};
      this.smoothSetMorph("face_mesh5_2", idle.face_mesh5_2 || 0.0, dt, 15.0);
      this.smoothSetMorph("face_mesh9_2", idle.face_mesh9_2 || 0.0, dt, 15.0);
      this.smoothSetMorph("face_mesh6",   idle.face_mesh6   || 0.0, dt, 15.0);
      this.smoothSetMorph("face_mesh3",   idle.face_mesh3   || 0.0, dt, 15.0);
      this.smoothSetMorph("face_mesh4_2", idle.face_mesh4_2 !== undefined ? idle.face_mesh4_2 : 0.45, dt, 15.0);
    }

    // 3. Глаза, брови, румянец и блеск глаз (всегда стремятся к preset.eyes)
    const eyes = preset.eyes || {};
    const eyeMorphs = ["face_mesh1_2", "face_mesh3_2", "face_mesh7", "face_mesh9", "facial_cheek", "facial_irisHilight_Big"];
    for (const mName of eyeMorphs) {
      const target = eyes[mName] || 0.0;
      this.smoothSetMorph(mName, target, dt, 14.0);
    }

    // 4. Авто-моргание раз в 3.2–5.5 сек
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
      } else {
        blinkWeight = Math.sin(this.blinkProgress * Math.PI);
      }
    }

    // Если в текущей эмоции глаза уже закрыты (^ ^ или wink), отключаем авто-моргание
    const eyesAlreadyClosed = (eyes.face_mesh1_2 || 0) > 0.5 || (eyes.face_mesh3_2 || 0) > 0.5;
    if (eyesAlreadyClosed) {
      blinkWeight = 0.0;
    }
    this.smoothSetMorph("face_mesh8", blinkWeight, dt, 35.0);

    // 5. Запрет паразитных морфов оскала и старых каналов
    this.smoothSetMorph("face_mesh1", 0.0, dt, 30.0);
    this.smoothSetMorph("face_mesh2", 0.0, dt, 30.0);
    this.smoothSetMorph("face_mesh4", 0.0, dt, 30.0);
    this.smoothSetMorph("face_mesh5", 0.0, dt, 30.0);
  }

  // Реакции на события пульта и чата
  setEmotion(name, durationMs = 0) {
    if (name === "wave") {
      this.wave();
      return;
    }
    if (name === "win") {
      this.onWin();
      return;
    }
    this.currentEmotion = EMOTION_PRESETS[name] ? name : "idle";
    this.emotionTimer = durationMs > 0 ? durationMs / 1000.0 : 0;
  }

  wave() {
    this.waveTimer = 3.2;
    if (this.currentEmotion !== "wave") {
      this.previousEmotion = this.currentEmotion;
    }
    this.currentEmotion = "wave";
  }

  onWin() {
    this.currentEmotion = "win";
    this.emotionTimer = 6.0;
  }

  onGift(giftName = "") {
    this.currentEmotion = "excited";
    this.emotionTimer = 5.0;
  }

  playBodyMotion(motion) {
    if (motion === "wave") {
      this.wave();
    } else if (motion === "dance") {
      this.onWin();
    } else {
      this.setEmotion(motion);
    }
  }

  setAudioFormants(f) {
    this.vowelFormants = f;
  }

  update(delta, elapsed, isSpeaking, audioRms = 0) {
    this.updateBody(elapsed, delta, isSpeaking, mouseX, mouseY);
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

        console.log("[Winky] Оригинальный Shibahu FBX успешно загружен: Take 001 активен, 0% клиппинга!");
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
  if (emo === "wave") {
    window.winkyWave();
  } else if (emo === "win") {
    window.winkyOnWin();
  } else {
    vtuber.setEmotion(emo, 0); // 0 = бессрочно из пульта до следующего клика
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
