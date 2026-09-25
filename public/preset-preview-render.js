import {ModularCore} from './dsp.js';
import {PerformanceClock} from './performance-model.js';
export function renderPreview(entry,rate=48000){
 const core=new ModularCore(rate);core.configure(entry.patch);Object.assign(core.params,core.target);Object.assign(core.arp.params,core.arp.target);
 const seconds=entry.mode==='Performance'?Math.min(6,entry.patch.performance.bars*4*60/entry.patch.params.tempo):3,frames=Math.round(rate*seconds),left=new Float32Array(frames),right=new Float32Array(frames);
 const performance=entry.mode==='Performance'?new PerformanceClock(rate,n=>n?core.on(n.note,n.velocity,n.retrigger,n.lower,n.upper):core.off(),(k,v)=>core.set({[k]:v})):null;
 if(performance)performance.start(entry.patch.performance,{tempo:entry.patch.params.tempo});else core.on(entry.note||60,.8,true,entry.note||60,(entry.note||60)+7);
 const release=Math.round(rate*(entry.gate??(entry.category==='Percussion'?.15:1.6)));let peak=0,energy=0;
 for(let i=0;i<frames;i++){if(performance)performance.tick(i);else if(i===release)core.off();const t=i/rate,mic=entry.mode==='Microphone'?.14*(Math.sin(t*2*Math.PI*170)+.35*Math.sin(t*2*Math.PI*510))*(.55+.45*Math.sin(t*2*Math.PI*2)):0;const out=core.tick(mic),fade=Math.min(1,i/(rate*.008),(frames-i)/(rate*.035));left[i]=out[0]*fade;right[i]=out[1]*fade;peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));energy+=left[i]**2+right[i]**2;}
 return {left,right,rate,peak,rms:Math.sqrt(energy/(frames*2))};
}
