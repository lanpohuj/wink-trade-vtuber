/* Calibrate against the actual authored FBX skeleton once, never on every frame. */
import * as THREE from "three";
const specs = {
  wave: { Right: [-13, 135, 18] },
  cheer: { Right: [-13, 135, 18], Left: [13, 135, 18] },
  dance: { Right: [-12, 115, 20], Left: [12, 115, 20] },
  explain_right: { Right: [-14, 113, 19] },
  explain_left: { Left: [14, 113, 19] },
  compare: { Right: [-13, 114, 19], Left: [13, 114, 19] },
  point: { Right: [-12, 125, 19] },
  beat: { Right: [-14, 112, 18] },
  shrug: { Right: [-14, 117, 19], Left: [14, 117, 19] },
  hand_chest: { Right: [-4, 119, 19] },
  thank_bow: { Right: [-4, 119, 19] },
  thumbs_up: { Right: [-12, 121, 19] },
  clap: { Right: [-4, 116, 23], Left: [4, 116, 23] },
  fist_pump: { Right: [-13, 125, 19] },
  think: { Right: [-6, 123, 20] },
  shy: { Right: [-8, 108, 19], Left: [8, 108, 19] },
  neko_paws: { Right: [-10, 130, 19], Left: [10, 130, 19] },
};
const v = new THREE.Vector3(),
  e = new THREE.Euler(),
  q = new THREE.Quaternion();
function position(bone) {
  return bone.getWorldPosition(new THREE.Vector3());
}
export function calibrateArms(controller) {
  const { fbx, bones, baseRotations: base } = controller,
    poses = {},
    report = [];
  const saved = {};
  for (const [name, bone] of Object.entries(bones))
    if (name.startsWith("Shibahu_")) saved[name] = bone.quaternion.clone();
  const reset = () => {
    for (const [name, quat] of Object.entries(saved))
      bones[name].quaternion.copy(quat);
    fbx.updateMatrixWorld(true);
  };
  try {
    for (const [action, sides] of Object.entries(specs)) {
      poses[action] = {};
      for (const [side, point] of Object.entries(sides)) {
        reset();
        const names = [`Shibahu_${side}Arm`, `Shibahu_${side}ForeArm`];
        if (names.some((n) => !bones[n])) continue;
        const hand = bones[`Shibahu_${side}Hand`];
        if (!hand) continue;
        const target = new THREE.Vector3(...point).applyMatrix4(
          fbx.matrixWorld,
        );
        const x = [-0.4, -0.2, 0, 1.4, -0.4, 1.5];
        function apply() {
          for (let i = 0; i < 2; i++) {
            const b = base[names[i]];
            e.set(
              b.x + x[i * 3],
              b.y + x[i * 3 + 1],
              b.z + x[i * 3 + 2],
              "XYZ",
            );
            bones[names[i]].quaternion.setFromEuler(e);
          }
          fbx.updateMatrixWorld(true);
        }
        const cost = () => {
          apply();
          const distance = hand.getWorldPosition(v).distanceToSquared(target);
          const elbow = position(bones[names[1]]);
          const outside = Math.max(0, Math.abs(elbow.x) - 17.5);
          return (
            distance +
            outside * outside * 3 +
            x.reduce((sum, n) => sum + n * n, 0) * 0.015
          );
        };
        let best = cost();
        for (const step of [0.5, 0.25, 0.12, 0.06, 0.025, 0.01, 0.004]) {
          for (let pass = 0; pass < 30; pass++) {
            let improved = false;
            for (let axis = 0; axis < 6; axis++) {
              const old = x[axis];
              let val = old;
              for (const sign of [-1, 1]) {
                x[axis] = Math.max(-2.8, Math.min(2.8, old + sign * step));
                const c = cost();
                if (c < best) {
                  best = c;
                  val = x[axis];
                  improved = true;
                }
              }
              x[axis] = val;
            }
            if (!improved) break;
          }
        }
        apply();
        const error = position(hand).distanceTo(target);
        for (let i = 0; i < 2; i++)
          poses[action][names[i]] = x.slice(i * 3, i * 3 + 3);
        // Orient an open palm from actual finger roots, not assumed Maya bone axes.
        const index = bones[`Shibahu_${side}HandIndex1`],
          pinky = bones[`Shibahu_${side}HandPinky1`],
          middle = bones[`Shibahu_${side}HandMiddle1`];
        if (index && pinky && middle) {
          const wrist = position(hand),
            inverse = hand.getWorldQuaternion(new THREE.Quaternion()).invert();
          const tip =
            action === "thumbs_up"
              ? bones[`Shibahu_${side}HandThumb3`] || middle
              : middle;
          const along = position(tip)
            .sub(wrist)
            .applyQuaternion(inverse)
            .normalize();
          const across = position(index)
            .sub(position(pinky))
            .applyQuaternion(inverse)
            .normalize();
          const normal = new THREE.Vector3()
            .crossVectors(across, along)
            .normalize();
          // The two hands have mirrored local axes; align the palm rather than twisting the forearm.
          if (side === "Left") normal.negate();
          const localX = new THREE.Vector3()
            .crossVectors(along, normal)
            .normalize();
          const localZ = new THREE.Vector3()
            .crossVectors(localX, along)
            .normalize();
          const localFrame = new THREE.Matrix4().makeBasis(
            localX,
            along,
            localZ,
          );
          let direction = new THREE.Vector3(0, 1, 0),
            normalTarget = new THREE.Vector3(0, 0, 1);
          if (
            [
              "explain_right",
              "explain_left",
              "compare",
              "shrug",
              "beat",
            ].includes(action)
          ) {
            direction.set(0, 0.35, 1).normalize();
            normalTarget.set(0, 1, -0.35).normalize();
          }
          if (action === "hand_chest" || action === "thank_bow") {
            direction.set(side === "Right" ? 0.7 : -0.7, 0.7, 0).normalize();
            normalTarget.set(0, 0, -1);
          }
          if (action === "shy") {
            direction.set(side === "Right" ? 0.35 : -0.35, -1, 0).normalize();
            normalTarget.set(0, 0, -1);
          }
          if (action === "think") {
            direction.set(0, 1, 0);
            normalTarget.set(1, 0, 0);
          }
          if (action === "clap") {
            direction.set(0, 1, 0);
            normalTarget.set(side === "Right" ? 1 : -1, 0, 0);
          }
          const desiredX = new THREE.Vector3()
            .crossVectors(direction, normalTarget)
            .normalize();
          const desiredZ = new THREE.Vector3()
            .crossVectors(desiredX, direction)
            .normalize();
          const desiredFrame = new THREE.Matrix4().makeBasis(
            desiredX,
            direction,
            desiredZ,
          );
          q.setFromRotationMatrix(desiredFrame.multiply(localFrame.invert()));
          q.premultiply(
            hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert(),
          );
          e.setFromQuaternion(q, "XYZ");
          const b = base[hand.name];
          poses[action][hand.name] = [e.x - b.x, e.y - b.y, e.z - b.z];
        }
        report.push({
          action,
          side,
          error_cm: Number(error.toFixed(3)),
          wrist: position(hand).toArray(),
          target: target.toArray(),
        });
      }
    }
  } finally {
    reset();
  }
  return { poses, report };
}
