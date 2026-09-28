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
  scene.environmentIntensity = .85;
  room.dispose(); pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(34, 1, .05, 50);
  camera.position.set(0,.12,5.4);
  camera.lookAt(0,0,0);
  const key = new THREE.DirectionalLight(0xfff2df, 2.8);
  key.position.set(-3,4,5);
  const rim = new THREE.DirectionalLight(0xdde6ef, 3);
  rim.position.set(3,2,-2);
  scene.add(key,rim);
  const pivot = new THREE.Group();
  scene.add(pivot);
  let model, beam, glow, reflectorLight, ledMaterials=[], pending=false, visible=true, contextLost=false;
  let light = window.savitaraLight || {progress:0,exposure:0};
  function draw() {
    pending=false;
    if(!model || !visible || document.hidden || contextLost) return;
    const e=light.exposure;
    // Face the reflector toward the viewer; retain a three-quarter product view.
    pivot.rotation.set(.08, Math.PI+.48-.10*e, -.08);
    ledMaterials.forEach(material=>material.emissiveIntensity=.08+1.8*e);
    beam.material.uniforms.power.value=e;
    glow.material.opacity=.32*e;
    reflectorLight.intensity=6*e;
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
    let ledBox=new THREE.Box3(), reflectorBox=new THREE.Box3();
    model.traverse(object=>{
      if(!object.isMesh)return;
      for(const material of Array.isArray(object.material)?object.material:[object.material]) {
        // Preserve the approved Blender colors and metallic finishes.
        material.roughness=THREE.MathUtils.clamp(material.roughness,.04,1);
        if(material.name==='Material.018') {
          ledMaterials.push(material);
          ledBox.union(new THREE.Box3().setFromObject(object));
        }
        if(material.name==='Reflector Interior - Satin Aluminum') reflectorBox.union(new THREE.Box3().setFromObject(object));
      }
    });
    // Bounds above are world coordinates because the assembly has been placed.
    // Convert the LED center back into assembly coordinates before attaching effects.
    const source=ledBox.getCenter(new THREE.Vector3());
    assembly.worldToLocal(source);
    const mouth=reflectorBox.min.z/scale+center.z;
    const radius=(reflectorBox.max.x-reflectorBox.min.x)/scale*.48;
    const length=2.6;
    const geometry=new THREE.CylinderGeometry(radius*1.8,radius,length,64,1,true);
    geometry.translate(0,length/2,0);
    geometry.rotateX(-Math.PI/2);
    beam=new THREE.Mesh(geometry,new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
      uniforms:{power:{value:0}},
      vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying vec2 vUv; uniform float power; void main(){float fade=pow(1.0-vUv.y,2.4); float soft=pow(abs(sin(vUv.x*6.283185)),1.5); gl_FragColor=vec4(1.0,.64,.27,power*.045*fade*soft);}'
    }));
    beam.position.set(source.x,source.y,mouth-.015);
    assembly.add(beam);
    const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
    const ctx=glowCanvas.getContext('2d');
    const gradient=ctx.createRadialGradient(64,64,0,64,64,64);
    gradient.addColorStop(0,'rgba(255,236,186,1)');
    gradient.addColorStop(.18,'rgba(255,205,118,.5)');
    gradient.addColorStop(1,'rgba(255,182,72,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),color:0xffc078,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
    glow.position.copy(source);glow.position.z-=.025;glow.scale.setScalar(.7);
    assembly.add(glow);
    reflectorLight=new THREE.PointLight(0xffbb68,0,4,2);
    reflectorLight.position.copy(source);reflectorLight.position.z-=.65;
    assembly.add(reflectorLight);
    resize();
  },undefined,error=>{console.warn('Moon I model unavailable; using product poster.',error);host.dataset.ready='false';});
} catch(error) {
  console.warn('3D unavailable; using product poster.',error);
  host.dataset.ready='false';renderer?.dispose();
}
