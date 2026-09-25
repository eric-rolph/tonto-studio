import {ModularCore} from './dsp.js';
import {validatePatch,controls,ports} from './model.js';
import {features,featureLoss} from './reference-audio.js';

export function renderPatch(raw,{rate=48000,note=48,velocity=1,gate=.5,duration=2,tap='mix',mic=null}={}){
 if(!Number.isFinite(rate)||rate<8000||rate>192000||!Number.isFinite(duration)||duration<=0||duration>12||!Number.isFinite(gate)||gate<0||gate>12||!Number.isFinite(note)||note<0||note>127)throw new Error('Use a valid note, sample rate and duration up to 12 seconds.');
 if(tap!=='mix'&&ports[tap]?.direction!=='output')throw new Error('Choose an output jack.');
 const patch=validatePatch(raw),core=new ModularCore(rate);core.configure(patch);
 // Offline captures begin with settled controls, not a glide from factory defaults.
 Object.assign(core.params,core.target);Object.assign(core.arp.params,core.arp.target);
 const family=tap.split('.')[0];if(tap!=='mix'&&family!=='bridge'){
  core.target[family+'.level']=Math.max(.001,core.target[family+'.level']);core.updateActive();
 }
 const out=new Float32Array(Math.round(duration*rate));core.on(note,velocity);
 for(let i=0;i<out.length;i++){if(i===Math.round(gate*rate))core.off();const v=core.tick(mic?.[i]||0);out[i]=tap==='mix'?(v[0]+v[1])*.5:core.previous[tap]||0;}
 return out;
}

export function fitPatch(reference,raw,options,keys,progress=()=>{},passes=3){
 const patch=validatePatch(raw),target=features(reference,options.rate),chosen=keys.filter(k=>controls[k]&&controls[k].unit!=='switch'&&controls[k].unit!=='model');
 if(target.rms<1e-7)throw new Error('The reference region must contain audible signal.');
 if(!chosen.length)throw new Error('Select at least one continuous control to fit.');
 const score=()=>featureLoss(target,features(renderPatch(patch,options),options.rate));
 let best=score(),evaluations=1;if(!Number.isFinite(best.total))throw new Error('The starting patch is silent. Set a cabinet level and check its connections.');const before={...best},history=[];
 for(let pass=0;pass<passes;pass++)for(const key of chosen){
  const cfg=controls[key],lo=cfg.log?Math.log(cfg.min):cfg.min,hi=cfg.log?Math.log(cfg.max):cfg.max,original=patch.params[key],center=cfg.log?Math.log(original):original,step=(hi-lo)*.16/2**pass;
  let winner=original;
  for(const sign of [-1,1]){const v=Math.max(lo,Math.min(hi,center+sign*step));patch.params[key]=cfg.log?Math.exp(v):v;const trial=score();evaluations++;if(trial.total<best.total){best=trial;winner=patch.params[key];}}
  patch.params[key]=winner;history.push({pass,key,value:winner,...best});progress({pass:pass+1,key,evaluations,loss:best.total});
 }
 return {patch,before,after:best,evaluations,history,audio:renderPatch(patch,options)};
}
