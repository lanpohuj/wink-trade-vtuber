/* Small, non-looping clips from the character's own authored skeleton animation. */
export function authoredGesture(window, start, end) {
  const v = window.vtuber,
    THREE = window.THREE;
  for (const [name, base] of Object.entries(v.baseRotations)) {
    const bone = v.bones[name];
    bone.rotation.set(base.x, base.y, base.z, "XYZ");
    const p = v.basePositions[name];
    bone.position.set(p.x, p.y, p.z);
  }
  const source = v.fbx.animations[0];
  const tracks = source.tracks.filter((track) => {
    const split = track.name.lastIndexOf("."),
      name = track.name.slice(0, split),
      property = track.name.slice(split + 1);
    return (
      v.bones[name] &&
      name !== "Shibahu_Hips" &&
      name !== "Shibahu_Reference" &&
      ["quaternion", "position", "scale"].includes(property)
    );
  });
  const clip = new THREE.AnimationClip(
    "single-authored-gesture",
    source.duration,
    tracks,
  );
  const mixer = new THREE.AnimationMixer(v.fbx),
    action = mixer.clipAction(clip);
  action.play();
  action.paused = true;
  const born = performance.now() / 1000,
    length = end - start,
    total = length + 1.1,
    face = v.updateFace.bind(v);
  const ease = (x) => {
    x = Math.max(0, Math.min(1, x));
    return x * x * x * (10 + x * (-15 + 6 * x));
  };
  v.currentEmotion = "idle";
  v.waveTimer = 0;
  v.actionMode = null;
  v.actionTimer = 0;
  v.idleFlirtTimer = 60;
  v.update = (dt, t) => {
    const elapsed = performance.now() / 1000 - born;
    action.time = start + Math.max(0, Math.min(length, elapsed - 0.5));
    action.setEffectiveWeight(
      ease(Math.min(elapsed / 0.5, (total - elapsed) / 0.6)),
    );
    mixer.update(0);
    face(t, Math.min(0.05, dt), false, 0);
  };
  return {
    duration: total,
    stop() {
      action.setEffectiveWeight(0);
      mixer.update(0);
      mixer.stopAllAction();
    },
  };
}
