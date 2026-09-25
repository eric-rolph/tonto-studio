import {SynthCore as ArpCore,Envelope,Ladder,polyBlep} from './arp/dsp.js';
import {defaults,freshPatch,ports,matrixSources,matrixDestinations,validatePatch} from './model.js';
import {compileCable,transfer} from './bus.js';
import {StepSequencer} from './sequencer.js';
import {Utilities} from './utilities.js';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Oscillator {
 constructor(){this.phase=0;}
 tick(hz,rate,pw=.5){const dt=clamp(hz,.001,rate*.4)/rate,t=this.phase;this.phase=(t+dt)%1;this.sine=Math.sin(TAU*t);this.saw=2*t-1-polyBlep(t,dt);this.pulse=(t<pw?1:-1)+polyBlep(t,dt)-polyBlep((t-pw+1)%1,dt);return this.sine;}
}
class DiodeFilter {
 constructor(){this.z=new Float64Array(3);}
 tick(x,hz,res,rate){const g=1-Math.exp(-TAU*clamp(hz,20,rate*.16)/rate);x=Math.tanh(x-this.z[2]*res*3.7+.08)-Math.tanh(.08);for(let i=0;i<3;i++){this.z[i]+=g*(Math.tanh(x*1.15)-Math.tanh(this.z[i]*1.15));x=this.z[i];}return x;}
}
export class ModularCore {
 constructor(rate=48000){
  this.rate=rate;this.params={...defaults};this.state=freshPatch();this.signals=Object.fromEntries(Object.keys(ports).map(k=>[k,0]));this.previous={...this.signals};this.frame=0;this.time=0;this.note=48;this.velocity=1;this.gate=false;this.retrigger=false;this.seed=582134;
  this.oscs=Array.from({length:9},()=>new Oscillator());this.moogFilter=new Ladder();this.diode=new DiodeFilter();this.env=new Envelope();this.benv=new Envelope();this.eenv=new Envelope();this.follow=0;this.bPhase=0;this.bLag=0;this.bLow=0;this.bLow2=0;this.emsStage=-1;this.emsTime=0;this.emsEnv=0;this.emsGate=false;
  this.sequence=new StepSequencer(rate);this.utilities=new Utilities(rate);this.utilityInput=this.input.bind(this);this.step=0;this.lfoPhase=0;this.arp=new ArpCore(rate);
  const original=this.arp.input.bind(this.arp);
  this.arp.input=id=>this.arpExternal[id]?transfer(this.arpExternal[id],this.previous[this.arpExternal[id].source]||0,this.hum):original(id);
  this.arpSignalKeys=Object.keys(ports).filter(k=>k.startsWith('arp.')&&ports[k].direction==='output'&&k!=='arp.out');
  this.grainBuffer=new Float32Array(rate*3);this.write=0;this.grainPhases=[0,.25,.5,.75];this.grainStarts=[0,0,0,0];this.resBuffer=new Float32Array(rate);this.resWrite=0;this.resLow=0;this.delay=new Float32Array(Math.floor(rate*.113));this.delay2=new Float32Array(Math.floor(rate*.173));this.dp=0;this.dp2=0;this.dcIn=0;this.dcOut=0;this.last=new Float32Array(3);
  this.configure(this.state);
 }
 configure(raw){
  this.state=validatePatch(raw);this.target={...this.state.params};this.connections={};const counts={};
  for(const s of Object.values(this.state.routes))counts[s]=(counts[s]||0)+1;
  for(const [id,p]of Object.entries(ports))if(p.direction==='input'){
   const explicit=this.state.routes[id],source=explicit||p.normal;
   if(source&&(!id.startsWith('arp.')||explicit))this.connections[id]=compileCable(source,id,this.state.cables[id],this.state,counts[source]||1,!explicit);
  }
  this.arpExternal=Object.fromEntries(Object.entries(this.connections).filter(([k])=>k.startsWith('arp.')).map(([k,v])=>[k.slice(4),v]));
  this.hasHum=Object.values(this.connections).some(c=>c.floating);
  this.matrix=Array.from({length:16},()=>[]);
  for(const [cell,gain]of Object.entries(this.state.matrix)){const [row,col]=cell.split(':').map(Number);this.matrix[col].push({source:matrixSources[row],gain:gain*(this.state.mode==='historical'?1+Math.sin(row*37+col*13)*.025:1)});}
  this.matrixById=Object.fromEntries(matrixDestinations.map((id,i)=>[id,this.matrix[i]]));
  this.updateActive();
  this.arp.set(Object.fromEntries(Object.entries(this.target).filter(([k])=>k.startsWith('arp.')).map(([k,v])=>[k.slice(4),v])));
  this.sequence.configure(this.state);
 }
 set(values){for(const [k,v]of Object.entries(values))if(k in defaults&&Number.isFinite(v)){this.target[k]=v;this.state.params[k]=v;}this.arp.set(Object.fromEntries(Object.entries(values).filter(([k])=>k.startsWith('arp.')).map(([k,v])=>[k.slice(4),v])));if(Object.keys(values).some(k=>k.endsWith('.level')))this.updateActive();}
 updateActive(){
  const active=new Set(['bridge','tools']);for(const f of ['moog','buchla','arp','ems','euro'])if(this.target[f+'.level']>0||this.params[f+'.level']>.0001)active.add(f);
  for(let pass=0;pass<5;pass++){
   for(const [dest,source]of Object.entries(this.state.routes))if(active.has(ports[dest].family))active.add(ports[source].family);
   if(active.has('ems'))for(const [cell]of Object.entries(this.state.matrix))active.add(ports[matrixSources[+cell.split(':')[0]]].family);
  }this.active=Object.fromEntries([...active].map(k=>[k,true]));
 }
 on(note,velocity=1){this.note=clamp(note,0,127);this.velocity=velocity;this.gate=true;this.retrigger=true;this.arp.noteOn(this.note,velocity);}
 off(){this.gate=false;this.arp.noteOff();}
 random(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x;return (x>>>0)/2147483648-1;}
 input(id,fallback=0){const cable=this.connections[id];if(!cable)return fallback;const explicit=this.state.routes[id];const value=(explicit?this.previous[cable.source]:this.signals[cable.source])??0;return transfer(cable,value,this.hum);}
 emsInput(id,fallback=0){if(this.state.routes[id])return this.input(id);const pins=this.matrixById[id];if(pins?.length){let value=0;for(const pin of pins)value+=(this.signals[pin.source]||0)*pin.gain;return clamp(value,-20,20);}return fallback;}
 frequency(cv,semi=0,scale=1){return clamp(130.81278265*2**clamp(cv/scale+semi/12,-14,8),.02,this.rate*.38);}
 tick(mic=0){
  const p=this.params,s=this.signals,rate=this.rate;
  if((this.frame&15)===0)for(const k in p)p[k]+=(this.target[k]-p[k])*.08;
  if((this.frame&4095)===0)this.updateActive();
  this.time=this.frame/rate;
  this.hum=this.hasHum?.14*(Math.sin(TAU*p.mains*this.time)+.35*Math.sin(TAU*p.mains*2*this.time)+.15*Math.sin(TAU*p.mains*3*this.time))+.035*Math.sin(this.time*.71):0;
  s['bridge.mic']=Math.tanh(mic*p['bridge.micGain']);const rect=Math.abs(s['bridge.mic']);this.follow+=(rect-this.follow)*(1-Math.exp(-1/(rate*(rect>this.follow?.006:p['bridge.followRelease']))));s['bridge.env']=clamp(this.follow*p['bridge.followGain']*10,0,10);
  s['bridge.pitch']=(this.note-48)/12+Math.round(p.octave)+p.bend/12;s['bridge.gate']=this.gate?5:0;s['bridge.velocity']=this.velocity*5;s['bridge.expression']=p.expression*5;
  const reset=this.sequence.tick(p.tempo,p.swing,this.state.routes['tools.seqClock']?this.input('tools.seqClock'):null,this.input('tools.reset'));this.step=this.sequence.step;
  s['bridge.seq']=(this.state.sequence.transpose?s['bridge.pitch']:0)+this.state.steps[this.step]/12;s['bridge.clock']=this.sequence.gate;
  s['tools.rowB']=this.state.sequence.rowB[this.step];s['tools.rowC']=this.state.sequence.rowC[this.step];s['tools.pulse']=this.sequence.pulse;
  this.utilities.tick(p,s,this.utilityInput,reset);
  this.lfoPhase=(this.lfoPhase+p['bridge.lfo']/rate)%1;s['bridge.lfoOut']=Math.sin(TAU*this.lfoPhase)*5;s['bridge.noise']=this.random();
  s['bridge.scaleOut']=this.input('bridge.scaleIn')*p['bridge.scale']+p['bridge.bias'];const tg=this.connections['bridge.triggerIn'];const trigger=tg?(this.previous[tg.source]||0):s['bridge.gate'];const active=!tg?.blocked&&(tg?.sourceTrigger==='s'?trigger<1:trigger>2);s['bridge.strig']=active?0:5;s['bridge.vtrig']=active?5:0;
  for(const f of ['moog','buchla','ems','euro']){s[f+'.pitchOut']=s['bridge.pitch']*(f==='buchla'?1.2:1);s[f+'.gateOut']=f==='moog'?(this.gate?0:5):(this.gate?(f==='buchla'?10:5):0);}
  if(this.active.moog){const mcv=this.input('moog.pitch'),mg=this.input('moog.gate',5)<1;
  s['moog.env']=this.env.tick(mg,p['moog.attack'],p['moog.decay'],p['moog.sustain'],p['moog.release'],rate,this.retrigger)*10;
  const mhz=this.frequency(mcv+p['moog.fm']*this.input('moog.fmIn'),p['moog.tune']);let mf=0;
  for(let sub=0;sub<2;sub++){
   this.oscs[0].tick(mhz,rate*2,p['moog.pw']);this.oscs[1].tick(mhz*2**(p['moog.detune']/1200),rate*2,p['moog.pw']);this.oscs[2].tick(mhz*.5,rate*2);
   s['moog.oscA']=this.oscs[0].saw;s['moog.oscB']=this.oscs[1].pulse;s['moog.sub']=this.oscs[2].sine;
   const blend=this.oscs[0].saw*(1-p['moog.wave'])+this.oscs[0].pulse*p['moog.wave'];
   const signal=this.state.routes['moog.audio']?this.input('moog.audio'):blend*p['moog.mixA']+this.oscs[1].saw*p['moog.mixB']+this.oscs[2].sine*p['moog.mixSub'];
   mf+=this.moogFilter.tick(signal,p['moog.cutoff']*2**clamp(this.input('moog.cutCV')*.1*p['moog.depth']+p.expression*3,-8,8),p['moog.res'],rate*2,p['moog.drive'])*.5;
  }
  s['moog.filter']=mf;s['moog.out']=Math.tanh(this.input('moog.amp')*clamp(p['moog.initial']+this.input('moog.ampCV')*.1,0,1.5)*1.4)*this.velocity;}
  if(this.active.buchla){const bcv=this.input('buchla.pitch'),bhz=this.frequency(bcv,p['buchla.tune'],1.2);this.oscs[3].tick(bhz*p['buchla.ratio'],rate);s['buchla.mod']=this.oscs[3].sine;
  this.oscs[4].tick(clamp(bhz*(1+s['buchla.mod']*p['buchla.fm'])+bhz*this.input('buchla.fmIn')*.2,.01,rate*.35),rate);
  // Smooth bounded wavefolding model. It is not a port of the Buchla circuit.
  const fold=clamp(p['buchla.fold']+this.input('buchla.foldIn'),1,12);s['buchla.complex']=Math.sin((this.oscs[4].sine+p['buchla.symmetry']*.3)*fold*Math.PI*.5);
  this.bPhase=(this.bPhase+1/(rate*(p['buchla.attack']+p['buchla.decay'])))%1;const bg=p['buchla.cycle']>.5?this.bPhase<p['buchla.attack']/(p['buchla.attack']+p['buchla.decay']):this.input('buchla.gate')>2;
  s['buchla.function']=this.benv.tick(bg,p['buchla.attack'],p['buchla.decay'],0,p['buchla.decay'],rate,this.retrigger&&p['buchla.cycle']<.5)*10;
  const btarget=clamp(p['buchla.initial']+this.input('buchla.lpgCV')*.1,0,1);this.bLag+=(btarget-this.bLag)*(1-Math.exp(-1/(rate*(btarget>this.bLag?.003:p['buchla.vactrol']*.22))));const blg=1-Math.exp(-TAU*(70+this.bLag**1.6*(800+p['buchla.color']*13000))/rate);this.bLow+=blg*(this.input('buchla.audio')-this.bLow);this.bLow2+=blg*(this.bLow-this.bLow2);s['buchla.out']=this.bLow2*this.bLag*1.4;}
  if(this.active.arp){this.arp.note=this.note+Math.round(p.octave)*12;this.arp.target.bend=p.bend;const av=this.arp.tick(mic);for(const id of this.arpSignalKeys)s[id]=this.arp.signals[id.slice(4)]||0;s['arp.out']=(av[0]+av[1])*.7071;}
  if(this.active.ems){s['ems.x']=p.joyX*5;s['ems.y']=p.joyY*5;this.oscs[5].tick(this.frequency(this.emsInput('ems.pitch',s['bridge.pitch'])+this.emsInput('ems.fm1')*.12,p['ems.tune']),rate);this.oscs[6].tick(this.frequency(this.emsInput('ems.pitch2',s['bridge.pitch'])+this.emsInput('ems.fm2')*.12,p['ems.tune']+p['ems.detune']),rate);this.oscs[7].tick(p['ems.lfo']*2**clamp(this.emsInput('ems.pitch3')+this.emsInput('ems.fm3')*.1,-6,8),rate);s['ems.osc1']=this.oscs[5].pulse;s['ems.osc2']=this.oscs[6].sine;s['ems.osc3']=this.oscs[7].sine*5;
  const eg=this.emsInput('ems.gate',s['bridge.gate'])>2;if((eg&&!this.emsGate)||(p['ems.cycle']>.5&&this.emsStage<0)){this.emsStage=0;this.emsTime=0;}this.emsGate=eg;
  if(this.emsStage>=0){this.emsTime+=1/rate;const duration=[p['ems.attack'],p['ems.on'],p['ems.decay'],p['ems.off']][this.emsStage];this.emsEnv=this.emsStage===0?Math.min(1,this.emsTime/duration):this.emsStage===1?1:this.emsStage===2?Math.max(0,1-this.emsTime/duration):0;if(this.emsTime>=duration){this.emsTime=0;this.emsStage++;if(this.emsStage===4)this.emsStage=-1;}}
  s['ems.env']=this.emsEnv*10;s['ems.ring']=this.emsInput('ems.ringA',s['ems.osc1'])*this.emsInput('ems.ringB',s['ems.osc2']);
  s['ems.filter']=this.diode.tick(this.emsInput('ems.audio')+Math.tanh(this.emsInput('ems.feedback'))*.2,p['ems.cutoff']*2**clamp(this.emsInput('ems.cutCV')*.45,-8,8),p['ems.res'],rate);
  const amp=this.emsInput('ems.amp')*clamp(this.emsInput('ems.ampCV')*.1,0,1.5);const dv=this.delay[this.dp],dv2=this.delay2[this.dp2];this.delay[this.dp]=this.emsInput('ems.springIn',amp)*.25+dv2*.63;this.delay2[this.dp2]=amp*.21-dv*.61;this.dp=(this.dp+1)%this.delay.length;this.dp2=(this.dp2+1)%this.delay2.length;s['ems.out']=Math.tanh(amp+(dv+dv2)*p['ems.reverb']);}
  if(this.active.euro){const ehz=this.frequency(this.input('euro.pitch'),p['euro.tune']);this.oscs[8].tick(ehz,rate);const ee=this.eenv.tick(this.input('euro.gate')>2,.002,p['euro.decay'],.15,p['euro.decay'],rate,this.retrigger);const timbre=clamp(p['euro.timbre']+this.input('euro.timbreIn')*.1,0,1),t=this.oscs[8].phase;let voice;
  if(Math.round(p['euro.model'])===0)voice=Math.sin(TAU*t+Math.sin(TAU*t*(1+Math.round(p['euro.morph']*7)))*timbre*5);
  else if(Math.round(p['euro.model'])===1)voice=(this.oscs[8].saw*(1-timbre)+Math.sin(TAU*t*2)*timbre)*.7;
  else voice=Math.sin(TAU*t+Math.sin(TAU*t*1.414)*timbre*8)*.7+s['bridge.noise']*p['euro.morph']*.2;
  s['euro.voice']=voice*ee;const delay=clamp(rate/ehz,2,this.resBuffer.length-2);let rp=(this.resWrite-delay+this.resBuffer.length)%this.resBuffer.length;const ri=Math.floor(rp),frac=rp-ri;const rv=this.resBuffer[ri]*(1-frac)+this.resBuffer[(ri+1)%this.resBuffer.length]*frac;this.resLow+=(rv-this.resLow)*(.08+p['euro.damping']*.85);const excitation=this.input('euro.audio');this.resBuffer[this.resWrite]=Math.tanh(excitation*.12+this.resLow*.975);this.resWrite=(this.resWrite+1)%this.resBuffer.length;s['euro.resonated']=excitation*(1-p['euro.resonator'])+rv*p['euro.resonator'];
  if(p['euro.freeze']<.5){this.grainBuffer[this.write]=clamp(this.input('euro.grainIn'),-1,1);this.write=(this.write+1)%this.grainBuffer.length;}
  const size=Math.max(32,p['euro.size']*rate);let grains=0;for(let g=0;g<4;g++){this.grainPhases[g]+=1/size;if(this.grainPhases[g]>=1){this.grainPhases[g]-=1;this.grainStarts[g]=this.write-size*(1.2+g*.13);}let read=(this.grainStarts[g]+this.grainPhases[g]*size*p['euro.rate']+this.grainBuffer.length*4)%this.grainBuffer.length;const j=Math.floor(read),frac=read-j;grains+=(this.grainBuffer[j]*(1-frac)+this.grainBuffer[(j+1)%this.grainBuffer.length]*frac)*(.5-.5*Math.cos(TAU*this.grainPhases[g]))*.5;}
  s['euro.grains']=grains;s['euro.out']=s['euro.resonated']*(1-p['euro.grain'])+grains*p['euro.grain'];}
  let left=0,right=0;for(const f of ['moog','buchla','arp','ems','euro']){const signal=s[f+'.out']*p[f+'.level'],pan=clamp(p[f+'.pan']+(f==='ems'?this.emsInput('ems.panCV')*.1:0),-1,1);left+=signal*Math.sqrt((1-pan)*.5);right+=signal*Math.sqrt((1+pan)*.5);}s['bridge.mix']=(left+right)*.7071;
  this.last[0]=clamp(Math.tanh(left),-1,1);this.last[1]=clamp(Math.tanh(right),-1,1);this.last[2]=s['bridge.mic'];
  this.signals=this.previous;this.previous=s;this.retrigger=false;this.frame++;return this.last;
 }
}
if(typeof AudioWorkletProcessor!=='undefined'){
 class Processor extends AudioWorkletProcessor{
  constructor(){super();this.core=new ModularCore(sampleRate);this.peak=0;this.port.onmessage=({data:m})=>{if(m.type==='configure')this.core.configure(m.state);if(m.type==='sequence')this.core.sequence.command(m.action);if(m.type==='params')this.core.set(m.values);if(m.type==='on')this.core.on(m.note,m.velocity);if(m.type==='off')this.core.off();if(m.type==='panic'){const state=this.core.state;this.core=new ModularCore(sampleRate);state.sequencer=false;this.core.configure(state);}};}
  process(inputs,outputs){const a=outputs[0],mic=inputs[0]?.[0];for(let i=0;i<a[0].length;i++){const v=this.core.tick(mic?.[i]||0);a[0][i]=v[0];a[1][i]=v[1];outputs[1][0][i]=v[2];this.peak=Math.max(this.peak,Math.abs(v[0]),Math.abs(v[1]));}if(this.core.frame%2048===0){this.port.postMessage({peak:this.peak,mic:this.core.follow,step:this.core.step,signals:Object.fromEntries(['moog.env','buchla.function','ems.env','bridge.env'].map(k=>[k,this.core.signals[k]]))});this.peak=0;}return true;}
 }
 registerProcessor('tonto-console',Processor);
}
