import {ports} from './model.js';
export function cableIssues(source,destination,settings={},state={}){
 const s=ports[source],d=ports[destination];if(!s||!d)return ['Unknown port'];
 if(state.mode!=='historical')return [];
 const issues=[];
 if(s.connector!==d.connector&&!settings.adapter)issues.push('Fit a connector adapter');
 if(s.kind==='pitch'&&d.kind==='pitch'&&s.voltsPerOct!==d.voltsPerOct&&!settings.scale)issues.push(`${s.voltsPerOct} → ${d.voltsPerOct} V/oct needs a scaler`);
 if(s.kind==='gate'&&d.kind==='gate'&&s.trigger!==d.trigger&&!settings.trigger&&destination!=='bridge.triggerIn')issues.push('Fit an S-Trig / V-Trig converter');
 if((s.connector==='banana'||d.connector==='banana')&&s.family!==d.family&&(!state.grounds?.[s.family]||!state.grounds?.[d.family]))issues.push('Bond both chassis to remove floating-ground hum');
 return issues;
}
export function compileCable(source,destination,settings={},state={},loads=1,internal=false){
 const s=ports[source],d=ports[destination],automatic=state.mode!=='historical'||internal;
 const blocked=!automatic&&s.connector!==d.connector&&!settings.adapter;
 const triggerMismatch=s.kind==='gate'&&d.kind==='gate'&&s.trigger!==d.trigger;
 const convertTrigger=triggerMismatch&&(automatic||settings.trigger);
 const failedTrigger=triggerMismatch&&!convertTrigger;
 const scale=s.kind==='pitch'&&d.kind==='pitch'&&(automatic||settings.scale)?d.voltsPerOct/s.voltsPerOct:1;
 const floating=!automatic&&(s.connector==='banana'||d.connector==='banana')&&s.family!==d.family&&(!state.grounds?.[s.family]||!state.grounds?.[d.family]);
 const loading=automatic?1:(d.impedance/Math.max(1,loads))/(d.impedance/Math.max(1,loads)+s.impedance);
 return {source,destination,blocked,failedTrigger,convertTrigger,sourceTrigger:s.trigger,destTrigger:d.trigger,amplitude:d.amplitude,scale,loading,floating,gain:settings.gain??1,kind:d.kind};
}
export function transfer(c,value,hum=0){
 if(c.blocked||c.failedTrigger)return c.kind==='gate'&&c.destTrigger==='s'?5:0;
 if(c.convertTrigger){const active=c.sourceTrigger==='s'?value<1:value>2;value=c.destTrigger==='s'?(active?0:5):(active?c.amplitude:0);}
 return Math.max(-20,Math.min(20,value*c.scale*c.loading*c.gain+(c.floating?hum:0)));
}
