import {FrequencyShifter,Phaser} from './creative-processors.js';
// Original implementation of the RBJ/W3C biquad equations. See docs/audit.md.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const bandFrequencies=[125,175,250,350,500,700,1000,1400,2000,2800,4000,5600];
export class Biquad {
 constructor(rate,type,frequency,q=.7071){this.rate=rate;this.z1=0;this.z2=0;this.set(type,frequency,q);}
 set(type,frequency,q){
  const w=2*Math.PI*clamp(frequency,10,this.rate*.44)/this.rate,c=Math.cos(w),a=Math.sin(w)/(2*q),a0=1+a;
  let b0,b1,b2;if(type==='low'){b0=(1-c)/2;b1=1-c;b2=b0;}else if(type==='high'){b0=(1+c)/2;b1=-1-c;b2=b0;}else{b0=a;b1=0;b2=-a;}
  this.b0=b0/a0;this.b1=b1/a0;this.b2=b2/a0;this.a1=-2*c/a0;this.a2=(1-a)/a0;
 }
 tick(x){const y=this.b0*x+this.z1;this.z1=this.b1*x-this.a1*y+this.z2;this.z2=this.b2*x-this.a2*y;return y;}
}
export class SpectralProcessor {
 constructor(rate){
  this.shifter=new FrequencyShifter(rate);this.phaser=new Phaser(rate);this.rate=rate;this.frame=0;this.bandGain=new Float64Array(12);this.envelopes=new Float64Array(12);this.bank=bandFrequencies.map(f=>new Biquad(rate,'band',f,3));this.analysis=bandFrequencies.map(f=>new Biquad(rate,'band',f,3));this.carrier=bandFrequencies.map(f=>new Biquad(rate,'band',f,3));this.lowShelf=new Biquad(rate,'low',88);this.highShelf=new Biquad(rate,'high',8000);
  this.low=new Biquad(rate,'low',1000);this.band=new Biquad(rate,'band',1000);this.high=new Biquad(rate,'high',1000);this.shift=null;this.frequency=null;this.q=null;this.release=null;
 }
 tick(p,s,input){
  // Coefficient changes at 1/16 of the sample rate keep expensive trigonometry off the hot path.
  if((this.frame++&15)===0){
   const frequency=clamp(p['fx.cutoff']*2**clamp(input('fx.cutCV'),-8,8),20,this.rate*.44),q=p['fx.q'],shift=clamp(p['fx.formant']+input('fx.formantCV')*12,-24,24);
   if(frequency!==this.frequency||q!==this.q){this.low.set('low',frequency,q);this.band.set('band',frequency,q);this.high.set('high',frequency,q);this.frequency=frequency;this.q=q;}
   if(shift!==this.shift){for(let i=0;i<12;i++)this.carrier[i].set('band',bandFrequencies[i]*2**(shift/12),3);this.shift=shift;}
   for(let i=0;i<12;i++)this.bandGain[i]=p['fx.band'+i];
   this.attack=1-Math.exp(-1/(this.rate*.005));this.release=1-Math.exp(-1/(this.rate*p['fx.release']));
  }
  const audio=clamp(input('fx.audio'),-20,20),modulator=clamp(input('fx.modulator'),-20,20),carrier=clamp(input('fx.carrier'),-20,20);
  let bank=this.lowShelf.tick(audio)*p['fx.lowBand']+this.highShelf.tick(audio)*p['fx.highBand'],vocoded=0;
  for(let i=0;i<12;i++){
   bank+=this.bank[i].tick(audio)*this.bandGain[i];
   const magnitude=Math.abs(this.analysis[i].tick(modulator));this.envelopes[i]+=(magnitude-this.envelopes[i])*(magnitude>this.envelopes[i]?this.attack:this.release);
   vocoded+=this.carrier[i].tick(carrier)*clamp(this.envelopes[i]*p['fx.sensitivity'],0,2)*this.bandGain[i];
  }
  s['fx.bank']=clamp(bank,-20,20);s['fx.low']=clamp(this.low.tick(audio),-20,20);s['fx.band']=clamp(this.band.tick(audio),-20,20);s['fx.high']=clamp(this.high.tick(audio),-20,20);s['fx.vocoder']=clamp(vocoded*2,-20,20);
  s['fx.shifted']=this.shifter.tick(input('fx.shiftIn'),p['fx.shiftHz']+input('fx.shiftCV')*100,p['fx.shiftMix']);s['fx.phased']=this.phaser.tick(input('fx.phaseIn'),p['fx.phaseRate'],p['fx.phaseDepth'],p['fx.phaseFeedback'],p['fx.phaseMix']);
  s['fx.out']=s[['fx.bank','fx.low','fx.band','fx.high','fx.vocoder','fx.shifted','fx.phased'][Math.round(p['fx.monitor'])]];
 }
}
