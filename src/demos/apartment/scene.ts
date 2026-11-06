import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { variantsById, type Placement } from "./catalog";
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
}

const ROOM_W = 6.4;
const ROOM_D = 5.6;
const WALL_H = 2.7;
const WALL_T = 0.12;

const HIGHLIGHT = new THREE.Color(0x3a2f1e);
const NONE = new THREE.Color(0x000000);

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

  const footprint = (placement: Placement) => {
    const variant = variantsById.get(placement.variantId);
    if (!variant) return { halfW: 0.3, halfD: 0.3 };
    const turned = Math.abs(Math.sin(placement.rotationY ?? 0)) > 0.7;
    return { halfW: (turned ? variant.d : variant.w) / 200, halfD: (turned ? variant.w : variant.d) / 200 };
  };

  const clampPlacement = (placement: Placement) => {
    const { halfW, halfD } = footprint(placement);
    const margin = 0.03;
    return {
      ...placement,
      x: Math.min(ROOM_W / 2 - halfW - margin, Math.max(-ROOM_W / 2 + halfW + margin, placement.x)),
      z: Math.min(ROOM_D / 2 - halfD - margin, Math.max(-ROOM_D / 2 + halfD + margin, placement.z)),
    };
  };

  const paintHighlight = () => {
    for (const [id, list] of materials) {
      const on = id === highlighted;
      for (const mat of list) {
        mat.emissive.copy(on ? HIGHLIGHT : NONE);
        mat.emissiveIntensity = on ? 0.5 : 1;
      }
    }
    dirty = true;
  };

  let highlighted: string | null = null;

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
  let dragging: { id: string; offsetX: number; offsetZ: number; startX: number; startY: number } | null = null;
  let pressed: { x: number; y: number; id: string | null } | null = null;

  const setDragging = (id: string | null) => {
    controls.enabled = id === null;
    renderer.domElement.style.cursor = id ? "grabbing" : "";
  };

  renderer.domElement.addEventListener("pointerdown", (event) => {
    const hit = hitAt(event.clientX, event.clientY);
    pressed = { x: event.clientX, y: event.clientY, id: hit.id };
    if (!hit.id) return;
    const placement = placements.find((p) => p.id === hit.id);
    const point = floorPointAt(hit.x, hit.y);
    if (!placement || !point) return;
    dragging = { id: hit.id, offsetX: placement.x - point.x, offsetZ: placement.z - point.z, startX: event.clientX, startY: event.clientY };
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener("pointermove", (event) => {
    const hit = hitAt(event.clientX, event.clientY);

    if (dragging) {
      const moved = Math.hypot(event.clientX - dragging.startX, event.clientY - dragging.startY);
      if (moved < 3) return;
      setDragging(dragging.id);
      const point = floorPointAt(hit.x, hit.y);
      const placement = placements.find((p) => p.id === dragging!.id);
      if (!point || !placement) return;
      const next = clampPlacement({ ...placement, x: point.x + dragging.offsetX, z: point.z + dragging.offsetZ });
      placement.x = next.x;
      placement.z = next.z;
      groups.get(placement.id)?.position.set(next.x, 0, next.z);
      moveListener({ placement: { ...placement } });
      dirty = true;
      return;
    }

    setHighlight(hit.id);
    hoverListener(hit);
  });

  renderer.domElement.addEventListener("pointerup", (event) => {
    if (dragging) {
      const placement = placements.find((p) => p.id === dragging!.id);
      setDragging(null);
      renderer.domElement.releasePointerCapture?.(event.pointerId);
      dragging = null;
      pressed = null;
      if (placement) moveListener({ placement: { ...placement } });
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
  const tick = () => {
    requestAnimationFrame(tick);
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
    const turned = Math.abs(Math.sin(placement.rotationY ?? 0)) > 0.7;
    const halfW = (turned ? variant.d : variant.w) / 200;
    const halfD = (turned ? variant.w : variant.d) / 200;
    const top = variant.h / 100;
    const sx = camera.position.x >= placement.x ? 1 : -1;
    const sz = camera.position.z >= placement.z ? 1 : -1;
    const x0 = placement.x + sx * halfW;
    const z0 = placement.z + sz * halfD;
    const lift = 0.002;
    return {
      width: {
        a: project(placement.x - halfW, lift, z0),
        b: project(placement.x + halfW, lift, z0),
        label: `${turned ? variant.d : variant.w} cm`,
      },
      depth: {
        a: project(x0, lift, placement.z - halfD),
        b: project(x0, lift, placement.z + halfD),
        label: `${turned ? variant.w : variant.d} cm`,
      },
      height: {
        a: project(x0, 0, z0),
        b: project(x0, top, z0),
        label: `${variant.h} cm`,
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
    centre: (id) => {
      const placement = placements.find((p) => p.id === id);
      const variant = placement && variantsById.get(placement.variantId);
      if (!placement || !variant) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      const p = new THREE.Vector3(placement.x, (variant.h / 100) * 0.55, placement.z).project(camera);
      return { x: ((p.x + 1) / 2) * rect.width, y: ((1 - p.y) / 2) * rect.height };
    },
    resetView: () => {
      controls.reset();
      dirty = true;
    },
  };
}