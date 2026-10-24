import * as THREE from 'three';
import type {Atmosphere} from './emotionEngine';
export type Journey={update:(dt:number,time:number,bass:number,mid:number,treble:number,mood:Atmosphere)=>void;reset:()=>void;setEnabled:(v:boolean)=>void;enabled:()=>boolean;dispose:()=>void};
export function createJourney(scene:THREE.Scene,camera:THREE.PerspectiveCamera,mobile:boolean):Journey{
 const segmentLength=105,segmentCount=mobile?13:19;
 const group=new THREE.Group();scene.add(group);
 const geometry=new THREE.BufferGeometry();
 const positions=new Float32Array(segmentCount*64*3),colors=new Float32Array(segmentCount*64*3);
 const rings=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.46,depthWrite:false,blending:THREE.AdditiveBlending}));
 group.add(rings);
 const sparkCount=mobile?900:1800;
 const sparkPositions=new Float32Array(sparkCount*3),sparkSizes=new Float32Array(sparkCount);
 const sparkGeo=new THREE.BufferGeometry();
 const sparkMat=new THREE.PointsMaterial({color:0xa7c8ff,size:mobile?1.5:2.2,transparent:true,opacity:.68,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
 const sparks=new THREE.Points(sparkGeo,sparkMat);group.add(sparks);
 let distance=0,velocity=0,active=false;
 const color=new THREE.Color();
 function center(d:number){return new THREE.Vector3(Math.sin(d*.0018)*58+Math.sin(d*.0041)*13,Math.cos(d*.0015)*29+Math.sin(d*.003)*11,-d);}
 function reset(){distance=0;velocity=0;camera.position.copy(center(0));camera.position.z+=8;camera.lookAt(center(80));}
 function setEnabled(v:boolean){active=v;if(v)reset();else{rings.visible=false;sparks.visible=false;}}
 function update(dt:number,time:number,bass:number,mid:number,treble:number,mood:Atmosphere){
  if(!active)return;
  rings.visible=true;sparks.visible=true;
  const desired=13+mid*27+bass*42+mood.energy*18+mood.euphoria*24;
  velocity+=(desired-velocity)*(1-Math.exp(-dt*1.8));
  distance+=velocity*dt;
  const current=center(distance);
  const look=center(distance+65);
  const sway=Math.sin(time*.43)*(.3+mood.calm*.8);
  camera.position.lerp(current.add(new THREE.Vector3(sway,Math.cos(time*.36)*.5,7)),1-Math.exp(-dt*2.3));
  const orientation=new THREE.Matrix4().lookAt(camera.position,look,new THREE.Vector3(0,1,0));
  const desiredRotation=new THREE.Quaternion().setFromRotationMatrix(orientation);
  camera.quaternion.slerp(desiredRotation,1-Math.exp(-dt*1.6));
  camera.fov=THREE.MathUtils.lerp(camera.fov,72+Math.min(10,bass*14+mood.energy*6),1-Math.exp(-dt*1.5));camera.updateProjectionMatrix();
  const start=Math.floor(distance/segmentLength);
  const c1=new THREE.Color('#668ad4'),c2=new THREE.Color('#ed75bf'),c3=new THREE.Color('#78d4c4'),c4=new THREE.Color('#f5c477');
  color.setRGB(c1.r*mood.melancholy+c2.r*mood.energy+c3.r*mood.calm+c4.r*mood.euphoria,c1.g*mood.melancholy+c2.g*mood.energy+c3.g*mood.calm+c4.g*mood.euphoria,c1.b*mood.melancholy+c2.b*mood.energy+c3.b*mood.calm+c4.b*mood.euphoria);
  let index=0;
  for(let s=0;s<segmentCount;s++){
   const d=(start+s+1)*segmentLength;
   const p=center(d);
   const radius=34+Math.sin(d*.006)*9+bass*9;
   const corners=32;
   for(let k=0;k<corners;k++){
    const a=k*Math.PI*2/corners,b=(k+1)*Math.PI*2/corners;
    const shape=1+Math.sin(a*5+time*.3+d*.001)*(.09+mid*.14);
    const shapeB=1+Math.sin(b*5+time*.3+d*.001)*(.09+mid*.14);
    positions.set([p.x+Math.cos(a)*radius*shape,p.y+Math.sin(a)*radius*shape,p.z],index*3);
    positions.set([p.x+Math.cos(b)*radius*shapeB,p.y+Math.sin(b)*radius*shapeB,p.z],(index+1)*3);
    for(let j=0;j<2;j++)colors.set([color.r,color.g,color.b],(index+j)*3);
    index+=2;
   }
  }
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.computeBoundingSphere();
  for(let i=0;i<sparkCount;i++){
   const d=distance+((i*37.73)%1800)-120;
   const angle=i*2.39996+time*.012;
   const radius=25+((i*13.7)%125);
   const p=center(d);
   sparkPositions.set([p.x+Math.cos(angle)*radius,p.y+Math.sin(angle)*radius,p.z],i*3);
   sparkSizes[i]=1;
  }
  sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3));
  sparkGeo.computeBoundingSphere();
  sparkMat.color.copy(color);sparkMat.opacity=.28+treble*.55+mood.euphoria*.12;
  (rings.material as THREE.LineBasicMaterial).opacity=.17+mid*.28+bass*.18;
 }
 return {update,reset,setEnabled,enabled:()=>active,dispose(){scene.remove(group);geometry.dispose();(rings.material as THREE.Material).dispose();sparkGeo.dispose();sparkMat.dispose();}};
}
