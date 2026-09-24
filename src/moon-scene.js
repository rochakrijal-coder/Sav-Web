import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Built into moon-scene.js: no third-party runtime CDN requests.
const host = document.querySelector('.moon-scene');
const canvas = host.querySelector('canvas');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35,1,.1,100);
  camera.position.set(0,0,4.8);
  const ambient = new THREE.HemisphereLight(0xd8dfc8,0x252b19,.12);
  const key = new THREE.DirectionalLight(0xffe1b8,.2);
  key.position.set(3,3.5,3);
  const fill = new THREE.DirectionalLight(0xd9e3d1,.05);
  fill.position.set(-3,.5,2);
  const rim = new THREE.DirectionalLight(0xf2e4c4,.05);
  rim.position.set(2,1,-3);
  scene.add(ambient,key,fill,rim);
  let model, pending=false, visible=true;
  let light = window.savitaraLight || {progress:0,exposure:0};
  function draw() {
    pending=false;
    if(!model || !visible || document.hidden) return;
    const e=light.exposure;
    key.intensity=.18+3.2*e;
    fill.intensity=.04+.72*e;
    rim.intensity=.04+.45*e;
    ambient.intensity=.09+.10*e;
    renderer.render(scene,camera);
  }
  function requestDraw() {if(!pending){pending=true;requestAnimationFrame(draw);}}
  function resize() {
    const {width,height}=host.getBoundingClientRect();
    if(!width || !height)return;
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    requestDraw();
  }
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestDraw();}).observe(host);
  window.addEventListener('savitara:light',event=>{light=event.detail;requestDraw();});
  document.addEventListener('visibilitychange',requestDraw);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();host.dataset.ready='false';});
  canvas.addEventListener('webglcontextrestored',()=>{host.dataset.ready='true';resize();});
  new GLTFLoader().load(new URL('./assets/moon.glb',document.baseURI).href,gltf=>{
    model=gltf.scene;
    const box=new THREE.Box3().setFromObject(model);
    const center=box.getCenter(new THREE.Vector3());
    const size=box.getSize(new THREE.Vector3());
    const scale=2/Math.max(size.x,size.y,size.z);
    model.position.copy(center).multiplyScalar(-scale);
    model.scale.setScalar(scale);
    model.traverse(object=>{
      if(!object.isMesh)return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      for(const material of materials){
        material.metalness=0;material.roughness=.95;
        if(material.map) material.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      }
    });
    scene.add(model);
    resize();
    renderer.render(scene,camera);
    host.dataset.ready='true';
    requestDraw();
  },undefined,error=>{console.warn('Moon model unavailable; using lunar poster.',error);host.dataset.ready='false';});
} catch(error) {
  console.warn('3D unavailable; using lunar poster.',error);
  host.dataset.ready='false';
  renderer?.dispose();
}
