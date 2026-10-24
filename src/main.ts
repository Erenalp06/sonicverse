import {createCosmicWorld} from './cosmicWorld';
import {trending,searchTracks,streamUrl,type Track} from './audius';
import * as THREE from 'three';
import './style.css';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<div id="hud"><div class="hudtitle"><h1>SONICVERSE</h1><button id="collapse" aria-expanded="true" aria-label="Müzik panelini küçült">−</button></div><p>KOZMİK EVREN · Müziğin içinde uç</p><div class="controls"><label class="upload">Müzik seç<input id="file" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg"></label><button id="play" disabled>Oynat</button><button id="reset">Merkeze dön</button><button id="cinema" aria-pressed="false">Sinematik: Kapalı</button></div><div class="discovery"><div class="searchrow"><input id="search" type="search" placeholder="Audius: şarkı veya sanatçı ara" aria-label="Müzik ara"><button id="trending">Popüler</button></div><div id="results" aria-live="polite"></div></div><div class="destinations"><label for="destination">Keşif noktası</label><select id="destination"><option value="0">Plazma Kalbi</option><option value="1">Mor Ufuk</option><option value="2">Mavi Sessizlik</option><option value="3">Derin Boşluk</option></select><button id="travel">Git</button></div><div id="song">Henüz müzik seçilmedi</div><div class="meters"><div class="meter">BAS<div class="track"><div class="fill" id="bass"></div></div></div><div class="meter">ORTA<div class="track"><div class="fill" id="mid"></div></div></div><div class="meter">TİZ<div class="track"><div class="fill" id="treble"></div></div></div></div><div id="error"></div></div><div id="hint">WASD: uç · Q/E: yüksel/alçal · Fare: bakış · Dokunmatik: sol hareket / sağ bakış</div>`;
const file=document.querySelector<HTMLInputElement>('#file')!;
const play=document.querySelector<HTMLButtonElement>('#play')!;
const reset=document.querySelector<HTMLButtonElement>('#reset')!;
const song=document.querySelector<HTMLDivElement>('#song')!;
const error=document.querySelector<HTMLDivElement>('#error')!;
const hud=document.querySelector<HTMLDivElement>('#hud')!;
const collapse=document.querySelector<HTMLButtonElement>('#collapse')!;
collapse.addEventListener('click',()=>{const collapsed=hud.classList.toggle('collapsed');collapse.textContent=collapsed?'+':'−';collapse.setAttribute('aria-expanded',String(!collapsed));});
const cinema=document.querySelector<HTMLButtonElement>('#cinema')!;
const destination=document.querySelector<HTMLSelectElement>('#destination')!;
const travel=document.querySelector<HTMLButtonElement>('#travel')!;
const bars=['bass','mid','treble'].map(id=>document.getElementById(id)!);
const audio=new Audio();audio.preload='metadata';audio.crossOrigin='anonymous';
const results=document.querySelector<HTMLDivElement>('#results')!;
const search=document.querySelector<HTMLInputElement>('#search')!;
const popular=document.querySelector<HTMLButtonElement>('#trending')!;
let tracks:Track[]=[];let selected=-1;let controller:AbortController|undefined;
function showError(message:string){error.textContent=message;}
function renderTracks(items:Track[]){tracks=items;results.replaceChildren();if(!items.length){results.textContent='Uygun parça bulunamadı.';return;}items.forEach((track,index)=>{const row=document.createElement('button');row.className='result';row.type='button';const info=document.createElement('span');info.className='resultinfo';const title=document.createElement('strong');title.textContent=track.title;const artist=document.createElement('small');artist.textContent=track.artist;info.append(title,artist);if(track.artwork&&track.artwork.startsWith('https://')){const img=document.createElement('img');img.src=track.artwork;img.alt='';img.loading='lazy';row.append(img);}row.append(info);row.addEventListener('click',()=>void chooseTrack(index));results.append(row);});}
async function loadTracks(query?:string){controller?.abort();controller=new AbortController();results.textContent='Şarkılar yükleniyor…';showError('');try{renderTracks(await(query?searchTracks(query,controller.signal):trending(controller.signal)));}catch(e){if((e as Error).name==='AbortError')return;results.textContent='Müzik kataloğuna erişilemedi.';showError(String(e));}}
let debounce:number|undefined;
search.addEventListener('input',()=>{clearTimeout(debounce);const q=search.value.trim();debounce=window.setTimeout(()=>void loadTracks(q||undefined),400);});
popular.addEventListener('click',()=>{search.value='';void loadTracks();});
async function chooseTrack(index:number){const track=tracks[index];if(!track)return;selected=index;audio.pause();if(url){URL.revokeObjectURL(url);url=undefined;}audio.crossOrigin='anonymous';audio.src=streamUrl(track.id);song.textContent=track.title+' — '+track.artist;play.disabled=false;showError('');try{await startAudio();await audio.play();play.textContent='Duraklat';}catch(e){play.textContent='Oynat';showError('Audius akışı oynatılamadı. CORS veya yayın erişimi engellenmiş olabilir: '+String(e));}}
void loadTracks();
let url:string|undefined,context:AudioContext|undefined,analyser:AnalyserNode|undefined,source:MediaElementAudioSourceNode|undefined,data:Uint8Array<ArrayBuffer>|undefined;
file.addEventListener('change',()=>{const f=file.files?.[0];if(!f)return;audio.pause();if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(f);selected=-1;audio.src=url;song.textContent=f.name;play.disabled=false;play.textContent='Oynat';error.textContent='';});
async function startAudio(){if(!context){context=new AudioContext();analyser=context.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.83;source=context.createMediaElementSource(audio);source.connect(analyser);analyser.connect(context.destination);data=new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));}await context.resume();}
play.addEventListener('click',async()=>{try{if(audio.paused){await startAudio();await audio.play();play.textContent='Duraklat';}else{audio.pause();play.textContent='Oynat';}}catch(e){error.textContent='Ses başlatılamadı: '+String(e);}});
audio.addEventListener('ended',()=>{play.textContent='Oynat';if(selected>=0&&tracks.length>1)void chooseTrack((selected+1)%tracks.length);});
audio.addEventListener('error',()=>{if(audio.src)showError('Ses kaynağı yüklenemedi. Başka bir parça deneyin.');});
const scene=new THREE.Scene();scene.background=new THREE.Color('#02040e');scene.fog=new THREE.FogExp2('#02040e',.0015);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,2200);camera.position.set(0,0,85);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;app.prepend(renderer.domElement);
const mobile=/iPad|iPhone|Android/i.test(navigator.userAgent)||navigator.maxTouchPoints>1;
const world=createCosmicWorld(scene,mobile);
const landmarks=[new THREE.Vector3(0,0,85),new THREE.Vector3(260,95,-190),new THREE.Vector3(-330,-60,-250),new THREE.Vector3(110,160,-540)];
let cinematic=false;let autopilotTarget:THREE.Vector3|null=null;const smoothVelocity=new THREE.Vector3();
cinema.addEventListener('click',()=>{cinematic=!cinematic;autopilotTarget=null;cinema.textContent=cinematic?'Sinematik: Açık':'Sinematik: Kapalı';cinema.setAttribute('aria-pressed',String(cinematic));});
travel.addEventListener('click',()=>{autopilotTarget=landmarks[Number(destination.value)]?.clone()??null;cinematic=false;cinema.textContent='Sinematik: Kapalı';cinema.setAttribute('aria-pressed','false');});
let yaw=0,pitch=0;const keys=new Set<string>();const pointer=new Map<number,{x:number,y:number,side:string}>();
addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft'].includes(e.code))e.preventDefault();keys.add(e.code);});
addEventListener('keyup',e=>keys.delete(e.code));
renderer.domElement.addEventListener('pointerdown',e=>{renderer.domElement.setPointerCapture(e.pointerId);pointer.set(e.pointerId,{x:e.clientX,y:e.clientY,side:e.pointerType==='mouse'?'look':e.clientX<innerWidth*.42?'move':'look'});});
renderer.domElement.addEventListener('pointermove',e=>{const p=pointer.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(p.side==='look'){yaw-=dx*.0035;pitch=THREE.MathUtils.clamp(pitch-dy*.0035,-1.45,1.45);}p.x=e.clientX;p.y=e.clientY;});
renderer.domElement.addEventListener('pointerup',e=>pointer.delete(e.pointerId));renderer.domElement.addEventListener('pointercancel',e=>pointer.delete(e.pointerId));
reset.addEventListener('click',()=>{camera.position.set(0,0,85);smoothVelocity.set(0,0,0);autopilotTarget=null;cinematic=false;cinema.textContent='Sinematik: Kapalı';cinema.setAttribute('aria-pressed','false');yaw=0;pitch=0;});
const clock=new THREE.Clock();const forward=new THREE.Vector3(),right=new THREE.Vector3(),velocity=new THREE.Vector3();
let bass=0,mid=0,treble=0;
function energy(low:number,high:number){if(!analyser||!data||!context)return 0;const hz=context.sampleRate/analyser.fftSize;const a=Math.max(0,Math.floor(low/hz)),b=Math.min(data.length,Math.ceil(high/hz));let total=0;for(let i=a;i<b;i++)total+=data[i];return total/Math.max(1,b-a)/255;}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
if(analyser&&data&&!audio.paused){analyser.getByteFrequencyData(data);if(selected>=0&&audio.currentTime>3&&data.every(v=>v===0)){if(!error.textContent)showError('Ses oynuyor ancak FFT verisi sıfır. Audius akışı CORS nedeniyle analiz edilemiyor olabilir; yerel dosya kullanın.');}bass=THREE.MathUtils.lerp(bass,energy(25,180),.22);mid=THREE.MathUtils.lerp(mid,energy(180,2400),.18);treble=THREE.MathUtils.lerp(treble,energy(2400,11000),.2);}else{bass*=.95;mid*=.95;treble*=.95;}
[bass,mid,treble].forEach((v,i)=>bars[i].style.width=(v*100).toFixed(1)+'%');
camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
forward.set(0,0,-1).applyQuaternion(camera.quaternion);right.set(1,0,0).applyQuaternion(camera.quaternion);velocity.set(0,0,0);
if(keys.has('KeyW'))velocity.add(forward);if(keys.has('KeyS'))velocity.sub(forward);if(keys.has('KeyD'))velocity.add(right);if(keys.has('KeyA'))velocity.sub(right);if(keys.has('KeyE'))velocity.y+=1;if(keys.has('KeyQ'))velocity.y-=1;
for(const p of pointer.values()){if(p.side==='move'){const x=(p.x-innerWidth*.21)/(innerWidth*.21),y=(p.y-innerHeight*.65)/(innerHeight*.4);velocity.addScaledVector(right,THREE.MathUtils.clamp(x,-1,1));velocity.addScaledVector(forward,THREE.MathUtils.clamp(-y,-1,1));}}
if(velocity.lengthSq()>0){cinematic=false;autopilotTarget=null;cinema.textContent='Sinematik: Kapalı';cinema.setAttribute('aria-pressed','false');velocity.normalize().multiplyScalar(keys.has('ShiftLeft')?110:42);}
if(autopilotTarget){const delta=autopilotTarget.clone().sub(camera.position);if(delta.length()<4){autopilotTarget=null;smoothVelocity.set(0,0,0);}else{velocity.copy(delta.normalize().multiplyScalar(Math.min(110,delta.length()*.75)));}}
if(cinematic){const orbit=t*.065;const target=new THREE.Vector3(Math.sin(orbit)*120,Math.sin(t*.11)*32,Math.cos(orbit)*120);velocity.copy(target.sub(camera.position).multiplyScalar(.5));}
smoothVelocity.lerp(velocity,1-Math.exp(-dt*3.5));camera.position.addScaledVector(smoothVelocity,dt);
if(cinematic){const direction=new THREE.Vector3().sub(camera.position).normalize();const desiredYaw=Math.atan2(-direction.x,-direction.z);yaw+=Math.atan2(Math.sin(desiredYaw-yaw),Math.cos(desiredYaw-yaw))*Math.min(1,dt*1.5);pitch+=(Math.asin(THREE.MathUtils.clamp(direction.y,-1,1))-pitch)*Math.min(1,dt*1.5);}
world.update(dt,t,{bass,mid,treble,beat:false},camera);renderer.render(scene,camera);}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
