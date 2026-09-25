import {Edge} from './sequencer.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const scales=[[0,1,2,3,4,5,6,7,8,9,10,11],[0,2,4,5,7,9,11],[0,2,3,5,7,8,10],[0,2,4,7,9]];
export function quantize(cv,scale=0,root=0){
 const semitones=cv*12-root,octave=Math.floor(semitones/12),notes=scales[clamp(Math.round(scale),0,3)];let nearest=0,distance=Infinity;
 for(let o=octave-1;o<=octave+1;o++)for(const note of notes){const candidate=o*12+note,d=Math.abs(candidate-semitones);if(d<distance){nearest=candidate;distance=d;}}
 return (nearest+root)/12;
}
export class Utilities {
 constructor(rate){this.rate=rate;this.clock=new Edge();this.switchClock=new Edge();this.functionGate=new Edge();this.count=-1;this.position=0;this.switchStarted=false;this.envelope=0;this.stage=0;this.slew=0;}
 reset(){this.count=-1;this.position=0;this.switchStarted=false;this.clock.high=false;this.switchClock.high=false;}
 tick(p,s,input,reset=false){
  if(reset)this.reset();
  const edge=this.clock.tick(input('tools.clockIn'));
  if(edge)this.count=(this.count+1)%24;
  for(const d of [2,4,8])s['tools.div'+d]=this.count>=0&&this.count%d===0&&this.clock.high?5:0;
  if(this.switchClock.tick(input('tools.switchClock'))){if(this.switchStarted)this.position=(this.position+1)%3;this.switchStarted=true;}
  s['tools.switchOut']=input('tools.switch'+(this.position+1));
  s['tools.mixOut']=clamp(input('tools.mix1')*p['tools.mix1']+input('tools.mix2')*p['tools.mix2']+input('tools.mix3')*p['tools.mix3']+p['tools.offset'],-20,20);
  const trigger=this.functionGate.tick(input('tools.functionGate'));
  if(trigger||(this.stage===0&&p['tools.cycle']>.5))this.stage=1;
  let end=0;
  if(this.stage===1){this.envelope=Math.min(1,this.envelope+1/(this.rate*p['tools.rise']));if(this.envelope>=1)this.stage=2;}
  else if(this.stage===2){this.envelope=Math.max(0,this.envelope-1/(this.rate*p['tools.fall']));if(this.envelope===0){this.stage=0;end=5;}}
  s['tools.function']=this.envelope*10;s['tools.end']=end;
  for(const channel of ['A','B'])s['tools.vca'+channel]=clamp(input('tools.vca'+channel+'In')*clamp(p['tools.gain'+channel]+input('tools.vca'+channel+'CV')*.1,0,1),-20,20);
  s['tools.quantized']=quantize(input('tools.quantizeIn'),p['tools.scale'],Math.round(p['tools.root']));
  const target=input('tools.slewIn'),seconds=target>this.slew?p['tools.slewRise']:p['tools.slewFall'];
  // Linear slope: the time control specifies seconds per volt, in either direction.
  this.slew+=clamp(target-this.slew,-1/(seconds*this.rate),1/(seconds*this.rate));s['tools.slew']=this.slew;
 }
}
