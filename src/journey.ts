import * as THREE from 'three';
import type {Atmosphere} from './emotionEngine';

export type Journey={update:(dt:number,time:number,bass:number,mid:number,treble:number,mood:Atmosphere)=>void;reset:()=>void;setEnabled:(v:boolean)=>void;enabled:()=>boolean;dispose:()=>void};

const portalVertex=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
const portalFragment=`
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uEnergy;
uniform float uVariation;
uniform vec3 uTint;
void main(){
 vec2 p=(vUv-.5)*2.;
 float r=length(p);
 float angle=atan(p.y,p.x);
 float swirl=sin(angle*(5.+uVariation*2.)+r*16.-uTime*(.4+uVariation*.2));
 float spiral=exp(-pow((r-(.46+.12*swirl)),2.)*180.);
 float halo=exp(-pow((r-.61),2.)*34.)*.18;
 float arcs=pow(max(0.,sin(angle*9.+r*13.-uTime*.55)),9.)*exp(-pow(r-.66,2.)*24.);
 float core=exp(-r*r*42.)*.11;
 float mask=1.-smoothstep(.83,1.,r);
 float a=(spiral*.28+halo+arcs*.28+core)*mask*(.48+uEnergy*.8);
 if(a<.006)discard;
 vec3 tint=mix(uTint,vec3(.54,.81,1.),clamp(spiral*.45,0.,.8));
 gl_FragColor=vec4(tint*(.65+uEnergy*.7),a);
}`;

export function createJourney(scene:THREE.Scene,camera:THREE.PerspectiveCamera,mobile:boolean):Journey{
 const group=new THREE.Group();scene.add(group);
 const segmentLength=95,segmentCount=mobile?11:16,verticesPerRing=96;
 const positions=new Float32Array(segmentCount*verticesPerRing*3);
 const colors=new Float32Array(positions.length);
 const ringGeo=new THREE.BufferGeometry();
 const ringPosition=new THREE.BufferAttribute(positions,3);
 const ringColor=new THREE.BufferAttribute(colors,3);
 ringGeo.setAttribute('position',ringPosition);ringGeo.setAttribute('color',ringColor);
 const ringMat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending});
 const rings=new THREE.LineSegments(ringGeo,ringMat);group.add(rings);

 const strandCount=mobile?12:22,strandSteps=mobile?26:44;
 const strandPositions=new Float32Array(strandCount*strandSteps*2*3);
 const strandGeo=new THREE.BufferGeometry();
 const strandAttribute=new THREE.BufferAttribute(strandPositions,3);
 strandGeo.setAttribute('position',strandAttribute);
 const strandMat=new THREE.LineBasicMaterial({color:0x8b9fff,transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending});
 const strands=new THREE.LineSegments(strandGeo,strandMat);group.add(strands);

 const sparkCount=mobile?950:2300;
 const sparkPositions=new Float32Array(sparkCount*3);
 const sparkGeo=new THREE.BufferGeometry();
 const sparkAttr=new THREE.BufferAttribute(sparkPositions,3);
 sparkGeo.setAttribute('position',sparkAttr);
 const sparkMat=new THREE.PointsMaterial({color:0xa7c8ff,size:mobile?1.35:1.8,transparent:true,opacity:.66,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
 const sparks=new THREE.Points(sparkGeo,sparkMat);group.add(sparks);

 const portalCount=mobile?5:8;
 const portalGeo=new THREE.PlaneGeometry(1,1);
 const portals:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>[]=[];
 for(let i=0;i<portalCount;i++){
  const material=new THREE.ShaderMaterial({vertexShader:portalVertex,fragmentShader:portalFragment,uniforms:{uTime:{value:0},uEnergy:{value:0},uVariation:{value:i%4},uTint:{value:new THREE.Color('#7598ff')}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const portal=new THREE.Mesh(portalGeo,material);portal.frustumCulled=false;group.add(portal);portals.push(portal);
 }
 const palettes=[new THREE.Color('#7ccad2'),new THREE.Color('#ff67ae'),new THREE.Color('#5b7acb'),new THREE.Color('#ffc478')];
 const tint=new THREE.Color(),lookMatrix=new THREE.Matrix4(),desiredRotation=new THREE.Quaternion();
 const cameraTarget=new THREE.Vector3(),cameraCurrent=new THREE.Vector3();
 const tangent=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),forwardPoint=new THREE.Vector3(),backPoint=new THREE.Vector3(),trackPoint=new THREE.Vector3();
 const trackUp=new THREE.Vector3(0,1,0);
 let distance=0,velocity=0,active=false;
 function center(d:number,out=new THREE.Vector3()){
  return out.set(
   Math.sin(d*.0068)*120+Math.sin(d*.0027)*70+Math.sin(d*.015)*15,
   Math.cos(d*.0076)*84+Math.sin(d*.0034)*52+Math.sin(d*.012)*14,
   -d+Math.sin(d*.003)*32
  );
 }
 function frame(d:number){
  center(d+3,forwardPoint);center(d-3,backPoint);
  tangent.copy(forwardPoint).sub(backPoint).normalize();
  right.crossVectors(tangent,trackUp).normalize();
  up.crossVectors(right,tangent).normalize();
  const bank=Math.max(-.72,Math.min(.72,(Math.sin(d*.0068)*.52+Math.cos(d*.0076)*.45)));
  const c=Math.cos(bank),sn=Math.sin(bank);
  const rx=right.x,ry=right.y,rz=right.z;
  right.set(rx*c+up.x*sn,ry*c+up.y*sn,rz*c+up.z*sn);
  up.set(up.x*c-rx*sn,up.y*c-ry*sn,up.z*c-rz*sn);
 }
 function track(d,x,y,out:THREE.Vector3){
  center(d,out);frame(d);
  return out.addScaledVector(right,x).addScaledVector(up,y);
 }
 function reset(){distance=0;velocity=0;camera.position.copy(center(0));camera.lookAt(center(70));camera.fov=72;camera.updateProjectionMatrix();}
 function setEnabled(value:boolean){active=value;group.visible=value;if(value)reset();}
 function update(dt:number,time:number,bass:number,mid:number,treble:number,mood:Atmosphere){
  if(!active)return;
  const desired=16+mid*24+bass*54+mood.energy*16+mood.euphoria*21;
  velocity+=(desired-velocity)*(1-Math.exp(-dt*1.7));distance+=velocity*dt;
  track(distance,Math.sin(time*.37)*(.4+mood.calm*.9),Math.cos(time*.31)*.5,cameraCurrent);
  camera.position.lerp(cameraCurrent,1-Math.exp(-dt*3.8));
  center(distance+65,cameraTarget);
  frame(distance+16);
  lookMatrix.lookAt(camera.position,cameraTarget,up);
  desiredRotation.setFromRotationMatrix(lookMatrix);
  camera.quaternion.slerp(desiredRotation,1-Math.exp(-dt*2.0));
  const targetFov=70+Math.min(12,bass*15+mood.energy*7);
  camera.fov+=(targetFov-camera.fov)*(1-Math.exp(-dt*1.7));camera.updateProjectionMatrix();

  tint.setRGB(0,0,0);
  const weights=[mood.calm,mood.energy,mood.melancholy,mood.euphoria];
  for(let i=0;i<4;i++){tint.r+=palettes[i].r*weights[i];tint.g+=palettes[i].g*weights[i];tint.b+=palettes[i].b*weights[i];}
  const start=Math.floor(distance/segmentLength);
  let n=0;
  for(let s=0;s<segmentCount;s++){
   const d=(start+s+1)*segmentLength;
   const radius=33+Math.sin(d*.005)*10+bass*10;
   const points=verticesPerRing/2;
   for(let k=0;k<points;k++){
    const a=k*Math.PI*2/points,b=(k+1)*Math.PI*2/points;
    const shape=(angle:number)=>1+Math.sin(angle*5+time*.22+d*.002)*(.07+mid*.12);
    track(d,Math.cos(a)*radius*shape(a),Math.sin(a)*radius*shape(a),trackPoint);
    positions.set([trackPoint.x,trackPoint.y,trackPoint.z],n*3);
    track(d,Math.cos(b)*radius*shape(b),Math.sin(b)*radius*shape(b),trackPoint);
    positions.set([trackPoint.x,trackPoint.y,trackPoint.z],(n+1)*3);
    const fade=.22+.55*Math.pow(Math.sin((s/segmentCount)*Math.PI),2);
    colors.set([tint.r*fade,tint.g*fade,tint.b*fade],n*3);
    colors.set([tint.r*fade,tint.g*fade,tint.b*fade],(n+1)*3);
    n+=2;
   }
  }
  ringPosition.needsUpdate=true;ringColor.needsUpdate=true;
  ringGeo.computeBoundingSphere();

  n=0;
  for(let j=0;j<strandCount;j++){
   const phase=j*2.39996;
   for(let k=0;k<strandSteps;k++){
    const d=distance+15+k*38;
    const angle=phase+d*.006*(j%2?1:-1)+time*.08;
    const r=44+Math.sin(d*.006+j)*12+bass*8;
    const angle2=phase+(d+38)*.006*(j%2?1:-1)+time*.08;
    const r2=44+Math.sin((d+38)*.006+j)*12+bass*8;
    track(d,Math.cos(angle)*r,Math.sin(angle)*r,trackPoint);
    strandPositions.set([trackPoint.x,trackPoint.y,trackPoint.z],n*3);
    track(d+38,Math.cos(angle2)*r2,Math.sin(angle2)*r2,trackPoint);
    strandPositions.set([trackPoint.x,trackPoint.y,trackPoint.z],(n+1)*3);
    n+=2;
   }
  }
  strandAttribute.needsUpdate=true;strandGeo.computeBoundingSphere();
  strandMat.color.copy(tint);strandMat.opacity=.11+mid*.22+mood.euphoria*.12;

  for(let i=0;i<sparkCount;i++){
   const d=distance+((i*37.73)%1700)-100;
   const angle=i*2.39996+time*.035;
   const radius=16+((i*13.7)%145);
   track(d,Math.cos(angle)*radius,Math.sin(angle)*radius,trackPoint);
   sparkPositions.set([trackPoint.x,trackPoint.y,trackPoint.z],i*3);
  }
  sparkAttr.needsUpdate=true;sparkGeo.computeBoundingSphere();
  sparkMat.color.copy(tint);sparkMat.opacity=.35+treble*.5;

  const portalSpacing=255;
  const portalStart=Math.floor(distance/portalSpacing);
  portals.forEach((portal,i)=>{
   const d=(portalStart+i+1)*portalSpacing;
   const p=center(d);
   portal.position.copy(p);
   frame(d);
   lookMatrix.lookAt(p,forwardPoint,up);
   portal.quaternion.setFromRotationMatrix(lookMatrix);
   const scale=100+Math.sin(d*.004)*30+bass*22;
   portal.scale.set(scale,scale,1);
   portal.rotateZ(d*.003+time*.035*(i%2?1:-1));
   portal.material.uniforms.uTime.value=time;
   portal.material.uniforms.uEnergy.value=.25+mid*.8+bass*.9+mood.euphoria*.25;
   portal.material.uniforms.uTint.value.copy(tint);
  });
  ringMat.opacity=.1+mid*.22+bass*.13;
 }
 return {update,reset,setEnabled,enabled:()=>active,dispose(){scene.remove(group);ringGeo.dispose();ringMat.dispose();strandGeo.dispose();strandMat.dispose();sparkGeo.dispose();sparkMat.dispose();portalGeo.dispose();portals.forEach(p=>p.material.dispose());}};
}
