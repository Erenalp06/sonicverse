import {analyzeAudio,fallbackBeatMap,designLevel,hashSeed,type BeatMap,type LevelDesign} from './levelGenerator';
import {trending,searchTracks,streamUrl,type Track} from './audius';
import './game.css';

const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`<canvas id="game" aria-label="SonicVerse ritim platform oyunu"></canvas>
<div class="top"><div class="brand">SONIC<span>VERSE</span><small>RHYTHM RUNNER · 2D</small></div><div class="stats"><span id="score">00000</span><span id="percent">0%</span><span id="best">REKOR 0</span></div><button id="musicToggle">♫ MÜZİK</button></div>
<div class="musicPanel" id="musicPanel"><div class="musicHead"><strong>Müzik seç</strong><button id="closeMusic">×</button></div><label class="upload">Dosyadan müzik yükle<input id="file" type="file" accept="audio/*"></label><div class="search"><input id="search" placeholder="Audius'ta şarkı ara"><button id="popular">Popüler</button></div><div id="results"></div><div id="song">Müzik seçilmedi · demo harita kullanılacak</div><div id="levelInfo">Demo haritası hazır</div><div id="audioError"></div></div>
<div class="bottom"><span>BOŞLUK / ↑ / DOKUN: ZIPLA</span><button id="pause">DURAKLAT</button><button id="restart">YENİDEN</button></div>
<div class="overlay" id="overlay"><div class="hero"><span class="eyebrow">SONICVERSE // LEVEL 01</span><h1>NEON <em>RUSH</em></h1><p>Müzikle hızlanan, engellerle dolu bir neon dünyasında koş. Zıplamak için dokun veya boşluk tuşuna bas.</p><button id="start">OYUNA BAŞLA <span>→</span></button><small id="message">Engellere çarpmadan ilerle. Müzik seçmek isteğe bağlı.</small></div></div>`;

const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const ctx=canvas.getContext('2d')!;
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const overlay=$<HTMLDivElement>('overlay'),message=$<HTMLElement>('message'),scoreEl=$<HTMLElement>('score'),bestEl=$<HTMLElement>('best'),percentEl=$<HTMLElement>('percent');
const audio=new Audio();audio.crossOrigin='anonymous';audio.preload='metadata';
let audioContext:AudioContext|undefined,analyser:AnalyserNode|undefined,frequency:Uint8Array<ArrayBuffer>|undefined;
let objectUrl:string|undefined;
let beatMap:BeatMap=fallbackBeatMap(hashSeed('sonicverse-demo'));
let selectedSong='sonicverse-demo';
let analyzing=false;
const levelInfo=()=>document.getElementById('levelInfo')!;
function setLevel(map:BeatMap){beatMap=map;levelInfo().textContent=`${map.bpm} BPM · ${map.source==='analysis'?'Şarkıdan oluşturulan':'Tahmini'} harita · ${Math.floor(map.duration)} sn`;if(mode==='playing'||mode==='paused'){mode='menu';overlay.classList.remove('hidden');message.textContent='Yeni şarkı haritası hazır. Başlatabilirsin.';}}
async function prepareTrack(id:string){selectedSong=id;setLevel(fallbackBeatMap(hashSeed(id),audio.duration&&Number.isFinite(audio.duration)?audio.duration:95));levelInfo().textContent+=' · Audius akışı: tahmini ritim';}
async function unlockAudio(){
 if(!audioContext){
  audioContext=new AudioContext();
  analyser=audioContext.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.8;
  audioContext.createMediaElementSource(audio).connect(analyser);analyser.connect(audioContext.destination);
  frequency=new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
 }
 await audioContext.resume();
}
const musicPanel=$<HTMLElement>('musicPanel');
$('musicToggle').addEventListener('click',()=>musicPanel.classList.toggle('open'));
$('closeMusic').addEventListener('click',()=>musicPanel.classList.remove('open'));
let tracks:Track[]=[];
function showTracks(list:Track[]){tracks=list;const container=$<HTMLElement>('results');container.replaceChildren();list.forEach((track,i)=>{const button=document.createElement('button');button.className='songItem';const img=document.createElement('img');if(track.artwork?.startsWith('https://'))img.src=track.artwork;img.alt='';const label=document.createElement('span');label.textContent=track.title+' — '+track.artist;button.append(img,label);button.addEventListener('click',async()=>{audio.pause();if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=undefined;}audio.src=streamUrl(tracks[i].id);void prepareTrack(tracks[i].id);$('song').textContent=label.textContent;try{await unlockAudio();audio.pause();audio.currentTime=0;$('audioError').textContent='';musicPanel.classList.remove('open');}catch(e){$('audioError').textContent='Parça oynatılamadı: '+String(e);}});container.append(button);});}
let searchController:AbortController|undefined;
async function loadMusic(query=''){searchController?.abort();searchController=new AbortController();try{showTracks(await(query?searchTracks(query,searchController.signal):trending(searchController.signal)));}catch(e){if((e as Error).name!=='AbortError')$('audioError').textContent='Audius bağlantısı kurulamadı.';}}
let searchTimer=0;
$<HTMLInputElement>('search').addEventListener('input',e=>{clearTimeout(searchTimer);searchTimer=window.setTimeout(()=>void loadMusic((e.target as HTMLInputElement).value.trim()),350);});
$('popular').addEventListener('click',()=>void loadMusic());
$<HTMLInputElement>('file').addEventListener('change',async e=>{const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;audio.pause();if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);audio.src=objectUrl;selectedSong=file.name+':'+file.size;$('song').textContent=file.name;analyzing=true;levelInfo().textContent='Şarkı analiz ediliyor...';try{const bytes=await file.arrayBuffer();const map=await analyzeAudio(bytes,hashSeed(selectedSong));setLevel(map);}catch(error){setLevel(fallbackBeatMap(hashSeed(selectedSong)));$('audioError').textContent='Analiz başarısız, tahmini harita kullanılıyor: '+String(error);}finally{analyzing=false;}try{await unlockAudio();audio.pause();audio.currentTime=0;$('audioError').textContent='';musicPanel.classList.remove('open');}catch(e){$('audioError').textContent=String(e);}});
void loadMusic();

let w=0,h=0,dpr=1,ground=0;
function resize(){dpr=Math.min(devicePixelRatio||1,2);w=innerWidth;h=innerHeight;canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ground=h*.77;}
addEventListener('resize',resize);resize();

type Obstacle={x:number,type:'spike'|'double'|'block'|'orb';w:number,h:number,passed:boolean};
type Particle={x:number,y:number,vx:number,vy:number,life:number,hue:number};
let obstacles:Obstacle[]=[],particles:Particle[]=[];
let design:LevelDesign={obstacles:[],sections:[],markers:[]};
let musicClock=0,beatFlash=0,lastBeatIndex=-1;
let mode:'menu'|'playing'|'paused'|'dead'|'won'='menu';
let player={x:0,y:0,vy:0,size:36,angle:0,onGround:true};
let distance=0,score=0,best=0,beat=0,energy=0,mid=0,treble=0,last=0,elapsed=0,shake=0;
let levelLength=13500;
const levelSpeed=330;
try{best=Number(localStorage.getItem('sonicverse-best')||0)||0;}catch{}
bestEl.textContent='REKOR '+best;
const rand=(a:number,b:number)=>a+Math.random()*(b-a);
function reset(){distance=0;score=0;elapsed=0;levelLength=beatMap.duration*levelSpeed;design=designLevel(beatMap,levelSpeed);obstacles=design.obstacles;musicClock=0;beatFlash=0;lastBeatIndex=-1;particles=[];player={x:Math.min(w*.24,290),y:ground-36,vy:0,size:36,angle:0,onGround:true};shake=0;mode='playing';overlay.classList.add('hidden');}
function start(){if(analyzing)return;audio.pause();try{audio.currentTime=0;}catch{}reset();if(audio.src)void unlockAudio().then(()=>audio.play()).catch(()=>{});}
function end(won:boolean){audio.pause();mode=won?'won':'dead';overlay.classList.remove('hidden');overlay.querySelector('h1')!.innerHTML=won?'LEVEL <em>TAMAMLANDI</em>':'OYUN <em>BİTTİ</em>';message.textContent=won?'Harika! Yeni bir tur için tekrar başla.':'Skor '+score+' · Yeniden dene ve rekorunu geliştir.';$('start').textContent='TEKRAR OYNA →';if(score>best){best=score;try{localStorage.setItem('sonicverse-best',String(best));}catch{}}bestEl.textContent='REKOR '+best;}
function jump(){if(mode==='menu'||mode==='dead'||mode==='won'){start();return;}if(mode==='paused'){mode='playing';return;}if(player.onGround){player.vy=-760;player.onGround=false;for(let i=0;i<10;i++)particles.push({x:player.x+18,y:ground,vx:rand(-130,60),vy:rand(-120,0),life:rand(.25,.6),hue:185});}}
$('start').addEventListener('click',start);$('restart').addEventListener('click',start);
$('pause').addEventListener('click',()=>{if(mode==='playing'){mode='paused';audio.pause();}else if(mode==='paused'){mode='playing';if(audio.src)void audio.play().catch(()=>{});}$('pause').textContent=mode==='paused'?'DEVAM':'DURAKLAT';});
addEventListener('keydown',e=>{if(['Space','ArrowUp','KeyW'].includes(e.code)){if((e.target as HTMLElement)?.matches('input'))return;e.preventDefault();if(!e.repeat)jump();}if(e.code==='KeyP')$('pause').click();});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();jump();});

function audioLevels(dt:number){
 if(analyser&&frequency&&!audio.paused){analyser.getByteFrequencyData(frequency);const avg=(a:number,b:number)=>{let v=0;for(let i=a;i<b;i++)v+=frequency![i];return v/(b-a)/255;};const target=avg(1,10),m=avg(10,75),t=avg(75,210);beat+=(target-beat)*Math.min(1,dt*12);mid+=(m-mid)*Math.min(1,dt*9);treble+=(t-treble)*Math.min(1,dt*8);}
 else{const pulse=(Math.sin(elapsed*7.5)+1)*.5;beat+=(.25+pulse*.3-beat)*Math.min(1,dt*6);mid+=(.2+pulse*.2-mid)*Math.min(1,dt*6);treble+=(.18+pulse*.12-treble)*Math.min(1,dt*6);}
 energy+=(Math.max(beat,mid)-energy)*Math.min(1,dt*2.5);
}
function collide(o:Obstacle,screenX:number){
 const px=player.x+7,py=player.y+6,ps=player.size-14;
 const ox=screenX+7,ow=o.w-14,oy=ground-o.h+8,oh=o.h-8;
 if(o.type==='orb'){return px<ox+ow&&px+ps>ox&&py<oy+oh&&py+ps>oy;}
 return px<ox+ow&&px+ps>ox&&py+ps>oy&&py<ground;
}
function update(dt:number){
 elapsed+=dt;audioLevels(dt);
 if(mode!=='playing')return;
 // The audio playhead is authoritative whenever playback is available.
 musicClock=audio.src&&!audio.paused&&Number.isFinite(audio.currentTime)?audio.currentTime:musicClock+dt;
 const beats=beatMap.beats;
 for(let i=lastBeatIndex+1;i<beats.length&&beats[i].time<=musicClock;i++){beatFlash=Math.max(beatFlash,.35+beats[i].strength*.65);lastBeatIndex=i;}
 beatFlash=Math.max(0,beatFlash-dt*3.3);
 const speed=levelSpeed;
 distance=musicClock*speed;
 score=Math.floor(distance/8);scoreEl.textContent=String(score).padStart(5,'0');percentEl.textContent=Math.min(100,Math.floor(distance/levelLength*100))+'%';
 if(distance>=levelLength){end(true);return;}
 // Obstacles are precomputed from the song's beat map.
 player.vy+=1850*dt;player.y+=player.vy*dt;
 if(player.y>=ground-player.size){player.y=ground-player.size;player.vy=0;player.onGround=true;player.angle+=(Math.round(player.angle/(Math.PI/2))*(Math.PI/2)-player.angle)*Math.min(1,dt*18);}
 else player.angle+=dt*7;
 for(const o of obstacles){const x=o.x-distance+player.x;if(!o.passed&&x+o.w<player.x){o.passed=true;score+=25;}if(collide(o,x)){shake=16;for(let i=0;i<36;i++)particles.push({x:player.x+18,y:player.y+18,vx:rand(-320,320),vy:rand(-330,250),life:rand(.35,.85),hue:rand(180,330)});end(false);break;}}
 obstacles=obstacles.filter(o=>o.x-distance+player.x>-140);
 if(Math.random()<.7)particles.push({x:rand(0,w),y:rand(0,ground),vx:-rand(40,180),vy:0,life:rand(.3,1),hue:rand(185,300)});
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0).slice(-300);
 shake*=Math.exp(-dt*14);
}
function polygon(x:number,y:number,r:number,sides:number,rotation=0){ctx.beginPath();for(let i=0;i<sides;i++){const a=rotation+i*Math.PI*2/sides;const xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.closePath();}
function draw(){
 ctx.clearRect(0,0,w,h);
 ctx.save();ctx.translate(rand(-shake,shake),rand(-shake,shake));
 const section=design.sections.find(x=>musicClock>=x.start&&musicClock<x.end)??design.sections[0];
 const hue=(section?.hue??190)+energy*45;
 const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#060a20');bg.addColorStop(.6,'#111038');bg.addColorStop(1,'#070a1d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const pulse=1+beat*.32+beatFlash*.32;
 for(let layer=0;layer<3;layer++){
  const step=layer===0?90:layer===1?155:230;
  const offset=(distance*(.12+layer*.17))%step;
  ctx.strokeStyle=`hsla(${hue+layer*35},95%,65%,${.06+layer*.04})`;ctx.lineWidth=1;
  for(let x=-step;x<w+step;x+=step){const xx=x-offset;ctx.beginPath();ctx.moveTo(xx,0);ctx.lineTo(xx+Math.sin(elapsed*.3+layer)*55,ground);ctx.stroke();}
 }
 for(let i=0;i<42;i++){const x=((i*177.37-distance*.07)%(w+100)+(w+100))%(w+100),y=((i*93.7)%(ground*.88));ctx.fillStyle=`rgba(172,201,255,${.15+(i%5)*.1})`;ctx.fillRect(x,y,i%7===0?3:1,i%7===0?3:1);}
 const sunX=w*.68,sunY=ground*.42,sunR=Math.min(w*.22,190)*pulse;
 const glow=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR*2);glow.addColorStop(0,`hsla(${hue+50},100%,62%,.23)`);glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(sunX-sunR*2,sunY-sunR*2,sunR*4,sunR*4);
 ctx.strokeStyle=`hsla(${hue+50},100%,76%,.3)`;ctx.lineWidth=2;for(let j=0;j<4;j++){ctx.beginPath();ctx.arc(sunX,sunY,sunR*(.6+j*.2),0,Math.PI*2);ctx.stroke();}
 // Repeating geometric architecture follows the musical bars and changes with sections.
 for(const marker of design.markers){
  const x=marker-distance+player.x;if(x<-160||x>w+160)continue;
  const barIndex=Math.floor((marker-420)/(levelSpeed*60/beatMap.bpm*4));
  const sectionAt=design.sections.find(sec=>marker>=sec.start*levelSpeed+420&&marker<sec.end*levelSpeed+420);
  const tint=sectionAt?.hue??hue;
  const towerHeight=85+(barIndex%3)*40+(sectionAt?.energy??.4)*110;
  ctx.save();ctx.strokeStyle=`hsla(${tint},100%,72%,${.28+beatFlash*.27})`;ctx.lineWidth=2;
  ctx.shadowColor=`hsl(${tint},100%,60%)`;ctx.shadowBlur=10+beatFlash*25;
  ctx.strokeRect(x-35,ground-towerHeight,70,towerHeight);
  ctx.beginPath();ctx.moveTo(x-48,ground-towerHeight);ctx.lineTo(x,ground-towerHeight-35);ctx.lineTo(x+48,ground-towerHeight);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,ground-towerHeight-35);ctx.lineTo(x,ground-towerHeight-78);ctx.stroke();
  for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(x-35,ground-towerHeight+j*24+18);ctx.lineTo(x+35,ground-towerHeight+j*24+18);ctx.stroke();}
  ctx.restore();
 }
 // Each detected beat expands a light ring around the runner.
 if(beatFlash>.02){
  ctx.save();ctx.globalAlpha=beatFlash*.65;ctx.strokeStyle=`hsl(${hue+90},100%,76%)`;ctx.lineWidth=3+beatFlash*5;ctx.shadowBlur=25;ctx.shadowColor='#ff69de';
  ctx.beginPath();ctx.arc(player.x+18,player.y+18,55+(1-beatFlash)*160,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 const base=ground;ctx.fillStyle='#0a102b';ctx.fillRect(0,base,w,h-base);ctx.shadowBlur=22;ctx.shadowColor='#31dcff';ctx.strokeStyle='#43dfff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,base);ctx.lineTo(w,base);ctx.stroke();ctx.shadowBlur=0;
 const grid=60;ctx.strokeStyle='rgba(62,169,250,.13)';ctx.lineWidth=1;for(let x=-(distance*.7%grid);x<w;x+=grid){ctx.beginPath();ctx.moveTo(x,base);ctx.lineTo(x+80,h);ctx.stroke();}
 for(let y=base+30;y<h;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 for(const o of obstacles){const x=o.x-distance+player.x;if(x<-100||x>w+100)continue;ctx.save();ctx.shadowColor=o.type==='orb'?'#fda8f9':'#ff3f9e';ctx.shadowBlur=14+beat*20;ctx.fillStyle=o.type==='orb'?'#d46aff':'#ff468e';ctx.strokeStyle='#ffb5dd';ctx.lineWidth=2;
 if(o.type==='block'){ctx.fillRect(x,base-o.h,o.w,o.h);ctx.strokeRect(x,base-o.h,o.w,o.h);ctx.fillStyle='#1b1035';ctx.fillRect(x+9,base-o.h+10,o.w-18,o.h-20);}
 else if(o.type==='orb'){polygon(x+o.w/2,base-o.h/2,o.w*.52,6,elapsed);ctx.fill();ctx.stroke();}
 else{const count=o.type==='double'?2:1;for(let j=0;j<count;j++){const sx=x+j*41;ctx.beginPath();ctx.moveTo(sx,base);ctx.lineTo(sx+21,base-o.h);ctx.lineTo(sx+42,base);ctx.closePath();ctx.fill();ctx.stroke();}}
 ctx.restore();}
 for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=`hsl(${p.hue},100%,75%)`;ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;
 ctx.save();ctx.translate(player.x+player.size/2,player.y+player.size/2);ctx.rotate(player.angle);ctx.shadowBlur=24;ctx.shadowColor='#4defff';ctx.fillStyle='#32dcf7';ctx.strokeStyle='#c3f9ff';ctx.lineWidth=3;ctx.fillRect(-18,-18,36,36);ctx.strokeRect(-18,-18,36,36);ctx.shadowBlur=0;ctx.fillStyle='#0a1740';ctx.fillRect(-10,-10,20,20);ctx.fillStyle='#b6ffff';ctx.fillRect(0,-10,10,10);ctx.restore();
 ctx.restore();
 // Musical phrase timeline: eight-bar sections are visibly distinct.
 if(mode==='playing'){
  const label=section?.kind==='drop'?'DROP':section?.kind==='build'?'YÜKSELİŞ':section?.kind==='break'?'SAKİN':section?.kind==='intro'?'GİRİŞ':'AKIŞ';
  ctx.save();ctx.textAlign='center';ctx.font='700 13px system-ui';ctx.fillStyle=`hsla(${hue},100%,82%,.9)`;
  ctx.fillText(`${label}  ·  ${beatMap.bpm} BPM`,w/2,Math.min(h-65,64));
  ctx.restore();
 }
 if(mode==='paused'){ctx.fillStyle='#03081999';ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 40px system-ui';ctx.fillText('DURAKLATILDI',w/2,h/2);}
}
function loop(now:number){const dt=Math.min(.033,(now-last)/1000||.016);last=now;update(dt);draw();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
