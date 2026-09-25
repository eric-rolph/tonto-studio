import {freshPatch,validatePatch,controls} from './model.js';
export class Engine extends EventTarget{
 constructor(){super();this.state=freshPatch();this.notes=new Map();this.released=new Set();this.sustain=false;this.micStream=null;}
 get params(){return this.state.params;}get routes(){return this.state.routes;}
 async start(){if(this.starting)return this.starting;this.starting=this.initialize();try{await this.starting;}finally{this.starting=null;}}
 async initialize(){
  if(this.ctx){await this.ctx.resume();return;}if(!window.AudioContext)throw new Error('Use a browser with Web Audio, such as Chrome or Edge.');
  const ctx=this.ctx=new AudioContext({latencyHint:'interactive'});
  try{await ctx.audioWorklet.addModule('/dsp.js');}catch(e){await ctx.close();this.ctx=null;throw e;}
  this.synth=new AudioWorkletNode(ctx,'tonto-console',{numberOfInputs:1,numberOfOutputs:2,outputChannelCount:[2,1]});
  this.bus=ctx.createGain();this.master=ctx.createGain();this.master.gain.value=this.params.master;
  this.limiter=ctx.createDynamicsCompressor();this.limiter.threshold.value=-3;this.limiter.knee.value=0;this.limiter.ratio.value=20;this.limiter.attack.value=.002;this.limiter.release.value=.12;
  this.analyser=ctx.createAnalyser();this.analyser.fftSize=2048;this.micAnalyser=ctx.createAnalyser();this.micAnalyser.fftSize=1024;
  this.synth.connect(this.bus,0);this.synth.connect(this.micAnalyser,1);this.bus.connect(this.master).connect(this.limiter).connect(this.analyser).connect(ctx.destination);
  this.synth.port.onmessage=({data})=>this.dispatchEvent(new CustomEvent('meter',{detail:data}));
  this.synth.onprocessorerror=()=>this.dispatchEvent(new CustomEvent('error',{detail:'The audio processor stopped. Export your recordings, then reload to restart it.'}));
  this.configure();await ctx.resume();this.dispatchEvent(new Event('ready'));
 }
 send(type,data={}){this.synth?.port.postMessage({type,...data});}
 configure(){this.send('configure',{state:this.state});}
 load(patch){this.panic();this.state=validatePatch(patch);this.configure();this.master?.gain.setTargetAtTime(this.params.master,this.ctx.currentTime,.02);}
 set(key,value){const c=controls[key];if(!c||!Number.isFinite(value))return;value=Math.max(c.min,Math.min(c.max,value));this.params[key]=value;if(key==='master')this.master?.gain.setTargetAtTime(value,this.ctx.currentTime,.015);this.send('params',{values:{[key]:value}});}
 patch(dest,source){if(source){this.routes[dest]=source;this.state.cables[dest]={adapter:false,scale:false,trigger:false,gain:1};}else {delete this.routes[dest];delete this.state.cables[dest];}this.configure();}
 trigger(){const last=[...this.notes.values()].at(-1);if(last)this.send('on',last);else this.send('off');}
 on(note,velocity=1,id=note){this.notes.delete(id);this.notes.set(id,{note,velocity});this.released.delete(id);this.trigger();this.dispatchEvent(new Event('notes'));}
 off(id){if(this.sustain){this.released.add(id);return;}this.notes.delete(id);this.trigger();this.dispatchEvent(new Event('notes'));}
 sustainPedal(on){this.sustain=on;if(!on){for(const id of this.released)this.off(id);this.released.clear();}}
 panic(){this.notes.clear();this.released.clear();this.sustain=false;this.state.sequencer=false;this.send('panic');this.dispatchEvent(new Event('notes'));}
 async microphone(deviceId){await this.start();this.stopMicrophone();if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access needs HTTPS and browser permission.');this.micStream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:deviceId?{exact:deviceId}:undefined,echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1},video:false});this.micSource=this.ctx.createMediaStreamSource(this.micStream);this.micSource.connect(this.synth);this.micStream.getAudioTracks()[0].onended=()=>{this.stopMicrophone();this.dispatchEvent(new Event('micended'));};}
 stopMicrophone(){this.micSource?.disconnect();this.micStream?.getTracks().forEach(t=>t.stop());this.micStream=null;this.micSource=null;}
 async midi(){await this.start();if(!navigator.requestMIDIAccess)throw new Error('Web MIDI is unavailable. Use Chrome or Edge, or the on-screen keyboard.');this.midiAccess=await navigator.requestMIDIAccess({sysex:false});this.bindMidi();this.midiAccess.onstatechange=()=>{this.panic();this.bindMidi();};return this.midiAccess.inputs.size;}
 bindMidi(){for(const input of this.midiAccess.inputs.values())input.onmidimessage=({data})=>{const [status,n,v]=data,type=status&240,id=`midi-${input.id}-${status&15}-${n}`;if(type===144&&v>0)this.on(n,v/127,id);if(type===128||(type===144&&!v))this.off(id);if(type===224)this.set('bend',(((v<<7)|n)-8192)/8192*2);if(type===176){if(n===64)this.sustainPedal(v>=64);if(n===120||n===123)this.panic();if(n===1||n===11)this.set('expression',v/127);if(n===7)this.set('master',v/127);this.dispatchEvent(new Event('control'));}};this.dispatchEvent(new CustomEvent('midistate',{detail:[...this.midiAccess.inputs.values()].map(i=>i.name)}));}
}
