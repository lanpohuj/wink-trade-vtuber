"""Конвертер Shibahu FBX в стандартный VRM через Blender 4.2 LTS."""

import os
import sys
from pathlib import Path
import bpy

# Базовые пути
PROJECT_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = PROJECT_DIR / "winky" / "web" / "model"
FBX_PATH = MODEL_DIR / "shibahu.fbx"
TEXTURE_DIR = MODEL_DIR / "Texture"
OUTPUT_VRM = MODEL_DIR / "avatar.vrm"

print(f"=== Конвертация {FBX_PATH} -> {OUTPUT_VRM} ===")

# 1. Очистка сцены (без factory reset, чтобы сохранить активные расширения)
if bpy.context.object and bpy.context.object.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

# 2. Импорт FBX
bpy.ops.import_scene.fbx(filepath=str(FBX_PATH), use_custom_normals=True)

# 3. Удаление мешей черного контура (*_line) и лишних объектов
delete_names = [
    "body_line", "dogtag_line", "hairA_line", "hairB_1_line",
    "hairB_2_line", "hairB_3_line", "jacket_line", "jacketFur_line",
    "pants_line", "shirts_line", "shoes_line", "socks_line",
    "tail_line", "base_mesh"
]
for obj in list(bpy.data.objects):
    if obj.name in delete_names or obj.name.endswith("_line"):
        print(f"Удаляю контурный объект: {obj.name}")
        bpy.data.objects.remove(obj, do_unlink=True)

# 4. Настройка текстур и материалов (используем чистые оригинальные сочные текстуры без пересвета)
TEX_MAP = {
    "Face_mt": "Shibahu_face_dif.png",
    "Body_mt": "Shibahu_body_dif.png",
    "HairA_mt": "Shibahu_hairA_dif.png",
    "HairB_mt": "Shibahu_hairB_dif.png",
    "CosA_mt": "Shibahu_cosA_dif.png",
    "CosB_mt": "Shibahu_cosB_dif.png",
}

for mat_name, tex_file in TEX_MAP.items():
    mat = bpy.data.materials.get(mat_name)
    if not mat:
        mat = bpy.data.materials.new(name=mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    # Выход материала
    output_node = nodes.new(type="ShaderNodeOutputMaterial")
    bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    links.new(bsdf.outputs["BSDF"], output_node.inputs["Surface"])

    tex_path = TEXTURE_DIR / tex_file
    if tex_path.exists():
        img = bpy.data.images.load(str(tex_path), check_existing=True)
        img.colorspace_settings.name = "sRGB"
        tex_node = nodes.new(type="ShaderNodeTexImage")
        tex_node.image = img
        links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
        # Чистый Toon без пересвета: нулевая эмиссия, умеренная матовость
        bsdf.inputs["Roughness"].default_value = 0.85
        try:
            bsdf.inputs["Specular IOR Level"].default_value = 0.1
        except Exception:
            pass
        print(f"Материал {mat_name} привязан к текстуре {tex_file}")

# Cheek_mt (румянец)
cheek_mat = bpy.data.materials.get("Cheek_mt")
if cheek_mat:
    cheek_mat.use_nodes = True
    c_nodes = cheek_mat.node_tree.nodes
    c_links = cheek_mat.node_tree.links
    c_nodes.clear()
    c_out = c_nodes.new(type="ShaderNodeOutputMaterial")
    c_bsdf = c_nodes.new(type="ShaderNodeBsdfPrincipled")
    c_links.new(c_bsdf.outputs["BSDF"], c_out.inputs["Surface"])
    c_bsdf.inputs["Base Color"].default_value = (1.0, 0.4, 0.55, 1.0)
    c_bsdf.inputs["Roughness"].default_value = 1.0
    cheek_tex = TEXTURE_DIR / "Shibahu_cheek_msk.png"
    if cheek_tex.exists():
        c_img = bpy.data.images.load(str(cheek_tex), check_existing=True)
        c_img.colorspace_settings.name = "Non-Color"
        c_tex = c_nodes.new(type="ShaderNodeTexImage")
        c_tex.image = c_img
        c_links.new(c_tex.outputs["Color"], c_bsdf.inputs["Alpha"])
        cheek_mat.blend_method = "BLEND"

# Контурные материалы (*_line, lineA_mt): полная прозрачность, чтобы исключить черный налёт на лице
for line_mat_name in ["lineA_mt", "lineB_mt", "lineC_mt"]:
    l_mat = bpy.data.materials.get(line_mat_name)
    if l_mat:
        l_mat.use_nodes = True
        l_mat.node_tree.nodes.clear()
        l_out = l_mat.node_tree.nodes.new(type="ShaderNodeOutputMaterial")
        l_bsdf = l_mat.node_tree.nodes.new(type="ShaderNodeBsdfPrincipled")
        l_mat.node_tree.links.new(l_bsdf.outputs["BSDF"], l_out.inputs["Surface"])
        l_bsdf.inputs["Alpha"].default_value = 0.0
        l_mat.blend_method = "BLEND"

# 5. Очистка формы рта от прищура век (pure jaw)
face_mesh = bpy.data.objects.get("face_mesh")
if face_mesh and face_mesh.data.shape_keys:
    skeys = face_mesh.data.shape_keys.key_blocks
    basis = skeys["Basis"]
    # Очищаем все ротовые морфы, чтобы при речи глаза оставались 100% открытыми
    for m_name in ["face_mesh10", "face_mesh2", "face_mesh8"]:
        morph_key = skeys.get(m_name)
        if morph_key:
            print(f"Очищаю морф {m_name} от смещения в зоне глаз...")
            for idx, pt in enumerate(morph_key.data):
                base_pt = basis.data[idx].co
                if base_pt.z > 0.0:
                    pt.co = base_pt

# 6. Настройка Humanoid Armature для VRM
armature_obj = bpy.data.objects.get("Shibahu_Reference")
if not armature_obj:
    raise RuntimeError("Не найден Armature 'Shibahu_Reference'")

bpy.context.view_layer.objects.active = armature_obj
armature_data = armature_obj.data

# Привязка костей к VRM Humanoid
HUMAN_BONE_MAP = {
    "hips": "Shibahu_Hips",
    "spine": "Shibahu_Spine",
    "chest": "Shibahu_Spine1",
    "upperChest": "Shibahu_Spine2",
    "neck": "Shibahu_Neck",
    "head": "Shibahu_Head",
    "leftShoulder": "Shibahu_LeftShoulder",
    "leftUpperArm": "Shibahu_LeftArm",
    "leftLowerArm": "Shibahu_LeftForeArm",
    "leftHand": "Shibahu_LeftHand",
    "rightShoulder": "Shibahu_RightShoulder",
    "rightUpperArm": "Shibahu_RightArm",
    "rightLowerArm": "Shibahu_RightForeArm",
    "rightHand": "Shibahu_RightHand",
    "leftUpperLeg": "Shibahu_LeftUpLeg",
    "leftLowerLeg": "Shibahu_LeftLeg",
    "leftFoot": "Shibahu_LeftFoot",
    "leftToes": "Shibahu_LeftToeBase",
    "rightUpperLeg": "Shibahu_RightUpLeg",
    "rightLowerLeg": "Shibahu_RightLeg",
    "rightFoot": "Shibahu_RightFoot",
    "rightToes": "Shibahu_RightToeBase",
    # Пальцы левой руки
    "leftThumbMetacarpal": "Shibahu_LeftHandThumb1",
    "leftThumbProximal": "Shibahu_LeftHandThumb2",
    "leftThumbDistal": "Shibahu_LeftHandThumb3",
    "leftIndexProximal": "Shibahu_LeftHandIndex1",
    "leftIndexIntermediate": "Shibahu_LeftHandIndex2",
    "leftIndexDistal": "Shibahu_LeftHandIndex3",
    "leftMiddleProximal": "Shibahu_LeftHandMiddle1",
    "leftMiddleIntermediate": "Shibahu_LeftHandMiddle2",
    "leftMiddleDistal": "Shibahu_LeftHandMiddle3",
    "leftRingProximal": "Shibahu_LeftHandRing1",
    "leftRingIntermediate": "Shibahu_LeftHandRing2",
    "leftRingDistal": "Shibahu_LeftHandRing3",
    "leftLittleProximal": "Shibahu_LeftHandPinky1",
    "leftLittleIntermediate": "Shibahu_LeftHandPinky2",
    "leftLittleDistal": "Shibahu_LeftHandPinky3",
    # Пальцы правой руки
    "rightThumbMetacarpal": "Shibahu_RightHandThumb1",
    "rightThumbProximal": "Shibahu_RightHandThumb2",
    "rightThumbDistal": "Shibahu_RightHandThumb3",
    "rightIndexProximal": "Shibahu_RightHandIndex1",
    "rightIndexIntermediate": "Shibahu_RightHandIndex2",
    "rightIndexDistal": "Shibahu_RightHandIndex3",
    "rightMiddleProximal": "Shibahu_RightHandMiddle1",
    "rightMiddleIntermediate": "Shibahu_RightHandMiddle2",
    "rightMiddleDistal": "Shibahu_RightHandMiddle3",
    "rightRingProximal": "Shibahu_RightHandRing1",
    "rightRingIntermediate": "Shibahu_RightHandRing2",
    "rightRingDistal": "Shibahu_RightHandRing3",
    "rightLittleProximal": "Shibahu_RightHandPinky1",
    "rightLittleIntermediate": "Shibahu_RightHandPinky2",
    "rightLittleDistal": "Shibahu_RightHandPinky3",
}

ext = armature_data.vrm_addon_extension
vrm0 = ext.vrm0

# Назначаем метаданные
vrm0.meta.title = "Shibahu"
vrm0.meta.version = "1.0"
vrm0.meta.author = "Wink Trade"

# Очищаем и заново заполняем humanoid кости
vrm0.humanoid.human_bones.clear()
for vrm_bone_name, arm_bone_name in HUMAN_BONE_MAP.items():
    if arm_bone_name in armature_data.bones:
        hb = vrm0.humanoid.human_bones.add()
        hb.bone = vrm_bone_name
        hb.node.bone_name = arm_bone_name
print(f"Привязано {len(vrm0.humanoid.human_bones)} костей к VRM Humanoid")

# 7. Настройка Blendshape Presets
if face_mesh and face_mesh.data.shape_keys:
    skeys = face_mesh.data.shape_keys.key_blocks
    
    # Словарь привязок стандартных выражений VRM к морфам Shibahu
    PRESET_BINDS = {
        "a": [("face_mesh10", 1.0)],
        "i": [("face_mesh10", 0.35)],
        "u": [("face_mesh8", 0.7)],
        "e": [("face_mesh10", 0.45)],
        "o": [("face_mesh8", 1.0)],
        "blink": [("face_mesh1", 1.0), ("face_mesh1_2", 1.0)],
        "blink_l": [("face_mesh1", 1.0)],
        "blink_r": [("face_mesh1_2", 1.0)],
        "joy": [("facial_irisHilight_Big", 1.0), ("facial_cheek", 0.4)],
        "fun": [("face_mesh10", 0.45), ("facial_irisHilight_Big", 1.0), ("facial_cheek", 0.5)],
        "sorrow": [("facial_cheek", 0.2)],
        "angry": [("face_mesh8", 0.3)],
    }

    # Очищаем старые группы
    vrm0.blend_shape_master.blend_shape_groups.clear()
    for preset_name, binds in PRESET_BINDS.items():
        grp = vrm0.blend_shape_master.blend_shape_groups.add()
        grp.name = preset_name
        grp.preset_name = preset_name
        for morph_name, weight in binds:
            if morph_name in skeys:
                b = grp.binds.add()
                b.mesh.mesh_object_name = face_mesh.name
                b.index = morph_name
                b.weight = weight
    print(f"Настроено {len(vrm0.blend_shape_master.blend_shape_groups)} VRM BlendShape групп")

# 8. Настройка SpringBone (физика волос, ушек и хвоста)
spring_bone_roots = [
    "Shibahu_Ahoge1", "Shibahu_HairA1", "Shibahu_HairB1", "Shibahu_HairC1",
    "Shibahu_Ear_Left1", "Shibahu_Ear_Right1",
    "Shibahu_Dogtag1",
    "Shibahu_Tail2"
]
vrm0.secondary_animation.bone_groups.clear()
for root_bone in spring_bone_roots:
    if root_bone in armature_data.bones:
        bg = vrm0.secondary_animation.bone_groups.add()
        b_node = bg.bones.add()
        b_node.bone_name = root_bone
        bg.stiffiness = 0.5
        bg.drag_force = 0.4
        bg.gravity_power = 0.05
print(f"Добавлено {len(vrm0.secondary_animation.bone_groups)} SpringBone групп")

# 9. Экспорт в VRM
print(f"Экспортирую модель в {OUTPUT_VRM}...")
bpy.ops.export_scene.vrm(filepath=str(OUTPUT_VRM))
print(f"=== Успешно сгенерирован {OUTPUT_VRM} (размер: {OUTPUT_VRM.stat().st_size} байт) ===")
