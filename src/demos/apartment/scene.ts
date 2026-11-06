import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { items } from "./items";

export interface HoverEvent {
  id: string | null;
  x: number;
  y: number;
}

export interface Viewer {
  itemCount: number;
  screenPoint(id: string): { x: number; y: number } | null;
  setHoverListener(cb: (e: HoverEvent) => void): void;
  setSelectListener(cb: (e: HoverEvent) => void): void;
  setHighlight(id: string | null): void;
  resetView(): void;
}

const HIGHLIGHT_EMISSIVE = new THREE.Color(0x2a2418);
const NO_EMISSIVE = new THREE.Color(0x000000);

/** One fresh material per mesh, so highlighting an item never tints another. */
function material(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04 });
}

function box(w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(
  radius: number,
  height: number,
  color: string,
  x = 0,
  y = 0,
  z = 0,
  segments = 24,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createViewer(container: HTMLElement): Viewer {
  let canvas = container.querySelector("canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    container.appendChild(canvas);
  }

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    throw new Error("WebGL is unavailable");
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.display = "block";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f3ee);

  const measure = () => {
    const rect = container.getBoundingClientRect();
    return { width: Math.max(rect.width, 1), height: Math.max(rect.height, 1) };
  };
  const initial = measure();

  const camera = new THREE.PerspectiveCamera(42, initial.width / initial.height, 0.1, 100);
  camera.position.set(7.6, 6.4, 8.4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.9, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 18;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.35;
  controls.autoRotate = false;
  controls.update();
  controls.saveState();

  let dirty = true;
  controls.addEventListener("change", () => {
    dirty = true;
  });

  // Room shell — never part of `items`, never hoverable.
  const FLOOR_W = 6.4;
  const FLOOR_D = 5.6;
  const WALL_H = 2.7;
  const WALL_T = 0.12;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_W, FLOOR_D), material("#d9c7a9"));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(FLOOR_W, WALL_H, WALL_T), material("#eee9e1"));
  backWall.position.set(0, WALL_H / 2, -FLOOR_D / 2 + WALL_T / 2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, FLOOR_D), material("#eee9e1"));
  leftWall.position.set(-FLOOR_W / 2 + WALL_T / 2, WALL_H / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Lighting.
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x4a463f, 0.85));
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));

  const sun = new THREE.DirectionalLight(0xfff2e0, 2.1);
  sun.position.set(5, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  const shadowCamera = sun.shadow.camera;
  shadowCamera.left = -8;
  shadowCamera.right = 8;
  shadowCamera.top = 8;
  shadowCamera.bottom = -8;
  shadowCamera.updateProjectionMatrix();
  scene.add(sun);

  // Items.
  const groups = new Map<string, THREE.Group>();
  const materialsById = new Map<string, THREE.MeshStandardMaterial[]>();
  const pickables: THREE.Mesh[] = [];

  const addGroup = (id: string, x: number, z: number, rotationY = 0) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotationY;
    group.userData.itemId = id;
    groups.set(id, group);
    materialsById.set(id, []);
    const paint = (mesh: THREE.Mesh) => {
      group.add(mesh);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.itemId = id;
      materialsById.get(id)!.push(mesh.material as THREE.MeshStandardMaterial);
      pickables.push(mesh);
    };
    return { group, paint };
  };

  {
    const { group, paint } = addGroup("bed", -1.9, -1.55);
    paint(box(1.6, 0.45, 2.0, "#6b4b32", 0, 0.225, 0));
    paint(box(1.54, 0.18, 1.94, "#efe9dd", 0, 0.54, 0));
    paint(box(0.5, 0.14, 0.32, "#efe9dd", -0.4, 0.7, -0.7));
    paint(box(0.5, 0.14, 0.32, "#efe9dd", 0.4, 0.7, -0.7));
    
    scene.add(group);
  }

  {
    const { group, paint } = addGroup("nightstand", -0.75, -1.9);
    paint(box(0.45, 0.5, 0.4, "#c6a878", 0, 0.25, 0));
    paint(box(0.4, 0.03, 0.03, "#8a7454", 0, 0.36, 0.2));
    scene.add(group);
  }

  {
    const { group, paint } = addGroup("rug", 0.9, 0.9);
    paint(box(2.6, 0.02, 1.9, "#b9724f", 0, 0.011, 0));
    scene.add(group);
  }

  {
    // Facing the back wall: the seat back sits on the +z side of the room.
    const { group, paint } = addGroup("sofa", 0.9, 1.85, Math.PI);
    paint(box(2.0, 0.42, 0.9, "#cfc4b2", 0, 0.21, 0));
    paint(box(1.84, 0.35, 0.18, "#cfc4b2", 0, 0.42 + 0.175, -0.35));
    paint(box(0.16, 0.55, 0.9, "#cfc4b2", -0.92, 0.275, 0));
    paint(box(0.16, 0.55, 0.9, "#cfc4b2", 0.92, 0.275, 0));
    scene.add(group);
  }

  {
    const { group, paint } = addGroup("coffee", 0.9, 0.55);
    paint(cylinder(0.45, 0.38, "#4a3a2c", 0, 0.19, 0));
    scene.add(group);
  }

  {
    const { group, paint } = addGroup("counter", 2.6, -0.9);
    paint(box(0.9, 0.92, 3.2, "#9aa78f", 0, 0.46, 0));
    paint(box(0.98, 0.06, 3.28, "#e9e4d8", 0, 0.95, 0));
    paint(box(0.5, 0.02, 0.4, "#b9bcbd", 0, 0.989, 1.05));
    paint(box(0.6, 0.02, 0.6, "#4a463f", 0, 0.989, -0.55));
    scene.add(group);
  }

  {
    const { group, paint } = addGroup("fridge", 2.55, 1.15);
    paint(box(0.6, 1.5, 0.62, "#e8e2d4", 0, 0.75, 0));
    paint(box(0.03, 1.5, 0.02, "#bdb6a6", -0.3, 0.75, 0.16));
    paint(box(0.03, 0.5, 0.05, "#8d8778", -0.1, 1.05, 0.32));
    scene.add(group);
  }

  {
    // Rotated so the wide face runs along the left wall.
    const { group, paint } = addGroup("shelf", -2.95, 0.9);
    paint(box(0.3, 0.04, 1.06, "#d7c9b0", 0, 0.04, 0));
    paint(box(0.3, 0.04, 1.06, "#d7c9b0", 0, 0.57, 0));
    paint(box(0.3, 0.04, 1.06, "#d7c9b0", 0, 1.1, 0));
    paint(box(0.3, 0.04, 1.06, "#d7c9b0", 0, 1.66, 0));
    paint(box(0.3, 1.7, 0.05, "#d7c9b0", 0, 0.85, -0.525));
    paint(box(0.3, 1.7, 0.05, "#d7c9b0", 0, 0.85, 0.525));
    scene.add(group);
  }

  {
    // Nudged clear of the sofa footprint so the pole does not intersect the seat.
    const { group, paint } = addGroup("lamp", -0.75, 1.35);
    paint(cylinder(0.28, 0.03, "#b08a4a", 0, 0.015, 0, 32));
    paint(cylinder(0.025, 1.6, "#b08a4a", 0, 0.8, 0, 16));
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.24, 24, 1, true), material("#e9e4d8"));
    shade.position.set(0, 1.5, 0);
    shade.userData.itemId = "lamp";
    materialsById.get("lamp")!.push(shade.material as THREE.MeshStandardMaterial);
    pickables.push(shade);
    group.add(shade);
    scene.add(group);
  }

  {
    const { group, paint } = addGroup("plant", -2.75, -0.35);
    paint(cylinder(0.19, 0.34, "#a8a094", 0, 0.17, 0));
    const foliage: [number, number, number][] = [
      [0, 0.62, 0],
      [0.1, 0.9, -0.05],
      [-0.06, 1.12, 0.04],
    ];
    for (const [x, y, z] of foliage) {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), material("#5c7a4a"));
      blob.position.set(x, y, z);
      paint(blob);
    }
    scene.add(group);
  }

  {
    const { group, paint } = addGroup("table", 1.5, -2.0);
    paint(box(0.9, 0.06, 0.9, "#d7c9b0", 0, 0.71, 0));
    for (const sx of [-0.4, 0.4]) {
      for (const sz of [-0.4, 0.4]) {
        paint(box(0.05, 0.68, 0.05, "#d7c9b0", sx, 0.34, sz));
      }
    }
    scene.add(group);
  }

  // Keep every mesh of every group in the pick list, including meshes added
  // directly to a group above.
  for (const [id, group] of groups) {
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.userData.itemId = id;
      if (!pickables.includes(object)) pickables.push(object);
      const mat = object.material as THREE.MeshStandardMaterial;
      if (!materialsById.get(id)!.includes(mat)) materialsById.get(id)!.push(mat);
    });
  }

  // Highlight.
  let highlighted: string | null = null;
  const paintHighlight = () => {
    for (const [id, mats] of materialsById) {
      const on = id === highlighted;
      for (const mat of mats) {
        mat.emissive.copy(on ? HIGHLIGHT_EMISSIVE : NO_EMISSIVE);
        mat.emissiveIntensity = on ? 0.55 : 1;
      }
    }
    dirty = true;
  };
  const setHighlight = (id: string | null) => {
    const next = id && groups.has(id) ? id : null;
    if (next === highlighted) return;
    highlighted = next;
    paintHighlight();
  };

  // Pointer picking.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoverListener: (e: HoverEvent) => void = () => {};
  let selectListener: (e: HoverEvent) => void = () => {};

  const hitAt = (clientX: number, clientY: number): HoverEvent => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    pointer.y = -((clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    const id = (hits[0]?.object.userData.itemId as string | undefined) ?? null;
    return { id, x: clientX - rect.left, y: clientY - rect.top };
  };

  let downX = 0;
  let downY = 0;
  let downId = false;

  renderer.domElement.addEventListener("pointermove", (event) => {
    const hit = hitAt(event.clientX, event.clientY);
    setHighlight(hit.id);
    hoverListener(hit);
  });
  renderer.domElement.addEventListener("pointerleave", () => {
    setHighlight(null);
    hoverListener({ id: null, x: 0, y: 0 });
  });
  renderer.domElement.addEventListener("pointerdown", (event) => {
    downX = event.clientX;
    downY = event.clientY;
    downId = true;
  });
  renderer.domElement.addEventListener("pointerup", (event) => {
    if (!downId) return;
    downId = false;
    if (Math.hypot(event.clientX - downX, event.clientY - downY) >= 4) return;
    const hit = hitAt(event.clientX, event.clientY);
    setHighlight(hit.id);
    selectListener(hit);
  });

  // Sizing.
  const resize = () => {
    const { width, height } = measure();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  // Render loop — only when something moved.
  const tick = () => {
    if (!dirty) {
      requestAnimationFrame(tick);
      return;
    }
    dirty = false;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const screenPoint = (id: string) => {
    const group = groups.get(id);
    if (!group) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    const point = group.position.clone();
    point.y += 0.35;
    point.project(camera);
    return {
      x: ((point.x + 1) / 2) * rect.width,
      y: ((1 - point.y) / 2) * rect.height,
    };
  };

  return {
    itemCount: items.length,
    screenPoint,
    setHoverListener: (cb) => {
      hoverListener = cb;
    },
    setSelectListener: (cb) => {
      selectListener = cb;
    },
    setHighlight,
    resetView: () => {
      controls.reset();
      setHighlight(null);
    },
  };
}