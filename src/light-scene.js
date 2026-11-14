// 3D view of the Savitr I light at the top of the page.
//
// This file is bundled with Three.js by `pnpm build` into public/light-scene.js.
// The page script (public/page.js) owns scrolling and the colour slider. Whenever
// either changes, it sends a 'savitara:light' event carrying:
//   progress  0 to 1, how far the visitor has scrolled through the reveal
//   exposure  0 to 1, how bright the studio lights are (eased from progress)
//   rgb       [r, g, b], 0 to 255, the colour of the chosen colour temperature
// This file only listens for that event and redraws; it never reads the page itself.
//
// If WebGL or the model fails to load, the page keeps showing the still image
// public/assets/savitr-i-rear-poster.webp instead.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const MODEL_URL = './assets/savitr-i.glb';

// Viewing angle, in radians around the vertical axis.
const START_YAW = -0.85;   // rear three-quarter view, matching the poster image
const SCROLL_TURN = 3.2;   // how far scrolling turns it: roughly rear to front three-quarter
const DRAG_SPEED = 0.008;  // radians per pixel dragged
const DRAG_FRICTION = 0.93; // how quickly a flicked spin slows down (closer to 1 = longer)

const host = document.querySelector('.light-scene');
const canvas = host.querySelector('canvas');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Latest state from the page script, until the first event arrives.
let light = window.savitaraLight || { progress: 0, exposure: 0, rgb: [255, 220, 180] };

let renderer;

try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // ----- Scene, camera and studio lights -----

  const scene = new THREE.Scene();

  // Soft room reflections, so the metal reflector looks like metal.
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 50);
  camera.position.set(0, 0, 5.4); // eye level, so the light looks level
  camera.lookAt(0, 0, 0);

  // Three studio lights. Their brightness follows `exposure`; key and fill take the slider colour.
  const keyLight = new THREE.DirectionalLight(0xfff2df, 0);
  keyLight.position.set(-3, 4, 5); // upper left, in front
  const fillLight = new THREE.DirectionalLight(0xd9e3d1, 0);
  fillLight.position.set(3, 0.5, 4); // right, low, softer
  const rimLight = new THREE.DirectionalLight(0xdde6ef, 0);
  rimLight.position.set(3, 2, -2); // behind, outlines the edges
  scene.add(keyLight, fillLight, rimLight);

  const FILL_TINT = new THREE.Color(0xd9e3d1); // keeps the fill a little cooler than the key
  const sliderColor = new THREE.Color();

  // The model hangs from this pivot; turning the pivot turns the light.
  const pivot = new THREE.Group();
  scene.add(pivot);

  // ----- Drag to turn -----

  let dragYaw = 0;
  let velocity = 0;
  let dragging = false;
  let coasting = false;
  let lastX = 0;

  canvas.style.touchAction = 'pan-y'; // on phones, vertical swipes still scroll the page

  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    velocity = 0;
    lastX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
    host.dataset.dragging = 'true';
  });

  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    velocity = (event.clientX - lastX) * DRAG_SPEED;
    lastX = event.clientX;
    dragYaw += velocity;
    requestDraw();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    host.dataset.dragging = 'false';
    if (!reduceMotion.matches) coast();
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // After a flick, keep spinning and slow down gradually.
  function coast() {
    if (coasting) return;
    coasting = true;
    const step = () => {
      velocity *= DRAG_FRICTION;
      dragYaw += velocity;
      requestDraw();
      if (Math.abs(velocity) > 0.0005 && !dragging) requestAnimationFrame(step);
      else coasting = false;
    };
    requestAnimationFrame(step);
  }

  // ----- Drawing -----

  let model = null;
  let drawQueued = false;
  let onScreen = true;
  let contextLost = false;

  // Draw at most once per frame, and only when something changed.
  function requestDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(draw);
  }

  function draw() {
    drawQueued = false;
    if (!model || !onScreen || document.hidden || contextLost) return;

    // Scrolling turns the light, eased so it starts and stops gently.
    const t = light.progress;
    const eased = reduceMotion.matches ? 1 : t * t * (3 - 2 * t);
    pivot.rotation.set(0, START_YAW + eased * SCROLL_TURN + dragYaw, 0); // vertical axis only: stays level

    const e = light.exposure;
    keyLight.intensity = 0.08 + 3.2 * e;
    fillLight.intensity = 0.8 + 1.0 * e;
    rimLight.intensity = 0.04 + 0.65 * e;
    scene.environmentIntensity = 0.25 + 1.275 * e;

    const [r, g, b] = light.rgb;
    sliderColor.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
    keyLight.color.copy(sliderColor);
    fillLight.color.copy(sliderColor).lerp(FILL_TINT, 0.35);

    renderer.render(scene, camera);
    host.dataset.ready = 'true'; // CSS swaps the poster image for the live canvas
  }

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = camera.aspect < 1.15 ? 6.2 : 5.4; // step back a little on tall, narrow screens
    camera.updateProjectionMatrix();
    requestDraw();
  }

  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries => {
    onScreen = entries[0].isIntersecting;
    if (onScreen) requestDraw();
  }).observe(host);

  window.addEventListener('savitara:light', event => {
    light = event.detail;
    requestDraw();
  });
  document.addEventListener('visibilitychange', requestDraw);

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    host.dataset.ready = 'false';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    resize();
  });

  // ----- Load the model -----

  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(
    new URL(MODEL_URL, document.baseURI).href,
    gltf => {
      model = gltf.scene;

      // Centre the model and scale it to a consistent size, whatever units it was exported in.
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const scale = 2.7 / Math.max(size.x, size.y, size.z);

      const assembly = new THREE.Group();
      assembly.add(model);
      assembly.position.copy(center).multiplyScalar(-scale);
      assembly.scale.setScalar(scale);
      pivot.add(assembly);

      model.traverse(object => {
        if (!object.isMesh) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          // Keep the Blender colours and metal finishes; just avoid perfect mirrors.
          material.roughness = THREE.MathUtils.clamp(material.roughness, 0.04, 1);
          // The product itself is switched off; only the studio lights illuminate it.
          if (material.emissive) material.emissiveIntensity = 0;
        }
      });

      resize();
    },
    undefined,
    error => {
      console.warn('Savitr I model unavailable; showing the poster image.', error);
      host.dataset.ready = 'false';
    }
  );
} catch (error) {
  console.warn('3D unavailable; showing the poster image.', error);
  host.dataset.ready = 'false';
  renderer?.dispose();
}
