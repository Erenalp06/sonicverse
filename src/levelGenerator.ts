export type BeatEvent={time:number;strength:number};
export type BeatMap={duration:number;bpm:number;beats:BeatEvent[];seed:number;source:'analysis'|'fallback'};
export type LevelObstacle={x:number;type:'spike'|'double'|'block'|'orb';w:number;h:number;passed:boolean};
export type LevelSection={start:number;end:number;energy:number;kind:'intro'|'flow'|'build'|'drop'|'break';hue:number};
export type TerrainPiece={x:number;w:number;rise:number;gap:boolean};
export type LevelDesign={obstacles:LevelObstacle[];sections:LevelSection[];markers:number[];terrain:TerrainPiece[]};

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function hashSeed(text:string){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export async function analyzeAudio(buffer:ArrayBuffer,seed:number):Promise<BeatMap>{
 const context=new OfflineAudioContext(1,44100,44100);
 let decoded:AudioBuffer;
 decoded=await context.decodeAudioData(buffer.slice(0));
 const rate=decoded.sampleRate,hop=512,window=1024;
 const channels=decoded.numberOfChannels;
 const samples=decoded.getChannelData(0);
 const second=channels>1?decoded.getChannelData(1):undefined;
 const count=Math.floor((samples.length-window)/hop);
 if(count<16)throw Error('Şarkı çok kısa.');
 const envelope=new Float32Array(count);
 let prev=0;
 for(let i=0;i<count;i++){
  let sum=0;const start=i*hop;
  for(let j=0;j<window;j+=4){const v=(samples[start+j]+(second?.[start+j]??samples[start+j]))*.5;sum+=v*v;}
  const rms=Math.sqrt(sum/(window/4));
  envelope[i]=Math.max(0,rms-prev*.85);prev=rms;
 }
 const smooth=new Float32Array(count);
 for(let i=0;i<count;i++){let sum=0,n=0;for(let j=Math.max(0,i-20);j<=Math.min(count-1,i+20);j++){sum+=envelope[j];n++;}smooth[i]=sum/n;}
 const candidates:BeatEvent[]=[];
 let lastTime=-1;
 for(let i=2;i<count-2;i++){
  const value=envelope[i],time=i*hop/rate;
  if(value>smooth[i]*1.55&&value>envelope[i-1]&&value>=envelope[i+1]&&time-lastTime>.19){
   candidates.push({time,strength:clamp(value/(smooth[i]*4+.0001),.1,1)});lastTime=time;
  }
 }
 let bpm=120,best=-Infinity;
 for(let b=75;b<=175;b++){
  const period=60/b;
  let quality=0;
  for(let i=1;i<candidates.length;i++){
   const delta=candidates[i].time-candidates[i-1].time;
   for(let k=1;k<=4;k++){const diff=Math.abs(delta-k*period);if(diff<.075)quality+=(1-diff/.075)*candidates[i].strength/k;}
  }
  if(quality>best){best=quality;bpm=b;}
 }
 const duration=decoded.duration;
 const step=60/bpm;
 // Quantized beat grid gives a stable, repeatable obstacle timeline.
 let phase=0,bestPhase=-1;
 for(let p=0;p<20;p++){const offset=p*step/20;let q=0;for(const c of candidates){const delta=Math.abs(((c.time-offset+step/2)%step+step)%step-step/2);if(delta<.085)q+=c.strength*(1-delta/.085);}if(q>bestPhase){bestPhase=q;phase=offset;}}
 const beats:BeatEvent[]=[];
 for(let t=phase;t<duration-.4;t+=step){let strength=.18;for(const c of candidates){const diff=Math.abs(c.time-t);if(diff<.12)strength=Math.max(strength,c.strength*(1-diff/.2));}beats.push({time:t,strength});}
 return {duration,bpm,beats,seed,source:'analysis'};
}
export function fallbackBeatMap(seed:number,duration=95):BeatMap{
 const random=rng(seed),bpm=100+Math.floor(random()*55),step=60/bpm,beats:BeatEvent[]=[];
 for(let time=0;time<duration;time+=step)beats.push({time,strength:.3+random()*.65});
 return {duration,bpm,beats,seed,source:'fallback'};
}
// Eight-bar phrases form coherent musical sections instead of unrelated obstacles.
export function designLevel(map:BeatMap,speed=330):LevelDesign{
 const random=rng(map.seed),obstacles:LevelObstacle[]=[],sections:LevelSection[]=[],markers:number[]=[],terrain:TerrainPiece[]=[];
 const step=60/map.bpm,bar=step*4,phrase=bar*8;
 const average=(a:number,b:number)=>{let total=0,count=0;for(const beat of map.beats)if(beat.time>=a&&beat.time<b){total+=beat.strength;count++;}return count?total/count:.25;};
 const phrases=Math.ceil(map.duration/phrase);
 const energies=Array.from({length:phrases},(_,i)=>average(i*phrase,(i+1)*phrase));
 const low=Math.min(...energies),high=Math.max(...energies),range=Math.max(.08,high-low);
 for(let i=0;i<phrases;i++){
  const start=i*phrase,end=Math.min(map.duration,(i+1)*phrase);
  const energy=clamp((energies[i]-low)/range,0,1);
  const previous=i?clamp((energies[i-1]-low)/range,0,1):energy;
  const next=i+1<phrases?clamp((energies[i+1]-low)/range,0,1):energy;
  const kind:LevelSection['kind']=i===0?'intro':energy<.24?'break':energy>.66&&energy-previous>.12?'drop':next-energy>.17?'build':'flow';
  sections.push({start,end,energy,kind,hue:kind==='drop'?310:kind==='break'?190:kind==='build'?265:210});
 }
 // Obstacle timings are aligned to beats, with intentional repeating four-bar motifs.
 // At this physics setting, a jump lasts about .82s. Obstacles are spaced >= 1.20s.
 let lastTime=-10;
 const place=(time:number,type:LevelObstacle['type'])=>{
  if(time<2.5||time>map.duration-1.5||time-lastTime<1.20)return false;
  const w=type==='double'?82:type==='block'?53:42;
  obstacles.push({x:time*speed+420,type,w,h:type==='block'?62:42,passed:false});lastTime=time;return true;
 };
 for(let p=0;p<phrases;p++){
  const section=sections[p],startBeat=Math.ceil(section.start/step);
  const pattern=section.kind==='intro'?[0,8,16,24]:section.kind==='break'?[0,12,24]:section.kind==='drop'?[0,4,8,12,16,20,24,28]:section.kind==='build'?[0,8,12,16,20,24,28]:[0,6,12,16,22,28];
  const motif=random();
  for(const offset of pattern){
   const index=startBeat+offset;
   const event=map.beats[index];if(!event)continue;
   const time=event.time;
   if(time<section.start||time>=section.end)continue;
   const type:LevelObstacle['type']=section.kind==='intro'||section.kind==='break'?'spike':motif<.35?'spike':motif<.7?'double':'block';
   place(time,type);
  }
  for(let t=section.start;t<section.end;t+=bar)markers.push(t*speed+420);
 }
 // Designed terrain phrases: flat run-up -> elevated ledge -> short jump gap -> landing.
 // Each motif is separated by a long recovery runway; no obstacle is placed on a transition.
 const worldEnd=map.duration*speed+900;
 const motifWidth=2200;
 for(let x=0,part=0;x<worldEnd;x+=motifWidth,part++){
  const section=sections.find(sec=>x>=sec.start*speed&&x<sec.end*speed);
  const variant=(part+Math.floor(random()*3))%3;
  const rise=variant===0?75:variant===1?110:90;
  const safeStart=x+650;
  const gapWidth=variant===1?95:80;
  terrain.push({x,w:650,rise:0,gap:false});
  terrain.push({x:safeStart,w:450,rise,gap:false});
  terrain.push({x:safeStart+450,w:gapWidth,rise:0,gap:true});
  terrain.push({x:safeStart+450+gapWidth,w:400,rise,gap:false});
  const tail=safeStart+450+gapWidth+400;
  terrain.push({x:tail,w:x+motifWidth-tail,rise:0,gap:false});
  // Only the safe, flat sections receive obstacles.
  void section;
 }
 const nearTransition=(x:number)=>terrain.some(p=>p.gap?x>p.x-200&&x<p.x+p.w+210:p.rise>0&&x>p.x-115&&x<p.x+p.w+115);
 const safeObstacles=obstacles.filter(o=>!nearTransition(o.x-420));
 // Place a few rhythmic accents on the elevated landing, after the player can settle.
 for(let i=0;i<terrain.length;i++){
  const piece=terrain[i];
  if(piece.rise>0&&piece.w>=400&&i>0&&terrain[i-1].gap){
   const x=piece.x+piece.w-90+420;
   if(x<worldEnd-600)safeObstacles.push({x,type:'spike',w:42,h:42,passed:false});
  }
 }
 safeObstacles.sort((a,b)=>a.x-b.x);
 return {obstacles:safeObstacles,sections,markers,terrain};
}
export function generateLevel(map:BeatMap,speed=330):LevelObstacle[]{return designLevel(map,speed).obstacles;}
