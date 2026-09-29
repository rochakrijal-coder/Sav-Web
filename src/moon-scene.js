import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const host = document.querySelector('.moon-scene');
const canvas = host.querySelector('canvas');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .06;
  room.dispose(); pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(34, 1, .05, 50);
  camera.position.set(0,.12,5.4);
  camera.lookAt(0,0,0);
  const key = new THREE.DirectionalLight(0xfff2df, 2.8);
  key.position.set(-3,4,5);
  const rim = new THREE.DirectionalLight(0xdde6ef, 3);
  rim.position.set(3,2,-2);
  const fill = new THREE.DirectionalLight(0xd9e3d1,.04);
  fill.position.set(3,.5,4);
  scene.add(key,fill,rim);
  const pivot = new THREE.Group();
  scene.add(pivot);
  let model, pending=false, visible=true, contextLost=false;
  let light = window.savitaraLight || {progress:0,exposure:0};
  function draw() {
    pending=false;
    if(!model || !visible || document.hidden || contextLost) return;
    const e=light.exposure;
    // Fixed rear three-quarter view, matching the supplied reference.
    pivot.rotation.set(.16, -.85, 0);
    key.intensity=.08+3.2*e;
    fill.intensity=.025+1.8*e;
    rim.intensity=.04+.65*e;
    scene.environmentIntensity=.025+1.5*e;
    renderer.render(scene,camera);
    host.dataset.ready='true';
  }
  function requestDraw() {if(!pending){pending=true;requestAnimationFrame(draw);}}
  function resize() {
    const {width,height}=host.getBoundingClientRect();
    if(!width || !height)return;
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.position.z=camera.aspect<1.15?6.2:5.4;
    camera.updateProjectionMatrix();
    requestDraw();
  }
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestDraw();}).observe(host);
  window.addEventListener('savitara:light',event=>{light=event.detail;requestDraw();});
  document.addEventListener('visibilitychange',requestDraw);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;host.dataset.ready='false';});
  canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;resize();});
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(new URL('./assets/moon-i.glb',document.baseURI).href,gltf=>{
    model=gltf.scene;
    const box=new THREE.Box3().setFromObject(model);
    const center=box.getCenter(new THREE.Vector3());
    const size=box.getSize(new THREE.Vector3());
    const scale=2.7/Math.max(size.x,size.y,size.z);
    const assembly=new THREE.Group();
    assembly.add(model);
    assembly.position.copy(center).multiplyScalar(-scale);
    assembly.scale.setScalar(scale);
    pivot.add(assembly);
    assembly.updateWorldMatrix(true,true);

    model.traverse(object=>{
      if(!object.isMesh)return;
      for(const material of Array.isArray(object.material)?object.material:[object.material]) {
        // Preserve the approved Blender colors and metallic finishes.
        material.roughness=THREE.MathUtils.clamp(material.roughness,.04,1);
        // The product is switched off. Only external studio lights illuminate it.
        if(material.emissive) material.emissiveIntensity=0;
      }
    });
    resize();
  },undefined,error=>{console.warn('Moon I model unavailable; using product poster.',error);host.dataset.ready='false';});
} catch(error) {
  console.warn('3D unavailable; using product poster.',error);
  host.dataset.ready='false';renderer?.dispose();
}
