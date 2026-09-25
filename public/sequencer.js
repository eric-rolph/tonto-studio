const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function sequenceDefaults(){return {length:8,direction:'forward',division:4,width:.55,transpose:true,rowB:[0,1,2,1,3,2,4,1],rowC:[5,3,4,2,5,2,4,3],modes:Array(8).fill('play')};}
export function validateSequence(raw={}){
 const s=sequenceDefaults();
 if(Number.isFinite(raw.length))s.length=clamp(Math.round(raw.length),1,8);
 if(['forward','reverse','pendulum','random'].includes(raw.direction))s.direction=raw.direction;
 if([1,2,4,8].includes(raw.division))s.division=raw.division;
 if(Number.isFinite(raw.width))s.width=clamp(raw.width,.05,.95);
 if(typeof raw.transpose==='boolean')s.transpose=raw.transpose;
 for(const row of ['rowB','rowC'])if(Array.isArray(raw[row])&&raw[row].length===8&&raw[row].every(Number.isFinite))s[row]=raw[row].map(v=>clamp(v,-5,5));
 if(Array.isArray(raw.modes)&&raw.modes.length===8)s.modes=raw.modes.map(m=>['play','rest','skip'].includes(m)?m:'play');
 return s;
}
// Positive-going clock/reset inputs use hysteresis. A held voltage is one event.
export class Edge {
 constructor(){this.high=false;}
 tick(v){const before=this.high;if(v>=2)this.high=true;else if(v<=1)this.high=false;return this.high&&!before;}
}
export class StepSequencer {
 constructor(rate){this.rate=rate;this.clock=new Edge();this.resetEdge=new Edge();this.seed=731;this.step=0;this.phase=0;this.pulse=0;this.gate=0;this.manual=0;this.pending=null;this.running=false;this.externalStarted=false;this.travel=1;}
 configure(state){
  const starting=state.sequencer&&!this.running,stopping=!state.sequencer&&this.running;
  this.state=state;this.running=state.sequencer;
  this.available=Array.from({length:state.sequence.length},(_,i)=>i).filter(i=>state.sequence.modes[i]!=='skip');
  if(starting||stopping||!this.available.includes(this.step))this.reset();
 }
 reset(){this.syncIndex=undefined;this.step=this.state.sequence.direction==='reverse'?this.available.at(-1)??0:this.available[0]??0;this.phase=0;this.travel=1;this.externalStarted=false;this.manual=0;this.didReset=true;}
 advance(){
  const list=this.available,n=list.length;if(!n)return;
  const pos=Math.max(0,list.indexOf(this.step)),direction=this.state.sequence.direction;
  if(direction==='random'){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;this.step=list[Math.floor(this.seed/4294967296*n)];}
  else if(direction==='pendulum'){if(pos===n-1)this.travel=-1;else if(pos===0)this.travel=1;this.step=list[clamp(pos+this.travel,0,n-1)];}
  else this.step=list[(pos+(direction==='reverse'?-1:1)+n)%n];
 }
 command(action){if(['reset','step'].includes(action))this.pending=action;}
 tick(tempo,swing,external,resetVoltage,syncBeat=null){
  const reset=this.resetEdge.tick(resetVoltage)||this.pending==='reset',edge=this.clock.tick(external??0);
  if(reset)this.reset();
  if(this.pending==='step'){this.advance();this.phase=0;this.manual=Math.round(this.rate*.05);}
  this.pending=null;
  const settings=this.state.sequence;
  if(this.running&&external!==null){if(edge&&!reset){if(this.externalStarted)this.advance();this.externalStarted=true;}this.pulse=this.externalStarted&&this.clock.high?5:0;}
  else if(this.running&&Number.isFinite(syncBeat)){
   const steps=syncBeat*settings.division,pair=Math.floor(steps/2),within=steps-pair*2,index=pair*2+(within>=1+swing?1:0),phase=within<1+swing?within/(1+swing):(within-1-swing)/(1-swing);
   if(this.syncIndex===undefined||index<this.syncIndex){this.reset();this.syncIndex=0;}
   let moves=Math.min(100000,index-this.syncIndex);while(moves-->0)this.advance();this.syncIndex=index;this.phase=phase;this.pulse=phase<settings.width?5:0;
  }else if(this.running){this.syncIndex=undefined;
   // Test the boundary before emitting: the first sample belongs to step one.
   if(this.phase>=1&&!reset){this.phase-=1;this.advance();}
   this.pulse=this.phase<settings.width?5:0;
   this.phase+=tempo*settings.division/(60*this.rate*(1+(this.step%2?-swing:swing)));
  }else this.pulse=this.manual>0?5:0;
  if(this.manual>0)this.manual--;
  if(!this.available.length)this.pulse=0;
  this.gate=settings.modes[this.step]==='play'?this.pulse:0;
  const didReset=this.didReset;this.didReset=false;return !!didReset;
 }
}
