export type Mood='calm'|'energy'|'melancholy'|'euphoria';
export type MoodMode='auto'|Mood;
export type Bands={bass:number;mid:number;treble:number};
export type Atmosphere={calm:number;energy:number;melancholy:number;euphoria:number;intensity:number;motion:number};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export class EmotionEngine{
 private baseline=.22;
 private dynamics=.0;
 private previous=.0;
 private state:Atmosphere={calm:.7,energy:.1,melancholy:.15,euphoria:.05,intensity:.15,motion:.2};
 update(dt:number,bands:Bands,playing:boolean,mode:MoodMode):Atmosphere{
  const level=clamp(bands.bass*.44+bands.mid*.39+bands.treble*.17);
  const speed=clamp(Math.abs(level-this.previous)*8);
  this.previous=level;
  const adaptation=1-Math.exp(-dt*.28);
  if(playing){this.baseline+=(level-this.baseline)*adaptation;this.dynamics+=(speed-this.dynamics)*(1-Math.exp(-dt*.8));}
  const activity=clamp(level*.72+this.dynamics*.28);
  const brightness=clamp(bands.treble*.65+bands.mid*.35);
  const scores:Record<Mood,number>={
   calm:.2+(1-activity)*.7+(1-brightness)*.12,
   energy:.12+activity*.95+speed*.22,
   melancholy:.12+(1-activity)*.56+(1-brightness)*.35,
   euphoria:.08+activity*.7+brightness*.38
  };
  if(mode!=='auto'){for(const mood of Object.keys(scores) as Mood[])scores[mood]=mood===mode?1:0;}
  const total=Object.values(scores).reduce((a,b)=>a+b,0);
  const target={calm:scores.calm/total,energy:scores.energy/total,melancholy:scores.melancholy/total,euphoria:scores.euphoria/total,intensity:activity,motion:clamp(.12+activity*.9)};
  const smoothing=1-Math.exp(-dt*(mode==='auto'?.42:1.25));
  for(const key of Object.keys(this.state) as (keyof Atmosphere)[])this.state[key]+=(target[key]-this.state[key])*smoothing;
  return {...this.state};
 }
}
