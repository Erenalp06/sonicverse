import type {Atmosphere} from './emotionEngine';
import * as THREE from 'three';

export type AudioBands = { bass:number; mid:number; treble:number; beat:boolean };
export type CosmicWorld = { update:(dt:number,time:number,bands:AudioBands,camera:THREE.Camera,atmosphere:Atmosphere)=>void; dispose:()=>void };

const starVertex=`
attribute float aSize;
attribute float aPhase;
varying vec3 vColor;
varying float vPhase;
uniform float uTime;
void main(){
  vColor=color;vPhase=aPhase;
  vec4 mv=modelViewMatrix*vec4(position,1.);
  gl_PointSize=min(38.,aSize*(1.+.13*sin(uTime*1.7+aPhase))*180./max(1.,-mv.z));
  gl_Position=projectionMatrix*mv;
}`;
const starFragment=`
varying vec3 vColor;varying float vPhase;
void main(){
  vec2 uv=gl_PointCoord-.5;float r=length(uv);
  float core=exp(-r*r*95.);float halo=exp(-r*r*17.)*.42;
  float cross=exp(-abs(uv.x)*55.)*exp(-abs(uv.y)*9.)+exp(-abs(uv.y)*55.)*exp(-abs(uv.x)*9.);
  float a=(core+halo+cross*.16)*.85;
  if(a<.012)discard;
  gl_FragColor=vec4(vColor*(1.+core*.7),a);
}`;
const nebulaVertex=`
varying vec3 vPos;
void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
const nebulaFragment=`
precision highp float;
varying vec3 vPos;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform vec3 uColor;
uniform float uMoodGlow;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
void main(){
 vec3 p=normalize(vPos);float n=noise(p*5.+uTime*.018);
 n+=.52*noise(p*11.-uTime*.025);n+=.23*noise(p*25.+uTime*.012);
 float filaments=smoothstep(.91,1.28,n);
 float region=smoothstep(.18,.78,noise(p*2.1+vec3(2.7,1.3,4.1)));
 float alpha=region*(filaments*(.015+uMid*.026)+smoothstep(1.10,1.42,n)*(.016+uBass*.032));
 vec3 col=mix(uColor,vec3(.13,.35,.65),smoothstep(.85,1.28,n));
 gl_FragColor=vec4(col*(.38+uBass*.28),alpha*uMoodGlow);
}`;
const particleVertex=`
attribute float aPhase;
uniform float uTime;uniform float uBass;uniform float uMid;
varying float vIntensity;
void main(){
 vec3 p=position;
 float ripple=sin(aPhase*3.+uTime*1.6)*(.6+uMid*3.);
 p*=1.+uBass*.55;
 p+=normalize(p)*ripple;
 vec4 mv=modelViewMatrix*vec4(p,1.);
 gl_Position=projectionMatrix*mv;
 gl_PointSize=min(32.,(2.8+uBass*4.)*170./max(1.,-mv.z));
 vIntensity=.65+.35*sin(aPhase+uTime);
}`;
const particleFragment=`
varying float vIntensity;
void main(){float d=length(gl_PointCoord-.5);float a=exp(-d*d*55.)*vIntensity;if(a<.01)discard;gl_FragColor=vec4(mix(vec3(.26,.47,1.),vec3(1.,.4,.94),vIntensity),a);}
`;

export function createCosmicWorld(scene:THREE.Scene,mobile:boolean):CosmicWorld{
 const disposables:Array<{dispose:()=>void}>=[];
 const uniforms={uTime:{value:0},uBass:{value:0},uMid:{value:0},uMoodGlow:{value:1}};
 const starCount=mobile?2200:5600;
 const starPositions=new Float32Array(starCount*3),starColors=new Float32Array(starCount*3),starSizes=new Float32Array(starCount),starPhases=new Float32Array(starCount);
 const c=new THREE.Color();
 for(let i=0;i<starCount;i++){
  const distance=90+Math.pow(Math.random(),.65)*1150,az=Math.random()*Math.PI*2,z=Math.random()*2-1,s=Math.sqrt(1-z*z);
  starPositions.set([distance*s*Math.cos(az),distance*z,distance*s*Math.sin(az)],i*3);
  c.setHSL(.54+Math.random()*.22,.28+Math.random()*.5,.66+Math.random()*.32);
  starColors.set([c.r,c.g,c.b],i*3);starSizes[i]=1.8+Math.random()*3.7;starPhases[i]=Math.random()*6.28;
 }
 const starsGeo=new THREE.BufferGeometry();
 starsGeo.setAttribute('position',new THREE.BufferAttribute(starPositions,3));
 starsGeo.setAttribute('color',new THREE.BufferAttribute(starColors,3));
 starsGeo.setAttribute('aSize',new THREE.BufferAttribute(starSizes,1));
 starsGeo.setAttribute('aPhase',new THREE.BufferAttribute(starPhases,1));
 const starsMat=new THREE.ShaderMaterial({vertexShader:starVertex,fragmentShader:starFragment,uniforms:{uTime:uniforms.uTime},vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const palette=[new THREE.Color('#82b9db'),new THREE.Color('#f875b4'),new THREE.Color('#4963b8'),new THREE.Color('#f5c58a')];
 const moodColor=new THREE.Color();
 const stars=new THREE.Points(starsGeo,starsMat);scene.add(stars);disposables.push(starsGeo,starsMat);
 const nebulae:THREE.Mesh[]=[];
 for(let i=0;i<2;i++){
  const geometry=new THREE.SphereGeometry(650+i*210,mobile?32:56,mobile?20:36);
  const material=new THREE.ShaderMaterial({vertexShader:nebulaVertex,fragmentShader:nebulaFragment,uniforms:{...uniforms,uColor:{value:new THREE.Color([0x513777,0x18416a][i])}},transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const mesh=new THREE.Mesh(geometry,material);mesh.rotation.set(i*.9,i*1.4,i*.3);scene.add(mesh);nebulae.push(mesh);disposables.push(geometry,material);
 }
 const count=mobile?1800:3900;
 const points=new Float32Array(count*3),phases=new Float32Array(count);
 for(let i=0;i<count;i++){
  const theta=Math.random()*Math.PI*2,z=Math.random()*2-1,r=8+Math.random()*12,k=Math.sqrt(1-z*z);
  points.set([r*k*Math.cos(theta),r*z,r*k*Math.sin(theta)],i*3);phases[i]=Math.random()*Math.PI*2;
 }
 const coreGeo=new THREE.BufferGeometry();coreGeo.setAttribute('position',new THREE.BufferAttribute(points,3));coreGeo.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
 const coreMat=new THREE.ShaderMaterial({vertexShader:particleVertex,fragmentShader:particleFragment,uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const core=new THREE.Points(coreGeo,coreMat);scene.add(core);disposables.push(coreGeo,coreMat);
 const innerGeo=new THREE.SphereGeometry(8,32,24);
 const innerMat=new THREE.MeshBasicMaterial({color:0x5135e6,transparent:true,opacity:.27,depthWrite:false,blending:THREE.AdditiveBlending});
 const inner=new THREE.Mesh(innerGeo,innerMat);scene.add(inner);disposables.push(innerGeo,innerMat);
 const destinations=[
  {name:'Plazma Kalbi',position:new THREE.Vector3(0,0,85)},
  {name:'Mor Ufuk',position:new THREE.Vector3(260,95,-190)},
  {name:'Mavi Sessizlik',position:new THREE.Vector3(-330,-60,-250)},
  {name:'Derin Boşluk',position:new THREE.Vector3(110,160,-540)}
 ];
 const markerGeo=new THREE.OctahedronGeometry(4,1);
 const markerMat=new THREE.MeshBasicMaterial({color:0x9db6ff,wireframe:true,transparent:true,opacity:.6});
 const markers=destinations.slice(1).map((d,i)=>{const m=new THREE.Mesh(markerGeo,markerMat);m.position.copy(d.position);scene.add(m);return m;});
 disposables.push(markerGeo,markerMat);
 const shockGeo=new THREE.RingGeometry(1,1.045,96);
 const shockMat=new THREE.MeshBasicMaterial({color:0x8fc9ff,side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
 const shock=new THREE.Mesh(shockGeo,shockMat);scene.add(shock);disposables.push(shockGeo,shockMat);
 let shockAge=10,beatCooldown=0,previousBass=0;
 function update(dt:number,time:number,bands:AudioBands,camera:THREE.Camera,atmosphere:Atmosphere){
  uniforms.uTime.value=time;uniforms.uBass.value=bands.bass;uniforms.uMid.value=bands.mid;
  const weights=[atmosphere.calm,atmosphere.energy,atmosphere.melancholy,atmosphere.euphoria];
  moodColor.setRGB(0,0,0);
  palette.forEach((c,i)=>moodColor.r+=c.r*weights[i],moodColor.g+=c.g*weights[i],moodColor.b+=c.b*weights[i]);
  uniforms.uMoodGlow.value=.55+atmosphere.intensity*.75;
  nebulae.forEach((n,i)=>{const material=n.material as THREE.ShaderMaterial;const tint=moodColor.clone().multiplyScalar(i===0?.85:.55);material.uniforms.uColor.value.copy(tint);});
  innerMat.color.lerp(moodColor,1-Math.exp(-dt*.5));
  stars.rotation.y+=dt*(.001+atmosphere.motion*.013);
  nebulae.forEach((n,i)=>{n.rotation.y+=dt*(i%2?-.002:.003);n.rotation.z+=dt*.001;});
  markers.forEach((m,i)=>{m.rotation.y+=dt*(.05+atmosphere.motion*.3+i*.04);m.rotation.x+=dt*.08;m.scale.setScalar(1+bands.mid*.25);});
  core.rotation.y+=dt*(.018+atmosphere.motion*.2+bands.mid*.12);core.rotation.x+=dt*.025;
  inner.scale.setScalar(1+bands.bass*.55);innerMat.opacity=.13+bands.bass*.25;
  beatCooldown=Math.max(0,beatCooldown-dt);
  if((bands.beat||(bands.bass>.26&&bands.bass-previousBass>.085))&&beatCooldown===0){shockAge=0;beatCooldown=.26;}
  previousBass=bands.bass;
  shockAge+=dt;
  shock.visible=shockAge<1.4;
  if(shock.visible){shock.position.set(0,0,0);shock.quaternion.copy(camera.quaternion);shock.scale.setScalar(12+shockAge*88);shockMat.opacity=.62*Math.pow(1-shockAge/1.4,2);}
 }
 return {update,dispose(){[stars,core,inner,shock,...nebulae,...markers].forEach(o=>scene.remove(o));disposables.forEach(o=>o.dispose());}};
}
