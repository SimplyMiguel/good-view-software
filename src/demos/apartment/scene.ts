import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { INCH, variantsById, type Placement } from "./catalog";
import { buildPiece } from "./builders";
import { floorboards, mottle } from "./textures";

export interface HoverEvent {
  id: string | null;
  x: number;
  y: number;
}
export interface Dimension {
  a: { x: number; y: number };
  b: { x: number; y: number };
  label: string;
}

export interface Dimensions {
  width: Dimension;
  depth: Dimension;
  height: Dimension;
}

export interface PlacementEvent {
  placement: Placement;
}

export interface Viewer {
  setPlacements(placements: Placement[]): void;
  getPlacements(): Placement[];
  /** Intersects the room at screen coordinates; returns a snapped floor point. */
  floorPointAt(x: number, y: number): { x: number; z: number } | null;
  setHoverListener(cb: (e: HoverEvent) => void): void;
  setSelectListener(cb: (e: HoverEvent) => void): void;
  setMoveListener(cb: (e: PlacementEvent | null) => void): void;
  /** Called after every rendered frame; keeps DOM overlays glued to the 3D scene. */
  setFrameListener(cb: () => void): void;
  setHighlight(id: string | null): void;
  /** Measured edges of the piece's bounding box in canvas CSS px, or null for an unknown id. */
  anchors(id: string): Dimensions | null;
  /** Canvas-local CSS px of a piece's visual centre, or null for an unknown id. */
  centre(id: string): { x: number; y: number } | null;
  resetView(): void;
  /** "orbit" inspects the room; "walk" stands you inside it at eye height. */
  setMode(mode: "orbit" | "walk"): void;
  getMode(): "orbit" | "walk";
  /** True when a piece of that size would fit inside the room without overlapping. */
  fits(variantId: string, x: number, z: number, rotationY?: number, ignoreId?: string): boolean;
  /** Fires true when a drag was rejected (piece snapped back), false when it clears. */
  setBlockedListener(cb: (blocked: boolean) => void): void;
  /** Walk mode: stand at (x, z) looking toward (lookX, lookZ). */
  standAt(x: number, z: number, lookX: number, lookZ: number): void;
  /** Where the walker is standing, in room metres. */
  eye(): { x: number; z: number };
  /** What is painted on a piece right now: "red" (clipping), "selected", or "none". */
  tint(id: string): "red" | "selected" | "none" | null;
}

const ROOM_W = 6.4;
const ROOM_D = 5.6;
const WALL_H = 2.7;
const WALL_T = 0.12;

const HIGHLIGHT = new THREE.Color(0x3a2f1e);
const BLOCKED = new THREE.Color(0xd8202a);
const NONE = new THREE.Color(0x000000);

/** Usable floor: the wall boxes eat WALL_T from the inside of the floor edge on the back and left. */
const FLOOR_MIN_X = -ROOM_W / 2 + WALL_T;
const FLOOR_MAX_X = ROOM_W / 2 - WALL_T;
const FLOOR_MIN_Z = -ROOM_D / 2 + WALL_T;
const FLOOR_MAX_Z = ROOM_D / 2 - WALL_T;

const EYE_HEIGHT = 1.55;
const PERSON_RADIUS = 0.26;
const WALK_SPEED = 1.7;

export function createViewer(container: HTMLElement): Viewer {
  const canvas = container.querySelector("canvas") ?? container.appendChild(document.createElement("canvas"));

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    throw new Error("WebGL is unavailable");
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.display = "block";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f3ee);

  // Soft interior reflections from a procedural room — no HDR download.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const environment = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.4;

  const measure = () => {
    const rect = container.getBoundingClientRect();
    return { width: Math.max(rect.width, 1), height: Math.max(rect.height, 1), rect };
  };
  const initial = measure();

  const camera = new THREE.PerspectiveCamera(40, initial.width / initial.height, 0.05, 100);
  camera.position.set(7.4, 6.1, 8.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.85, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 4.5;
  controls.maxDistance = 17;
  controls.minPolarAngle = 0.45;
  controls.maxPolarAngle = 1.32;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.8;
  controls.update();
  controls.saveState();

  let dirty = true;
  let walkMode = false;
  controls.addEventListener("change", () => {
    dirty = true;
  });

  // ── Room shell ────────────────────────────────────────────────────────────
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: "#b79b72", roughness: 0.58, map: floorboards(3.5, 3) }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMaterial = () =>
    new THREE.MeshStandardMaterial({ color: "#ece7de", roughness: 0.94, map: mottle(1.5, 1, 0.012) });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, WALL_H, WALL_T), wallMaterial());
  backWall.position.set(0, WALL_H / 2, -ROOM_D / 2 + WALL_T / 2);
  backWall.receiveShadow = true;
  scene.add(backWall);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, ROOM_D), wallMaterial());
  leftWall.position.set(-ROOM_W / 2 + WALL_T / 2, WALL_H / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // The other two walls exist only while you are standing inside the room.
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, ROOM_D), wallMaterial());
  rightWall.position.set(ROOM_W / 2 - WALL_T / 2, WALL_H / 2, 0);
  rightWall.receiveShadow = true;
  rightWall.visible = false;
  scene.add(rightWall);
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, WALL_H, WALL_T), wallMaterial());
  frontWall.position.set(0, WALL_H / 2, ROOM_D / 2 - WALL_T / 2);
  frontWall.receiveShadow = true;
  frontWall.visible = false;
  scene.add(frontWall);

  // Shadow-only ground beyond the room: the floor edge stops being a hard cut.
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.16 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.002;
  apron.receiveShadow = true;
  scene.add(apron);

  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x6f6659, 0.5));
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  const sun = new THREE.DirectionalLight(0xfff3e2, 2.2);
  sun.position.set(5.4, 8.6, 5.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  const shadowCamera = sun.shadow.camera;
  shadowCamera.left = -6;
  shadowCamera.right = 6;
  shadowCamera.top = 6;
  shadowCamera.bottom = -6;
  shadowCamera.far = 26;
  shadowCamera.updateProjectionMatrix();
  scene.add(sun);

  // Window bounce from the open, cut-away side.
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.55);
  fill.position.set(-6, 3.4, 4.5);
  scene.add(fill);

  // ── Pieces ────────────────────────────────────────────────────────────────
  const pieceRoot = new THREE.Group();
  scene.add(pieceRoot);

  const groups = new Map<string, THREE.Group>();
  const materials = new Map<string, THREE.MeshStandardMaterial[]>();
  const pickables: THREE.Mesh[] = [];
  let placements: Placement[] = [];

  /** Footprint on the floor, in metres; a 90° turn swaps width and depth. */
  const footprintOf = (variantId: string, rotationY = 0) => {
    const variant = variantsById.get(variantId);
    const turned = Math.abs(Math.sin(rotationY)) > 0.7;
    const w = variant ? (turned ? variant.d : variant.w) * INCH : 0.6;
    const d = variant ? (turned ? variant.w : variant.d) * INCH : 0.6;
    return { w, d, halfW: w / 2, halfD: d / 2 };
  };
  const footprint = (placement: Placement) => footprintOf(placement.variantId, placement.rotationY);

  /** Tolerates float noise only; nothing may actually enter a wall. */
  const EPS = 0.002;

  /** A footprint must sit fully on the usable floor, i.e. inside the wall faces. */
  const insideRoom = (halfW: number, halfD: number, x: number, z: number) =>
    x - halfW >= FLOOR_MIN_X - EPS &&
    x + halfW <= FLOOR_MAX_X + EPS &&
    z - halfD >= FLOOR_MIN_Z - EPS &&
    z + halfD <= FLOOR_MAX_Z + EPS;

  /** Nearest in-room centre for a footprint, used to preview a drag against the wall. */
  const clampToFloor = (halfW: number, halfD: number, x: number, z: number) => ({
    x: Math.min(FLOOR_MAX_X - halfW, Math.max(FLOOR_MIN_X + halfW, x)),
    z: Math.min(FLOOR_MAX_Z - halfD, Math.max(FLOOR_MIN_Z + halfD, z)),
  });

  /**
   * True when a piece can stand at (x, z): fully inside the walls and not
   * overlapping any other piece. Rugs are floor coverings: furniture may stand
   * on them, and a rug may slide under furniture.
   */
  const fitsAt = (variantId: string, x: number, z: number, rotationY = 0, ignoreId?: string) => {
    const variant = variantsById.get(variantId);
    if (!variant) return false;
    const f = footprintOf(variantId, rotationY);
    if (!insideRoom(f.halfW, f.halfD, x, z)) return false;
    if (variant.kind === "rug") return true;
    for (const other of placements) {
      if (other.id === ignoreId) continue;
      const ov = variantsById.get(other.variantId);
      if (!ov || ov.kind === "rug") continue;
      const o = footprint(other);
      if (Math.abs(x - other.x) < f.halfW + o.halfW - EPS && Math.abs(z - other.z) < f.halfD + o.halfD - EPS) return false;
    }
    return true;
  };

  let highlighted: string | null = null;
  let blockedId: string | null = null;

  /** Selected → warm tint. Blocked (would clip a wall or another piece) → red. */
  const paintHighlight = () => {
    for (const [id, list] of materials) {
      const blocked = id === blockedId;
      const on = blocked || id === highlighted;
      for (const mat of list) {
        mat.emissive.copy(blocked ? BLOCKED : on ? HIGHLIGHT : NONE);
        mat.emissiveIntensity = blocked ? 1.1 : on ? 0.5 : 1;
      }
    }
    dirty = true;
  };

  const setBlockedId = (id: string | null) => {
    if (blockedId === id) return;
    blockedId = id;
    paintHighlight();
  };

  const rebuild = () => {
    for (const group of groups.values()) {
      pieceRoot.remove(group);
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
    }
    groups.clear();
    materials.clear();
    pickables.length = 0;

    for (const placement of placements) {
      const variant = variantsById.get(placement.variantId);
      if (!variant) continue;
      const built = buildPiece(variant);
      built.group.position.set(placement.x, 0, placement.z);
      built.group.rotation.y = placement.rotationY ?? 0;
      built.group.userData.placementId = placement.id;
      for (const mesh of built.meshes) {
        mesh.userData.placementId = placement.id;
        pickables.push(mesh);
      }
      materials.set(
        placement.id,
        built.meshes.map((mesh) => mesh.material as THREE.MeshStandardMaterial),
      );
      groups.set(placement.id, built.group);
      pieceRoot.add(built.group);
    }
    highlighted = null;
    paintHighlight();
  };

  // ── Picking ───────────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();

  let hoverListener: (e: HoverEvent) => void = () => {};
  let selectListener: (e: HoverEvent) => void = () => {};
  let moveListener: (e: PlacementEvent | null) => void = () => {};
  let overlayListener: () => void = () => {};

  const hitAt = (clientX: number, clientY: number): HoverEvent => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    pointer.y = -((clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return {
      id: (hit?.object.userData.placementId as string | undefined) ?? null,
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const floorPointAt = (x: number, y: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = (x / Math.max(rect.width, 1)) * 2 - 1;
    pointer.y = -(y / Math.max(rect.height, 1)) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(plane, hitPoint) ? { x: hitPoint.x, z: hitPoint.z } : null;
  };

  // ── Drag to move ──────────────────────────────────────────────────────────
  // A drag previews only legal positions. If the pointer ends somewhere the
  // piece cannot legally stand, it snaps back to where the drag started.
  interface DragState {
    id: string;
    offsetX: number;
    offsetZ: number;
    startX: number;
    startY: number;
    homeX: number;
    homeZ: number;
    blocked: boolean;
  }
  let dragging: DragState | null = null;
  let pressed: { x: number; y: number; id: string | null } | null = null;
  let blockedListener: (blocked: boolean) => void = () => {};

  /** Puts the piece back where the drag started, used whenever a drop is illegal. */
  const revert = (state: DragState) => {
    const placement = placements.find((p) => p.id === state.id);
    if (!placement) return;
    placement.x = state.homeX;
    placement.z = state.homeZ;
    groups.get(state.id)?.position.set(state.homeX, 0, state.homeZ);
    moveListener({ placement: { ...placement } });
    dirty = true;
  };

  renderer.domElement.addEventListener("pointerdown", (event) => {
    const hit = hitAt(event.clientX, event.clientY);
    pressed = { x: event.clientX, y: event.clientY, id: hit.id };
    if (!hit.id || walkMode) return;
    const placement = placements.find((p) => p.id === hit.id);
    const point = floorPointAt(hit.x, hit.y);
    if (!placement || !point) return;
    dragging = {
      id: hit.id,
      offsetX: placement.x - point.x,
      offsetZ: placement.z - point.z,
      startX: event.clientX,
      startY: event.clientY,
      homeX: placement.x,
      homeZ: placement.z,
      blocked: false,
    };
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener("pointermove", (event) => {
    const hit = hitAt(event.clientX, event.clientY);

    if (dragging) {
      if (Math.hypot(event.clientX - dragging.startX, event.clientY - dragging.startY) < 3) return;
      controls.enabled = false;
      renderer.domElement.style.cursor = "grabbing";
      const point = floorPointAt(hit.x, hit.y);
      const placement = placements.find((p) => p.id === dragging!.id);
      if (!point || !placement) return;
      // The piece always follows the pointer, but walls hold it on the floor. Overlapping
      // another piece is allowed mid-drag so the user can see it, and shows red.
      const f = footprint(placement);
      const next = clampToFloor(f.halfW, f.halfD, point.x + dragging.offsetX, point.z + dragging.offsetZ);
      placement.x = next.x;
      placement.z = next.z;
      groups.get(placement.id)?.position.set(next.x, 0, next.z);
      const legal = fitsAt(placement.variantId, next.x, next.z, placement.rotationY, placement.id);
      setBlockedId(legal ? null : placement.id);
      dragging.blocked = !legal;
      moveListener({ placement: { ...placement } });
      dirty = true;
      return;
    }

    setHighlight(hit.id);
    hoverListener(hit);
  });

  renderer.domElement.addEventListener("pointerup", (event) => {
    if (dragging) {
      const state = dragging;
      dragging = null;
      controls.enabled = !walkMode;
      renderer.domElement.style.cursor = "";
      renderer.domElement.releasePointerCapture?.(event.pointerId);
      pressed = null;
      setBlockedId(null);
      const placement = placements.find((p) => p.id === state.id);
      if (!placement) return;
      // Releasing on an illegal spot sends the piece back to where the drag began.
      if (!fitsAt(placement.variantId, placement.x, placement.z, placement.rotationY, placement.id)) {
        revert(state);
        blockedListener(true);
      } else {
        moveListener({ placement: { ...placement } });
      }
      return;
    }
    const start = pressed;
    pressed = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 4) return;
    const hit = hitAt(event.clientX, event.clientY);
    setHighlight(hit.id);
    selectListener(hit);
  });

  renderer.domElement.addEventListener("pointerleave", () => {
    if (dragging) return;
    setHighlight(null);
    hoverListener({ id: null, x: 0, y: 0 });
  });

  const setHighlight = (id: string | null) => {
    const next = id && groups.has(id) ? id : null;
    if (next === highlighted) return;
    highlighted = next;
    paintHighlight();
  };

  // ── Camera modes ──────────────────────────────────────────────────────────
  // Orbit inspects the room from outside. Walk is first-person: the orbit
  // target is the eye, the camera sits a hair behind it, and a negative rotate
  // speed turns "drag to orbit" into "drag to look". Stepping moves target and
  // camera together, so damping keeps working.
  const LOOK_RADIUS = 0.05;

  const walkBlockedAt = (x: number, z: number) => {
    if (!insideRoom(PERSON_RADIUS, PERSON_RADIUS, x, z)) return true;
    for (const placement of placements) {
      const variant = variantsById.get(placement.variantId);
      if (!variant || variant.kind === "rug") continue;
      const f = footprint(placement);
      if (Math.abs(x - placement.x) < f.halfW + PERSON_RADIUS && Math.abs(z - placement.z) < f.halfD + PERSON_RADIUS) return true;
    }
    return false;
  };

  /** Closest standable floor point to (x, z); the spot itself when it is already free. */
  const nearestWalkable = (x: number, z: number) => {
    let best: { x: number; z: number } | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let gx = -ROOM_W / 2; gx <= ROOM_W / 2; gx += 0.1) {
      for (let gz = -ROOM_D / 2; gz <= ROOM_D / 2; gz += 0.1) {
        if (walkBlockedAt(gx, gz)) continue;
        const score = (gx - x) ** 2 + (gz - z) ** 2;
        if (score < bestScore) {
          bestScore = score;
          best = { x: gx, z: gz };
        }
      }
    }
    return best ?? { x: 0, z: 0 };
  };

  /** Steps the walker, sliding along whichever axis is still free. */
  const walkBy = (dx: number, dz: number) => {
    const { x, z } = controls.target;
    if (!walkBlockedAt(x + dx, z)) controls.target.x = x + dx;
    if (!walkBlockedAt(controls.target.x, z + dz)) controls.target.z = z + dz;
    camera.position.x += controls.target.x - x;
    camera.position.z += controls.target.z - z;
    dirty = true;
  };

  /** Stand at (x, z) facing (lookX, lookZ); moves to the nearest free floor if blocked. */
  const standAt = (x: number, z: number, lookX: number, lookZ: number) => {
    if (!walkMode) setMode("walk");
    const spot = walkBlockedAt(x, z) ? nearestWalkable(x, z) : { x, z };
    const face = new THREE.Vector3(lookX - spot.x, 0, lookZ - spot.z);
    if (face.lengthSq() < 1e-6) face.set(0, 0, -1);
    face.normalize();
    controls.target.set(spot.x, EYE_HEIGHT, spot.z);
    camera.position.set(spot.x - face.x * LOOK_RADIUS, EYE_HEIGHT, spot.z - face.z * LOOK_RADIUS);
    controls.update();
    dirty = true;
  };

  const setMode = (mode: "orbit" | "walk") => {
    if ((mode === "walk") === walkMode) return;
    walkMode = mode === "walk";
    controls.enabled = !dragging;
    rightWall.visible = walkMode;
    frontWall.visible = walkMode;
    if (walkMode) {
      controls.enableZoom = false;
      controls.rotateSpeed = -0.45;
      controls.minDistance = LOOK_RADIUS;
      controls.maxDistance = LOOK_RADIUS;
      controls.minPolarAngle = 0.5;
      controls.maxPolarAngle = 2.6;
      camera.near = 0.03;
      camera.updateProjectionMatrix();
      // Start in the free spot nearest the middle, looking the way the orbit camera looked.
      const look = new THREE.Vector3(controls.target.x - camera.position.x, 0, controls.target.z - camera.position.z);
      if (look.lengthSq() < 1e-6) look.set(0, 0, -1);
      look.normalize();
      const spot = walkBlockedAt(0, 0) ? nearestWalkable(0, 0) : { x: 0, z: 0 };
      controls.target.set(spot.x, EYE_HEIGHT, spot.z);
      camera.position.set(spot.x - look.x * LOOK_RADIUS, EYE_HEIGHT, spot.z - look.z * LOOK_RADIUS);
    } else {
      controls.enableZoom = true;
      controls.rotateSpeed = 0.75;
      controls.minDistance = 4.5;
      controls.maxDistance = 17;
      controls.minPolarAngle = 0.45;
      controls.maxPolarAngle = 1.32;
      camera.near = 0.05;
      camera.updateProjectionMatrix();
      controls.reset();
    }
    controls.update();
    dirty = true;
  };

  const walkKeys = new Set<string>();
  const WALK_KEYS: Record<string, true> = {
    w: true,
    a: true,
    s: true,
    d: true,
    arrowup: true,
    arrowdown: true,
    arrowleft: true,
    arrowright: true,
  };
  window.addEventListener("keydown", (event) => {
    if (!walkMode || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (!WALK_KEYS[key]) return;
    walkKeys.add(key);
    event.preventDefault();
  });
  window.addEventListener("keyup", (event) => walkKeys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => walkKeys.clear());

  const advanceWalk = (dt: number) => {
    if (!walkMode || walkKeys.size === 0) return;
    let forwardInput = 0;
    let strafeInput = 0;
    if (walkKeys.has("w") || walkKeys.has("arrowup")) forwardInput += 1;
    if (walkKeys.has("s") || walkKeys.has("arrowdown")) forwardInput -= 1;
    if (walkKeys.has("d") || walkKeys.has("arrowright")) strafeInput += 1;
    if (walkKeys.has("a") || walkKeys.has("arrowleft")) strafeInput -= 1;
    if (!forwardInput && !strafeInput) return;
    // Move relative to where you are looking, flattened to the floor.
    const forward = new THREE.Vector3(controls.target.x - camera.position.x, 0, controls.target.z - camera.position.z);
    if (forward.lengthSq() < 1e-9) return;
    forward.normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const step = forward.multiplyScalar(forwardInput * WALK_SPEED * dt).add(right.multiplyScalar(strafeInput * WALK_SPEED * dt));
    walkBy(step.x, step.z);
  };

  // ── Sizing + loop ─────────────────────────────────────────────────────────
  const resize = () => {
    const { width, height } = measure();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Portrait screens need a wider field to keep the whole room in frame.
    camera.fov = width / height < 0.8 ? 62 : 40;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  // Renders only when something changed; damping keeps emitting `change` until it settles.
  let lastFrame = performance.now();
  const tick = (now: number) => {
    requestAnimationFrame(tick);
    const dt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    advanceWalk(dt);
    if (!dirty) return;
    dirty = false;
    controls.update();
    renderer.render(scene, camera);
    overlayListener();
  };
  requestAnimationFrame(tick);

  // ── Dimension lines for the DOM overlay ───────────────────────────────────
  // Three measured edges on the piece's bounding box, in canvas CSS px:
  // width along the front-bottom edge, depth along the right-bottom edge,
  // height up the front-right corner. The front is whichever box face points
  // closest to the camera, so the lines never hide behind the piece.
  const anchors = (id: string): Dimensions | null => {
    const placement = placements.find((p) => p.id === id);
    const variant = placement && variantsById.get(placement.variantId);
    if (!placement || !variant) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    const project = (x: number, y: number, z: number) => {
      const p = new THREE.Vector3(x, y, z).project(camera);
      return { x: ((p.x + 1) / 2) * rect.width, y: ((1 - p.y) / 2) * rect.height };
    };
    const f = footprint(placement);
    const { halfW, halfD } = f;
    const top = variant.h * INCH;
    const sx = camera.position.x >= placement.x ? 1 : -1;
    const sz = camera.position.z >= placement.z ? 1 : -1;
    const x0 = placement.x + sx * halfW;
    const z0 = placement.z + sz * halfD;
    const lift = 0.002;
    // Labels are the footprint as it sits in the room, so a turned piece swaps width and depth.
    const turned = Math.abs(Math.sin(placement.rotationY ?? 0)) > 0.7;
    return {
      width: {
        a: project(placement.x - halfW, lift, z0),
        b: project(placement.x + halfW, lift, z0),
        label: `${turned ? variant.d : variant.w}″`,
      },
      depth: {
        a: project(x0, lift, placement.z - halfD),
        b: project(x0, lift, placement.z + halfD),
        label: `${turned ? variant.w : variant.d}″`,
      },
      height: {
        a: project(x0, 0, z0),
        b: project(x0, top, z0),
        label: `${variant.h}″`,
      },
    };
  };

  return {
    setPlacements: (next) => {
      placements = next.map((placement) => ({ ...placement }));
      rebuild();
      dirty = true;
    },
    getPlacements: () => placements.map((placement) => ({ ...placement })),
    floorPointAt,
    setHoverListener: (cb) => {
      hoverListener = cb;
    },
    setSelectListener: (cb) => {
      selectListener = cb;
    },
    setMoveListener: (cb) => {
      moveListener = cb;
    },
    setFrameListener: (cb) => {
      overlayListener = cb;
    },
    setHighlight,
    anchors,
    tint: (id) => {
      const mats = materials.get(id);
      const emissive = mats?.[0]?.emissive;
      if (!emissive) return null;
      // Reports what is actually painted on the material, not an internal flag.
      if (emissive.r > 0.3 && emissive.g < 0.2 && emissive.b < 0.2) return "red";
      return emissive.r + emissive.g + emissive.b > 0.01 ? "selected" : "none";
    },
    centre: (id) => {
      const placement = placements.find((p) => p.id === id);
      const variant = placement && variantsById.get(placement.variantId);
      if (!placement || !variant) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      const p = new THREE.Vector3(placement.x, variant.h * INCH * 0.55, placement.z).project(camera);
      return { x: ((p.x + 1) / 2) * rect.width, y: ((1 - p.y) / 2) * rect.height };
    },
    resetView: () => {
      setMode("orbit");
      controls.reset();
      dirty = true;
    },
    setMode,
    getMode: () => (walkMode ? "walk" : "orbit"),
    fits: fitsAt,
    setBlockedListener: (cb) => {
      blockedListener = cb;
    },
    standAt,
    eye: () => ({ x: controls.target.x, z: controls.target.z }),
  };
}